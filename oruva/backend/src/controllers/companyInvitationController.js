
import crypto from 'node:crypto';
import bcrypt from 'bcrypt';

import companyRequestModel from '../models/companyRequestModel.js';
import companyInvitationModel from '../models/companyInvitationModel.js';
import emailTemplate from '../utils/emailTemplate.js';
import emailService from '../utils/emailService.js';

function gerarHashToken(token) {
    return crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');
}

function escaparHTML(valor = '') {
    return String(valor).replace(/[&<>"']/g, caractere => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[caractere]);
}

const companyInvitationController = {


    // Consultar informações públicas de um convite
    async consultarConvite(req, res) {
        try {
            const { token } = req.params;

            if (!token || !/^[a-f0-9]{64}$/i.test(token)) {
                return res.status(400).json({
                    code: 'TOKEN_INVALIDO',
                    message: 'O link do convite é inválido.'
                });
            }

            const tokenHash = gerarHashToken(token);

            const convite = await companyInvitationModel.buscarPorTokenHash(
                tokenHash
            );

            if (!convite) {
                return res.status(404).json({
                    code: 'CONVITE_NAO_ENCONTRADO',
                    message: 'Convite não encontrado.'
                });
            }

            if (convite.accepted_at) {
                return res.status(409).json({
                    code: 'CONVITE_JA_ACEITO',
                    message: 'Este convite já foi utilizado.'
                });
            }

            if (convite.revoked_at) {
                return res.status(410).json({
                    code: 'CONVITE_REVOGADO',
                    message: 'Este convite foi revogado.'
                });
            }

            if (new Date(convite.expires_at).getTime() <= Date.now()) {
                return res.status(410).json({
                    code: 'CONVITE_EXPIRADO',
                    message: 'Este convite expirou.'
                });
            }

            if (convite.company_status !== 'active') {
                return res.status(403).json({
                    code: 'EMPRESA_INATIVA',
                    message: 'Esta empresa não está disponível.'
                });
            }

            return res.status(200).json({
                convite: {
                    companyName: convite.company_name,
                    email: convite.email,
                    role: convite.role,
                    expiresAt: convite.expires_at
                }
            });

        } catch (error) {
            console.error('Erro ao consultar convite:', error);

            return res.status(500).json({
                message: 'Não foi possível consultar o convite.'
            });
        }
    },

    // Aceitar convite e criar uma nova conta
    async aceitarConvite(req, res) {
        try {
            const { token, name, email, password } = req.body;

            if (!token || !/^[a-f0-9]{64}$/i.test(token)) {
                return res.status(400).json({
                    code: 'TOKEN_INVALIDO',
                    message: 'O link do convite é inválido.'
                });
            }

            const nome = typeof name === 'string' ? name.trim() : '';
            const emailNormalizado = typeof email === 'string'
                ? email.trim().toLowerCase()
                : '';

            if (!nome || nome.length > 150) {
                return res.status(400).json({
                    code: 'NOME_INVALIDO',
                    message: 'Informe um nome válido.'
                });
            }

            const emailValido =
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalizado);

            if (!emailValido || emailNormalizado.length > 180) {
                return res.status(400).json({
                    code: 'EMAIL_INVALIDO',
                    message: 'Informe um endereço de e-mail válido.'
                });
            }

            if (
                typeof password !== 'string' ||
                password.length < 8 ||
                Buffer.byteLength(password, 'utf8') > 72
            ) {
                return res.status(400).json({
                    code: 'SENHA_INVALIDA',
                    message: 'A senha deve possuir pelo menos 8 caracteres e respeitar o limite permitido.'
                });
            }

            const passwordHash = await bcrypt.hash(password, 12);
            const tokenHash = gerarHashToken(token);

            const resultado = await companyInvitationModel.aceitar({
                tokenHash,
                name: nome,
                email: emailNormalizado,
                passwordHash
            });

            return res.status(201).json({
                message: 'Conta criada e convite aceito com sucesso!',
                usuario: {
                    id: resultado.userId
                },
                empresa: {
                    id: resultado.companyId,
                    companyMemberId: resultado.companyMemberId,
                    role: resultado.role
                }
            });

        } catch (error) {
            console.error('Erro ao aceitar convite:', error);

            const erros = {
                CONVITE_NAO_ENCONTRADO: [404, 'Convite não encontrado.'],
                CONVITE_JA_ACEITO: [409, 'Este convite já foi utilizado.'],
                CONVITE_REVOGADO: [410, 'Este convite foi revogado.'],
                CONVITE_EXPIRADO: [410, 'Este convite expirou.'],
                EMPRESA_INATIVA: [403, 'Esta empresa não está disponível.'],
                EMAIL_DIVERGENTE: [403, 'O e-mail informado não corresponde ao convite.'],
                USUARIO_JA_EXISTE: [409, 'Já existe uma conta com este e-mail. Entre na sua conta para aceitar o convite.'],
                USUARIO_JA_VINCULADO: [409, 'Este usuário já possui vínculo com a empresa.'],
                DADOS_USUARIO_INVALIDOS: [400, 'Os dados informados são inválidos.']
            };

            const erro = erros[error.message];

            if (erro) {
                return res.status(erro[0]).json({
                    code: error.message,
                    message: erro[1]
                });
            }

            return res.status(500).json({
                message: 'Não foi possível aceitar o convite.'
            });
        }
    },

    // Aceitar convite utilizando uma conta existente
    async aceitarConviteExistente(req, res) {
        try {
            const { token } = req.body;

            if (!token || !/^[a-f0-9]{64}$/i.test(token)) {
                return res.status(400).json({
                    code: 'TOKEN_INVALIDO',
                    message: 'O link do convite é inválido.'
                });
            }

            const tokenHash = gerarHashToken(token);

            const resultado = await companyInvitationModel.aceitar({
                tokenHash,
                userId: req.usuario.id
            });

            return res.status(200).json({
                message: 'Convite aceito com sucesso!',
                empresa: {
                    id: resultado.companyId,
                    companyMemberId: resultado.companyMemberId,
                    role: resultado.role
                }
            });

        } catch (error) {
            console.error('Erro ao aceitar convite existente:', error);

            const erros = {
                CONVITE_NAO_ENCONTRADO: [404, 'Convite não encontrado.'],
                CONVITE_JA_ACEITO: [409, 'Este convite já foi utilizado.'],
                CONVITE_REVOGADO: [410, 'Este convite foi revogado.'],
                CONVITE_EXPIRADO: [410, 'Este convite expirou.'],
                EMPRESA_INATIVA: [403, 'Esta empresa não está disponível.'],
                EMAIL_DIVERGENTE: [403, 'Sua conta não corresponde ao e-mail do convite.'],
                USUARIO_INVALIDO: [403, 'Sua conta não está disponível.'],
                USUARIO_JA_VINCULADO: [409, 'Você já possui vínculo com esta empresa.']
            };

            const erro = erros[error.message];

            if (erro) {
                return res.status(erro[0]).json({
                    code: error.message,
                    message: erro[1]
                });
            }

            return res.status(500).json({
                message: 'Não foi possível aceitar o convite.'
            });
        }
    },


    // POST /api/company-requests/:id/invite
    
async enviarConvite(req, res) {
    try {
        const requestId = Number(req.params.id);

        if (!Number.isSafeInteger(requestId) || requestId <= 0) {
            return res.status(400).json({
                message: 'ID da solicitação inválido.'
            });
        }

        const solicitacao =
            await companyRequestModel.buscarPorId(requestId);
            console.log('SOLICITAÇÃO RETORNADA PELO BANCO:', solicitacao);
console.log('E-MAIL DA SOLICITAÇÃO:', solicitacao?.email);

        if (!solicitacao) {
            return res.status(404).json({
                message: 'Solicitação não encontrada.'
            });
        }

        if (
            solicitacao.status !== 'approved' ||
            !solicitacao.company_id
        ) {
            return res.status(400).json({
                message: 'A empresa precisa estar aprovada antes do envio do convite.'
            });
        }

        const emailDestinatario = solicitacao.email?.trim().toLowerCase();

        if (!emailDestinatario) {
            throw new Error('EMAIL_DO_DESTINATARIO_NAO_ENCONTRADO');
        }

        const frontendUrl = process.env.FRONTEND_URL
            ?.split(',')[0]
            .trim()
            .replace(/\/+$/, '');

        if (!frontendUrl) {
            throw new Error('FRONTEND_URL_NAO_CONFIGURADA');
        }

        // Gerar token seguro
        const token = crypto.randomBytes(32).toString('hex');

        const tokenHash = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        const expiresAt = new Date(
            Date.now() + 48 * 60 * 60 * 1000
        );

        const invitationUrl =
            `${frontendUrl}/convite/aceitar?token=${token}`;

        // Criar convite no banco
        await companyInvitationModel.criar({
            companyId: solicitacao.company_id,
            invitedByUserId: req.usuario.id,
            email: emailDestinatario,
            role: 'admin',
            tokenHash,
            expiresAt
        });

        // Preparar conteúdo do e-mail
        const nomeResponsavel = escaparHTML(
            solicitacao.contact_name
        );

        const nomeEmpresa = escaparHTML(
            solicitacao.trade_name || solicitacao.company_name
        );

        const html = emailTemplate.layout({
            title: 'Seu acesso ao Oruva está pronto!',
            preheader: 'Sua empresa foi aprovada. Crie sua conta para começar.',

            content: `
                <p>Olá, <strong>${nomeResponsavel}</strong>!</p>

                <p>
                    Temos uma ótima notícia: a solicitação de acesso da sua
                    empresa foi aprovada!
                </p>

                <p>
                    Sua empresa <strong>${nomeEmpresa}</strong> já está
                    pronta para começar a utilizar o Oruva.
                </p>

                <p>
                    Para concluir o cadastro, clique no botão abaixo
                    e defina sua senha de acesso.
                </p>

                <p>
                    <strong>Importante:</strong> este convite é válido
                    por 48 horas e só pode ser utilizado uma vez.
                </p>
            `,

            actionUrl: invitationUrl,
            actionText: 'Criar minha conta'
        });

        console.log('DESTINATÁRIO ENVIADO PARA GMAIL:', emailDestinatario);

        // Enviar e-mail
        await emailService.enviar({
            to: emailDestinatario,
            subject: 'Sua empresa foi aprovada! | Oruva',
            html
        });

        return res.status(200).json({
            message: 'Convite enviado com sucesso!',
            email: emailDestinatario,
            expiresAt
        });

    } catch (error) {
        console.error('Erro ao enviar convite:', error);

        if (error.message === 'FRONTEND_URL_NAO_CONFIGURADA') {
            return res.status(500).json({
                message: 'A URL do frontend não está configurada.'
            });
        }

        if (error.message === 'EMAIL_DO_DESTINATARIO_NAO_ENCONTRADO') {
            return res.status(400).json({
                message: 'O e-mail da solicitação não foi encontrado.'
            });
        }

        return res.status(500).json({
            message: 'Não foi possível enviar o convite.'
        });
    }
}


};

export default companyInvitationController;
