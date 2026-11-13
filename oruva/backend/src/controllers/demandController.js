
import demandModel from '../models/demandModel.js';


async function processarAtribuicao(req, res, transferir = false) {
    try {
        const { id } = req.params;

        const {
            teamId = null,
            assignedMemberId = null,
            transferReason = null
        } = req.body;

        const companyId = req.empresa?.company_id;
        const actorMemberId = req.empresa?.company_member_id;
        const role = req.empresa?.role;

        if (!/^[1-9]\d*$/.test(id)) {
            return res.status(400).json({
                message: 'Identificador de demanda inválido.'
            });
        }

        if (!companyId || !actorMemberId) {
            return res.status(403).json({
                message: 'Empresa não identificada na sessão.'
            });
        }

        if (!['admin', 'manager', 'agent'].includes(role)) {
            return res.status(403).json({
                message: 'Você não tem permissão para atribuir demandas.'
            });
        }

        const validId = value =>
            value === null ||
            (
                typeof value === 'string' &&
                /^[1-9]\d*$/.test(value)
            );

        if (!validId(teamId) || !validId(assignedMemberId)) {
            return res.status(400).json({
                message: 'Equipe ou membro informado é inválido.'
            });
        }

        if (!teamId && !assignedMemberId) {
            return res.status(400).json({
                message: 'Informe uma equipe, um membro ou ambos.'
            });
        }

        if (
            transferir &&
            (
                typeof transferReason !== 'string' ||
                !transferReason.trim() ||
                transferReason.trim().length > 1000
            )
        ) {
            return res.status(400).json({
                message: 'Informe o motivo da transferência, com até 1000 caracteres.'
            });
        }

        const result = await demandModel.atualizarAtribuicao({
            demandId: id,
            companyId,
            actorMemberId,
            teamId,
            assignedMemberId,
            transferReason: transferReason?.trim() || null,
            exigirAtribuicaoAnterior: transferir
        });

        return res.status(200).json({
            message: transferir
                ? 'Demanda transferida com sucesso.'
                : 'Demanda atribuída com sucesso.',
            assignment: result
        });

    } catch (error) {
        console.error('Erro ao atualizar atribuição:', error);

        const errors = {
            DEMAND_NOT_FOUND: [404, 'Demanda não encontrada.'],
            DEMAND_NOT_ASSIGNABLE: [409, error.message],
            NO_PREVIOUS_ASSIGNMENT: [409, error.message],
            TEAM_NOT_FOUND: [404, 'Equipe não encontrada ou inativa.'],
            MEMBER_NOT_FOUND: [404, 'Membro não encontrado ou inativo.'],
            MEMBER_NOT_IN_TEAM: [400, 'O membro não pertence à equipe selecionada.'],
            EMPTY_ASSIGNMENT: [400, error.message],
            SAME_ASSIGNMENT: [409, error.message]
        };

        const response = errors[error.code];

        if (response) {
            return res.status(response[0]).json({
                message: response[1]
            });
        }

        return res.status(500).json({
            message: 'Erro interno ao atualizar a atribuição.'
        });
    }
}


const demandController = {

    // Criar demanda.
    async criar(req, res) {
        try {
            const {
                categoryId,
                requesterMemberId,
                teamId,
                type,
                title,
                description,
                priority = 'medium',
                source = 'portal',
                formData = null
            } = req.body;

            const companyId = req.empresa?.company_id;
            const openedByMemberId = req.empresa?.company_member_id;
            const role = req.empresa?.role;

            if (!companyId || !openedByMemberId) {
                return res.status(403).json({
                    message: 'Empresa não identificada na sessão.'
                });
            }

            const validId = value =>
                typeof value === 'string' &&
                /^[1-9]\d*$/.test(value);

            if (!validId(String(categoryId || ''))) {
                return res.status(400).json({
                    message: 'Informe uma categoria válida.'
                });
            }

            if (
                teamId !== undefined &&
                teamId !== null &&
                !validId(String(teamId))
            ) {
                return res.status(400).json({
                    message: 'Equipe inválida.'
                });
            }

            if (
                requesterMemberId !== undefined &&
                requesterMemberId !== null &&
                !validId(String(requesterMemberId))
            ) {
                return res.status(400).json({
                    message: 'Solicitante inválido.'
                });
            }

            if (
                !['ticket', 'service_request'].includes(type)
            ) {
                return res.status(400).json({
                    message: 'Tipo de demanda inválido.'
                });
            }

            if (
                typeof title !== 'string' ||
                !title.trim() ||
                title.trim().length > 180
            ) {
                return res.status(400).json({
                    message: 'O título é obrigatório e deve ter até 180 caracteres.'
                });
            }

            if (
                description !== undefined &&
                description !== null &&
                typeof description !== 'string'
            ) {
                return res.status(400).json({
                    message: 'Descrição inválida.'
                });
            }

            if (
                !['low', 'medium', 'high', 'critical'].includes(priority)
            ) {
                return res.status(400).json({
                    message: 'Prioridade inválida.'
                });
            }

            if (
                ![
                    'portal',
                    'manual',
                    'email',
                    'whatsapp',
                    'api',
                    'phone',
                    'other'
                ].includes(source)
            ) {
                return res.status(400).json({
                    message: 'Origem da demanda inválida.'
                });
            }

            if (
                formData !== null &&
                (
                    typeof formData !== 'object' ||
                    Array.isArray(formData)
                )
            ) {
                return res.status(400).json({
                    message: 'Os dados do formulário devem ser um objeto JSON.'
                });
            }

            // Colaboradores não podem abrir demandas em nome de terceiros.
            let requesterId = openedByMemberId;

            if (role !== 'collaborator' && requesterMemberId) {
                requesterId = requesterMemberId;
            }

            const demand = await demandModel.criar({
                companyId,
                requesterMemberId: requesterId,
                openedByMemberId,
                categoryId,
                teamId: teamId || null,
                type,
                title: title.trim(),
                description: description?.trim() || null,
                priority,
                source,
                formData
            });

            return res.status(201).json({
                message: 'Demanda criada com sucesso.',
                demand
            });

        } catch (error) {
            console.error('Erro ao criar demanda:', error);

            const errors = {
                CATEGORY_NOT_FOUND: [404, 'Categoria não encontrada ou inativa.'],
                INVALID_DEMAND_TYPE: [400, 'Tipo não permitido para esta categoria.'],
                APPROVAL_FLOW_NOT_IMPLEMENTED: [409, error.message],
                REQUESTER_NOT_FOUND: [404, 'Solicitante não encontrado.'],
                OPENER_NOT_FOUND: [403, 'Membro responsável pela abertura inválido.'],
                TEAM_NOT_FOUND: [404, 'Equipe não encontrada ou inativa.'],
                TEAM_DEPARTMENT_MISMATCH: [400, 'Equipe incompatível com o departamento da categoria.'],
                SLA_POLICY_AMBIGUOUS: [409, error.message]
            };

            const response = errors[error.code];

            if (response) {
                return res.status(response[0]).json({
                    message: response[1]
                });
            }

            return res.status(500).json({
                message: 'Erro interno ao criar demanda.'
            });
        }
    },

    // Listar demandas.
    async listar(req, res) {
        try {
            const companyId = req.empresa?.company_id;
            const memberId = req.empresa?.company_member_id;
            const role = req.empresa?.role;

            if (!companyId || !memberId) {
                return res.status(403).json({
                    message: 'Empresa não identificada na sessão.'
                });
            }

            const {
                status,
                priority,
                categoryId,
                teamId,
                assignedMemberId,
                page = '1',
                limit = '20'
            } = req.query;

            const validStatuses = [
                'open',
                'in_progress',
                'waiting_requester',
                'waiting_third_party',
                'resolved',
                'closed',
                'canceled'
            ];

            const validPriorities = [
                'low',
                'medium',
                'high',
                'critical'
            ];

            const validId = value =>
                /^[1-9]\d*$/.test(String(value));

            if (status && !validStatuses.includes(status)) {
                return res.status(400).json({
                    message: 'Filtro de status inválido.'
                });
            }

            if (priority && !validPriorities.includes(priority)) {
                return res.status(400).json({
                    message: 'Filtro de prioridade inválido.'
                });
            }

            for (const id of [
                categoryId,
                teamId,
                assignedMemberId
            ]) {
                if (id && !validId(id)) {
                    return res.status(400).json({
                        message: 'Um dos filtros de identificação é inválido.'
                    });
                }
            }

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

            const result = await demandModel.listar({
                companyId,
                memberId,
                role,
                filters: {
                    status,
                    priority,
                    categoryId,
                    teamId,
                    assignedMemberId
                },
                limit: pageLimit,
                offset: (currentPage - 1) * pageLimit
            });

            return res.status(200).json({
                ...result,
                page: currentPage,
                totalPages: Math.ceil(result.total / pageLimit)
            });

        } catch (error) {
            console.error('Erro ao listar demandas:', error);

            return res.status(500).json({
                message: 'Erro interno ao listar demandas.'
            });
        }
    },

    // Consultar uma demanda específica.
    async buscarPorId(req, res) {
        try {
            const { id } = req.params;

            if (!/^[1-9]\d*$/.test(id)) {
                return res.status(400).json({
                    message: 'Identificador de demanda inválido.'
                });
            }

            const companyId = req.empresa?.company_id;
            const memberId = req.empresa?.company_member_id;
            const role = req.empresa?.role;

            if (!companyId || !memberId) {
                return res.status(403).json({
                    message: 'Empresa não identificada na sessão.'
                });
            }

            const demand = await demandModel.buscarPorId({
                id,
                companyId,
                memberId,
                role
            });

            if (!demand) {
                return res.status(404).json({
                    message: 'Demanda não encontrada.'
                });
            }

            return res.status(200).json({
                demand
            });

        } catch (error) {
            console.error('Erro ao consultar demanda:', error);

            return res.status(500).json({
                message: 'Erro interno ao consultar demanda.'
            });
        }
    },

    // Atribuir demanda.
    async atribuir(req, res) {
        return processarAtribuicao(req, res, false);
    },

    // Transferir demanda.
    async transferir(req, res) {
        return processarAtribuicao(req, res, true);
    },

};

export default demandController;
