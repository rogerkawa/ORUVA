
import demandHistoryModel from '../models/demandHistoryModel.js';

function validarId(id) {
    return typeof id === 'string' && /^[1-9]\d*$/.test(id);
}

const demandHistoryController = {

    // GET /api/demands/:id/history
    async listar(req, res) {
        try {
            const companyId = req.empresa?.company_id;
            const memberId = req.empresa?.company_member_id;
            const role = req.empresa?.role;
            const { id } = req.params;

            if (!companyId || !memberId || !role) {
                return res.status(400).json({
                    message: 'Selecione uma empresa para continuar.'
                });
            }

            if (!validarId(id)) {
                return res.status(400).json({
                    message: 'ID da demanda inválido.'
                });
            }

            // Paginação
            const page = req.query.page === undefined
                ? 1
                : Number(req.query.page);

            const limit = req.query.limit === undefined
                ? 20
                : Number(req.query.limit);

            if (
                !Number.isSafeInteger(page) ||
                page < 1 ||
                !Number.isSafeInteger(limit) ||
                limit < 1 ||
                limit > 100
            ) {
                return res.status(400).json({
                    message: 'Parâmetros de paginação inválidos.',
                    details: {
                        page: 'Deve ser um número inteiro maior que zero.',
                        limit: 'Deve ser um número entre 1 e 100.'
                    }
                });
            }

            const offset = (page - 1) * limit;

            if (!Number.isSafeInteger(offset)) {
                return res.status(400).json({
                    message: 'Página solicitada inválida.'
                });
            }

            const resultado = await demandHistoryModel.listar({
                demandId: id,
                companyId,
                memberId,
                role,
                limit,
                offset
            });

            if (!resultado) {
                return res.status(404).json({
                    message: 'Demanda não encontrada.'
                });
            }

            const totalPages = Math.ceil(resultado.total / limit);

            return res.status(200).json({
                historico: resultado.historico,
                pagination: {
                    page,
                    limit,
                    total: resultado.total,
                    totalPages,
                    hasNextPage: page < totalPages,
                    hasPreviousPage: page > 1
                }
            });

        } catch (error) {
            if (error.message === 'DEMAND_ACCESS_DENIED') {
                return res.status(403).json({
                    message: 'Você não tem permissão para consultar o histórico desta demanda.'
                });
            }

            console.error('Erro ao listar histórico da demanda:', error);

            return res.status(500).json({
                message: 'Erro interno ao consultar histórico da demanda.'
            });
        }
    }

};

export default demandHistoryController;
