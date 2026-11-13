
import approvalModel from '../models/approvalModel.js';

const validarId = (id) => /^[1-9]\d*$/.test(String(id));

const erros = {
    CATEGORY_NOT_FOUND: [404, 'Categoria não encontrada.'],
    CATEGORY_INACTIVE: [400, 'Não é possível configurar aprovações em uma categoria inativa.'],

    APPROVAL_STEPS_REQUIRED: [400, 'Informe pelo menos um aprovador.'],
    DUPLICATE_APPROVER: [400, 'O mesmo membro não pode aparecer em mais de uma etapa.'],
    INVALID_APPROVER_ID: [400, 'Um dos IDs de aprovador é inválido.'],
    APPROVER_NOT_FOUND: [400, 'Um ou mais aprovadores não pertencem à empresa.'],
    APPROVER_NOT_ACTIVE: [400, 'Um ou mais aprovadores estão inativos.'],

    DEMAND_NOT_FOUND: [404, 'Demanda não encontrada.'],
    DEMAND_ACCESS_DENIED: [403, 'Você não tem acesso a esta demanda.'],

    APPROVAL_NOT_FOUND: [404, 'Aprovação não encontrada.'],
    APPROVAL_ACCESS_DENIED: [403, 'Esta aprovação não está atribuída a você.'],
    APPROVAL_ALREADY_DECIDED: [409, 'Esta etapa já foi decidida.'],
    DEMAND_NOT_AWAITING_APPROVAL: [409, 'Esta demanda não está aguardando aprovação.'],

    SELF_APPROVAL_NOT_ALLOWED: [403, 'Você não pode aprovar uma demanda solicitada por você.'],
    MEMBER_INACTIVE: [403, 'Seu vínculo com a empresa ou sua conta não está ativo.'],

    APPROVAL_STEP_LOCKED: [409, 'Esta etapa ainda não foi liberada.'],

    INVALID_APPROVAL_DECISION: [400, 'Decisão de aprovação inválida.'],
    INVALID_APPROVAL_COMMENTS: [400, 'O comentário precisa ser um texto válido.'],
    APPROVAL_COMMENTS_TOO_LONG: [400, 'O comentário não pode ultrapassar 2000 caracteres.']
};

const responderErro = (res, error) => {
    const erro = erros[error.message];

    if (erro) {
        return res.status(erro[0]).json({
            mensagem: erro[1]
        });
    }

    console.error('Erro no módulo de aprovações:', error);

    return res.status(500).json({
        mensagem: 'Erro interno ao processar a aprovação.'
    });
};

const approvalController = {

    // GET /api/approvals/categories/:categoryId/steps
    async listarEtapasCategoria(req, res) {
        try {
            const { categoryId } = req.params;

            if (!validarId(categoryId)) {
                return res.status(400).json({
                    mensagem: 'ID da categoria inválido.'
                });
            }

            if (!req.empresa) {
                return res.status(403).json({
                    mensagem: 'Vínculo com uma empresa não encontrado.'
                });
            }

            const resultado = await approvalModel.listarEtapasCategoria({
                categoryId,
                companyId: req.empresa.company_id
            });

            return res.status(200).json(resultado);

        } catch (error) {
            return responderErro(res, error);
        }
    },

    // PUT /api/approvals/categories/:categoryId/steps
    async atualizarEtapasCategoria(req, res) {
        try {
            const { categoryId } = req.params;
            const { steps } = req.body || {};

            if (!validarId(categoryId)) {
                return res.status(400).json({
                    mensagem: 'ID da categoria inválido.'
                });
            }

            if (!req.empresa) {
                return res.status(403).json({
                    mensagem: 'Vínculo com uma empresa não encontrado.'
                });
            }

            if (!['admin', 'manager'].includes(req.empresa.role)) {
                return res.status(403).json({
                    mensagem: 'Você não tem permissão para configurar aprovações.'
                });
            }

            if (
                !Array.isArray(steps) ||
                steps.length === 0 ||
                steps.length > 20
            ) {
                return res.status(400).json({
                    mensagem: 'Informe entre 1 e 20 etapas de aprovação.'
                });
            }

            const approverIds = [];

            for (const step of steps) {
                if (
                    !step ||
                    (
                        typeof step.approverMemberId !== 'string' &&
                        typeof step.approverMemberId !== 'number'
                    )
                ) {
                    return res.status(400).json({
                        mensagem: 'Cada etapa precisa informar um approverMemberId válido.'
                    });
                }

                const memberId = String(step.approverMemberId);

                if (!validarId(memberId)) {
                    return res.status(400).json({
                        mensagem: 'Um dos IDs de aprovador é inválido.'
                    });
                }

                approverIds.push(memberId);
            }

            const resultado = await approvalModel.atualizarEtapasCategoria({
                categoryId,
                companyId: req.empresa.company_id,
                steps: approverIds
            });

            return res.status(200).json({
                mensagem: 'Fluxo de aprovação configurado com sucesso.',
                ...resultado
            });

        } catch (error) {
            return responderErro(res, error);
        }
    },

    // DELETE /api/approvals/categories/:categoryId/steps
    async removerEtapasCategoria(req, res) {
        try {
            const { categoryId } = req.params;

            if (!validarId(categoryId)) {
                return res.status(400).json({
                    mensagem: 'ID da categoria inválido.'
                });
            }

            if (!req.empresa) {
                return res.status(403).json({
                    mensagem: 'Vínculo com uma empresa não encontrado.'
                });
            }

            if (!['admin', 'manager'].includes(req.empresa.role)) {
                return res.status(403).json({
                    mensagem: 'Você não tem permissão para remover esta configuração.'
                });
            }

            await approvalModel.removerEtapasCategoria({
                categoryId,
                companyId: req.empresa.company_id
            });

            return res.status(200).json({
                mensagem: 'Fluxo de aprovação removido. A categoria não exigirá mais aprovação.'
            });

        } catch (error) {
            return responderErro(res, error);
        }
    },

    // GET /api/approvals/pending
    async listarPendentes(req, res) {
        try {
            if (!req.empresa) {
                return res.status(403).json({
                    mensagem: 'Vínculo com uma empresa não encontrado.'
                });
            }

            const limitParam = req.query.limit;
            const offsetParam = req.query.offset;

            const limit = limitParam === undefined
                ? 50
                : Number(limitParam);

            const offset = offsetParam === undefined
                ? 0
                : Number(offsetParam);

            if (
                !Number.isInteger(limit) ||
                limit < 1 ||
                limit > 100 ||
                !Number.isInteger(offset) ||
                offset < 0
            ) {
                return res.status(400).json({
                    mensagem: 'Parâmetros de paginação inválidos.'
                });
            }

            const aprovacoes = await approvalModel.listarPendentes({
                companyId: req.empresa.company_id,
                memberId: req.empresa.company_member_id,
                limit,
                offset
            });

            return res.status(200).json({
                total: aprovacoes.length,
                aprovacoes
            });

        } catch (error) {
            return responderErro(res, error);
        }
    },

    // GET /api/approvals/demands/:demandId
    async buscarFluxoDemanda(req, res) {
        try {
            const { demandId } = req.params;

            if (!validarId(demandId)) {
                return res.status(400).json({
                    mensagem: 'ID da demanda inválido.'
                });
            }

            if (!req.empresa) {
                return res.status(403).json({
                    mensagem: 'Vínculo com uma empresa não encontrado.'
                });
            }

            const resultado = await approvalModel.buscarFluxoDemanda({
                demandId,
                companyId: req.empresa.company_id,
                memberId: req.empresa.company_member_id,
                role: req.empresa.role
            });

            return res.status(200).json(resultado);

        } catch (error) {
            return responderErro(res, error);
        }
    },

    // POST /api/approvals/:approvalId/approve
    async aprovar(req, res) {
        return approvalController.decidir(req, res, 'approve');
    },

    // POST /api/approvals/:approvalId/reject
    async rejeitar(req, res) {
        return approvalController.decidir(req, res, 'reject');
    },

    // Processar decisão.
    async decidir(req, res, decision) {
        try {
            const { approvalId } = req.params;
            const { comments = null } = req.body || {};

            if (!validarId(approvalId)) {
                return res.status(400).json({
                    mensagem: 'ID da aprovação inválido.'
                });
            }

            if (!req.empresa) {
                return res.status(403).json({
                    mensagem: 'Vínculo com uma empresa não encontrado.'
                });
            }

            if (
                comments !== null &&
                typeof comments !== 'string'
            ) {
                return res.status(400).json({
                    mensagem: 'O comentário precisa ser um texto válido.'
                });
            }

            if (
                typeof comments === 'string' &&
                comments.trim().length > 2000
            ) {
                return res.status(400).json({
                    mensagem: 'O comentário não pode ultrapassar 2000 caracteres.'
                });
            }

            const resultado = await approvalModel.decidir({
                approvalId,
                companyId: req.empresa.company_id,
                actorMemberId: req.empresa.company_member_id,
                decision,
                comments: comments?.trim() || null
            });

            const mensagem = decision === 'approve'
                ? 'Etapa aprovada com sucesso.'
                : 'Demanda rejeitada com sucesso.';

            return res.status(200).json({
                mensagem,
                ...resultado
            });

        } catch (error) {
            return responderErro(res, error);
        }
    }
};

export default approvalController;
