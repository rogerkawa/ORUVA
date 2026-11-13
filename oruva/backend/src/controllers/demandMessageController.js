
import demandMessageModel from '../models/demandMessageModel.js';

const demandMessageController = {

    // Listar mensagens.
    async listar(req, res) {
        try {
            const { id } = req.params;

            const companyId = req.empresa?.company_id;
            const memberId = req.empresa?.company_member_id;
            const role = req.empresa?.role;

            if (!/^[1-9]\d*$/.test(id)) {
                return res.status(400).json({
                    message: 'Identificador de demanda inválido.'
                });
            }

            if (!companyId || !memberId) {
                return res.status(403).json({
                    message: 'Empresa não identificada na sessão.'
                });
            }

            const {
                page = '1',
                limit = '20'
            } = req.query;

            const currentPage = Number(page);
            const pageLimit = Number(limit);

            if (
                !Number.isInteger(currentPage) ||
                currentPage < 1 ||
                !Number.isInteger(pageLimit) ||
                pageLimit < 1 ||
                pageLimit > 100
            ) {
                return res.status(400).json({
                    message: 'Paginação inválida.'
                });
            }

            const result = await demandMessageModel.listar({
                demandId: id,
                companyId,
                memberId,
                role,
                limit: pageLimit,
                offset: (currentPage - 1) * pageLimit
            });

            return res.status(200).json({
                ...result,
                page: currentPage,
                totalPages: Math.ceil(result.total / pageLimit)
            });

        } catch (error) {
            console.error('Erro ao listar mensagens:', error);

            if (error.code === 'DEMAND_NOT_FOUND') {
                return res.status(404).json({
                    message: 'Demanda não encontrada.'
                });
            }

            return res.status(500).json({
                message: 'Erro interno ao listar mensagens.'
            });
        }
    },

    // Enviar mensagem.
    async criar(req, res) {
        try {
            const { id } = req.params;

            const {
                message,
                visibility = 'public'
            } = req.body;

            const companyId = req.empresa?.company_id;
            const memberId = req.empresa?.company_member_id;
            const role = req.empresa?.role;

            if (!/^[1-9]\d*$/.test(id)) {
                return res.status(400).json({
                    message: 'Identificador de demanda inválido.'
                });
            }

            if (!companyId || !memberId) {
                return res.status(403).json({
                    message: 'Empresa não identificada na sessão.'
                });
            }

            if (
                typeof message !== 'string' ||
                !message.trim() ||
                message.trim().length > 10000
            ) {
                return res.status(400).json({
                    message: 'A mensagem é obrigatória e deve ter até 10.000 caracteres.'
                });
            }

            if (!['public', 'internal'].includes(visibility)) {
                return res.status(400).json({
                    message: 'Visibilidade da mensagem inválida.'
                });
            }

            // Apenas membros operacionais podem enviar comentários internos.
            if (
                visibility === 'internal' &&
                !['admin', 'manager', 'agent'].includes(role)
            ) {
                return res.status(403).json({
                    message: 'Você não tem permissão para enviar comentários internos.'
                });
            }

            const result = await demandMessageModel.criar({
                demandId: id,
                companyId,
                memberId,
                role,
                message: message.trim(),
                visibility
            });

            return res.status(201).json({
                message: 'Mensagem enviada com sucesso.',
                data: result
            });

        } catch (error) {
            console.error('Erro ao enviar mensagem:', error);

            const errors = {
                DEMAND_NOT_FOUND: [
                    404,
                    'Demanda não encontrada.'
                ],

                DEMAND_NOT_AVAILABLE: [
                    409,
                    error.message
                ],

                MEMBER_NOT_FOUND: [
                    403,
                    'Membro não encontrado ou inativo.'
                ]
            };

            const response = errors[error.code];

            if (response) {
                return res.status(response[0]).json({
                    message: response[1]
                });
            }

            return res.status(500).json({
                message: 'Erro interno ao enviar mensagem.'
            });
        }
    }

};

export default demandMessageController;
