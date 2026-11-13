
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';

import usuarioModel from '../models/usuarioModel.js';
import sessaoModel from '../models/sessaoModel.js';

const TEMPO_SESSAO = 7 * 24 * 60 * 60 * 1000;

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
    maxAge: TEMPO_SESSAO
};

const authController = {

    // LOGIN
    async login(req, res) {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({
                    message: 'Informe seu e-mail e sua senha.'
                });
            }

            const usuario = await usuarioModel.buscarPorEmail(
                email.trim().toLowerCase()
            );

            if (!usuario) {
                return res.status(401).json({
                    message: 'E-mail ou senha incorretos.'
                });
            }

            const senhaValida = await bcrypt.compare(
                password,
                usuario.password
            );

            if (!senhaValida) {
                return res.status(401).json({
                    message: 'E-mail ou senha incorretos.'
                });
            }

            if (usuario.status !== 'active') {
                return res.status(403).json({
                    message: 'Sua conta não está ativa.'
                });
            }

            if (usuario.mfa_enabled) {
                return res.status(403).json({
                    code: 'MFA_REQUIRED',
                    message: 'Sua conta exige autenticação de dois fatores.'
                });
            }

            const empresas = await usuarioModel.listarVinculosAtivos(
                usuario.id
            );

            const isSuperAdmin = usuario.system_role === 'superadmin';

            if (!isSuperAdmin && empresas.length === 0) {
                return res.status(403).json({
                    message: 'Você não possui vínculo ativo com nenhuma empresa.'
                });
            }

            const companyMemberId = empresas.length === 1
                ? empresas[0].company_member_id
                : null;

            const token = crypto.randomBytes(32).toString('hex');

            const tokenHash = crypto
                .createHash('sha256')
                .update(token)
                .digest('hex');

            const expiresAt = new Date(Date.now() + TEMPO_SESSAO);

            await sessaoModel.criar({
                userId: usuario.id,
                companyMemberId,
                tokenHash,
                ipAddress: req.ip,
                userAgent: req.get('user-agent') || null,
                expiresAt
            });

            await usuarioModel.atualizarUltimoLogin(usuario.id);

            res.cookie('oruva_session', token, cookieOptions);

            return res.status(200).json({
                message: 'Login realizado com sucesso.',
                usuario: {
                    id: usuario.id,
                    name: usuario.name,
                    email: usuario.email,
                    avatar_url: usuario.avatar_url,
                    system_role: usuario.system_role
                },
                empresas: empresas.map(empresa => ({
                    company_member_id: empresa.company_member_id,
                    company_id: empresa.company_id,
                    name: empresa.company_name,
                    slug: empresa.company_slug,
                    role: empresa.role
                })),
                empresaSelecionada: companyMemberId
            });

        } catch (error) {
            console.error('Erro no login:', error);

            return res.status(500).json({
                message: 'Erro interno ao realizar login.'
            });
        }
    },

    // RECUPERAR USUÁRIO AUTENTICADO
    async me(req, res) {
        try {
            const empresas = await usuarioModel.listarVinculosAtivos(
                req.usuario.id
            );

            return res.status(200).json({
                usuario: req.usuario,

                empresas: empresas.map(empresa => ({
                    company_member_id: empresa.company_member_id,
                    company_id: empresa.company_id,
                    name: empresa.company_name,
                    slug: empresa.company_slug,
                    role: empresa.role
                })),

                empresaSelecionada: req.sessao.company_member_id
            });

        } catch (error) {
            console.error('Erro ao recuperar sessão:', error);

            return res.status(500).json({
                message: 'Erro ao recuperar os dados da sessão.'
            });
        }
    },

    // LOGOUT
    async logout(req, res) {
        try {
            await sessaoModel.revogarPorId(
                req.sessao.id,
                req.usuario.id
            );

            res.clearCookie('oruva_session', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
                path: '/'
            });

            return res.status(200).json({
                message: 'Logout realizado com sucesso.'
            });

        } catch (error) {
            console.error('Erro ao encerrar sessão:', error);

            return res.status(500).json({
                message: 'Erro ao encerrar a sessão.'
            });
        }
    }

};

export default authController;
