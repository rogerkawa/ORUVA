
import companyRequestModel from '../models/companyRequestModel.js';

function gerarSlug(texto) {
    return texto
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

const companyRequestController = {

    // POST /api/company-requests
    async criar(req, res) {
        try {
            const {
                companyName,
                tradeName,
                document,
                contactName,
                email,
                phone,
                message
            } = req.body;

            if (
                !companyName?.trim() ||
                !contactName?.trim() ||
                !email?.trim()
            ) {
                return res.status(400).json({
                    message: 'Preencha o nome da empresa, o nome do responsável e o e-mail.'
                });
            }

            const emailNormalizado = email.trim().toLowerCase();

            const formatoEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (!formatoEmail.test(emailNormalizado)) {
                return res.status(400).json({
                    message: 'Informe um endereço de e-mail válido.'
                });
            }

            if (companyName.trim().length > 150) {
                return res.status(400).json({
                    message: 'O nome da empresa deve ter no máximo 150 caracteres.'
                });
            }

            if (contactName.trim().length > 150) {
                return res.status(400).json({
                    message: 'O nome do responsável deve ter no máximo 150 caracteres.'
                });
            }

            const solicitacaoExistente =
                await companyRequestModel.buscarPendentePorEmail(emailNormalizado);

            if (solicitacaoExistente) {
                return res.status(409).json({
                    message: 'Já existe uma solicitação pendente para este e-mail.'
                });
            }

            const requestId = await companyRequestModel.criar({
                companyName: companyName.trim(),
                tradeName: tradeName?.trim(),
                document: document?.trim(),
                contactName: contactName.trim(),
                email: emailNormalizado,
                phone: phone?.trim(),
                message: message?.trim()
            });

            return res.status(201).json({
                message: 'Solicitação enviada com sucesso! Aguarde a análise da equipe Oruva.',
                requestId
            });

        } catch (error) {
            console.error('Erro ao criar solicitação:', error);

            return res.status(500).json({
                message: 'Erro interno ao enviar a solicitação.'
            });
        }
    },

    // GET /api/company-requests
    async listar(req, res) {
        try {
            const { status } = req.query;

            const statusPermitidos = [
                'pending',
                'approved',
                'rejected'
            ];

            if (status && !statusPermitidos.includes(status)) {
                return res.status(400).json({
                    message: 'Status de solicitação inválido.'
                });
            }

            const solicitacoes = await companyRequestModel.listar(
                status || null
            );

            return res.status(200).json({
                solicitacoes
            });

        } catch (error) {
            console.error('Erro ao listar solicitações:', error);

            return res.status(500).json({
                message: 'Erro interno ao listar as solicitações.'
            });
        }
    },

    // PATCH /api/company-requests/:id/approve
    async aprovar(req, res) {
        try {
            const id = Number(req.params.id);

            if (!Number.isSafeInteger(id) || id <= 0) {
                return res.status(400).json({
                    message: 'ID de solicitação inválido.'
                });
            }

            const solicitacao = await companyRequestModel.buscarPorId(id);

            if (!solicitacao) {
                return res.status(404).json({
                    message: 'Solicitação não encontrada.'
                });
            }

            if (solicitacao.status !== 'pending') {
                return res.status(409).json({
                    message: 'Esta solicitação já foi analisada.'
                });
            }

            const nomeParaSlug =
                solicitacao.trade_name || solicitacao.company_name;

            const slugBase = gerarSlug(nomeParaSlug);

            if (!slugBase) {
                return res.status(400).json({
                    message: 'Não foi possível gerar um identificador para esta empresa.'
                });
            }

            const resultado = await companyRequestModel.aprovar(
                id,
                req.usuario.id,
                slugBase
            );

            return res.status(200).json({
                message: 'Empresa aprovada e cadastrada com sucesso!',
                empresa: resultado
            });

        } catch (error) {
            if (error.message === 'SOLICITACAO_NAO_ENCONTRADA') {
                return res.status(404).json({
                    message: 'Solicitação não encontrada.'
                });
            }

            if (error.message === 'SOLICITACAO_JA_ANALISADA') {
                return res.status(409).json({
                    message: 'Esta solicitação já foi analisada.'
                });
            }

            console.error('Erro ao aprovar solicitação:', error);

            return res.status(500).json({
                message: 'Erro interno ao aprovar a solicitação.'
            });
        }
    },

    // PATCH /api/company-requests/:id/reject
    async recusar(req, res) {
        try {
            const id = Number(req.params.id);
            const { rejectionReason } = req.body;

            if (!Number.isSafeInteger(id) || id <= 0) {
                return res.status(400).json({
                    message: 'ID de solicitação inválido.'
                });
            }

            const solicitacao = await companyRequestModel.buscarPorId(id);

            if (!solicitacao) {
                return res.status(404).json({
                    message: 'Solicitação não encontrada.'
                });
            }

            if (solicitacao.status !== 'pending') {
                return res.status(409).json({
                    message: 'Esta solicitação já foi analisada.'
                });
            }

            const recusada = await companyRequestModel.recusar(
                id,
                req.usuario.id,
                rejectionReason?.trim() || null
            );

            if (!recusada) {
                return res.status(409).json({
                    message: 'Não foi possível recusar. A solicitação pode já ter sido analisada.'
                });
            }

            return res.status(200).json({
                message: 'Solicitação recusada com sucesso.'
            });

        } catch (error) {
            console.error('Erro ao recusar solicitação:', error);

            return res.status(500).json({
                message: 'Erro interno ao recusar a solicitação.'
            });
        }
    }

};

export default companyRequestController;
