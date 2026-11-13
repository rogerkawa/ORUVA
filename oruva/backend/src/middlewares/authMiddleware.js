
import crypto from 'node:crypto';

import sessaoModel from '../models/sessaoModel.js';

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.cookies?.oruva_session;

        // Verifica se existe um cookie de autenticação
        if (!token) {
            return res.status(401).json({
                message: 'Sessão não encontrada. Faça login novamente.'
            });
        }

        // Gera o hash SHA-256 do token recebido
        const tokenHash = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        // Busca a sessão no banco
        const sessao = await sessaoModel.buscarPorTokenHash(tokenHash);

        if (!sessao) {
            res.clearCookie('oruva_session', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
                path: '/'
            });

            return res.status(401).json({
                message: 'Sessão inválida. Faça login novamente.'
            });
        }

        // Verifica se a sessão foi revogada
        if (sessao.revoked_at) {
            return res.status(401).json({
                message: 'Esta sessão foi encerrada.'
            });
        }

        // Verifica se a sessão expirou
        if (new Date(sessao.expires_at).getTime() <= Date.now()) {
            return res.status(401).json({
                message: 'Sua sessão expirou. Faça login novamente.'
            });
        }

        // Verifica se a conta continua ativa
        if (sessao.user_status !== 'active') {
            return res.status(403).json({
                message: 'Sua conta não está ativa.'
            });
        }

        // Garante que contas com MFA passaram pela verificação
        if (sessao.mfa_enabled && !sessao.mfa_verified) {
            return res.status(403).json({
                code: 'MFA_REQUIRED',
                message: 'A autenticação de dois fatores é necessária.'
            });
        }

        // Verifica se o vínculo empresarial continua ativo
        if (
            sessao.company_member_id &&
            sessao.membership_status !== 'active'
        ) {
            return res.status(403).json({
                message: 'Seu vínculo com esta empresa não está ativo.'
            });
        }

        // Disponibiliza os dados do usuário autenticado
        req.usuario = {
            id: sessao.user_id,
            name: sessao.name,
            email: sessao.email,
            avatar_url: sessao.avatar_url,
            system_role: sessao.system_role,
            mfa_enabled: Boolean(sessao.mfa_enabled)
        };

        // Disponibiliza os dados da sessão
        req.sessao = {
            id: sessao.session_id,
            user_id: sessao.user_id,
            company_member_id: sessao.company_member_id,
            mfa_verified: Boolean(sessao.mfa_verified),
            expires_at: sessao.expires_at
        };

        // Disponibiliza o contexto empresarial, quando selecionado
        req.empresa = sessao.company_member_id
            ? {
                company_member_id: sessao.company_member_id,
                company_id: sessao.company_id,
                role: sessao.company_role
            }
            : null;

        return next();

    } catch (error) {
        console.error('Erro no middleware de autenticação:', error);

        return res.status(500).json({
            message: 'Erro ao verificar a autenticação.'
        });
    }
};

export default authMiddleware;
