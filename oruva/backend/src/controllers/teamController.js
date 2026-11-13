import teamModel from '../models/teamModel.js';

// Valida BIGINT sem converter para Number
function validarId(id) {
    return typeof String(id) === 'string' &&
        /^[1-9]\d*$/.test(String(id));
}

function validarDepartamentoId(id) {
    if (id === null || id === undefined || id === '') {
        return null;
    }

    if (!validarId(id)) {
        return undefined;
    }

    return String(id);
}

const teamController = {

    // GET /api/teams
    async listar(req, res) {
        try {
            const companyId = req.empresa?.company_id;

            if (!companyId) {
                return res.status(400).json({
                    message: 'Selecione uma empresa para continuar.'
                });
            }

            const equipes = await teamModel.listar(companyId);

            return res.status(200).json({
                equipes
            });

        } catch (error) {
            console.error('Erro ao listar equipes:', error);

            return res.status(500).json({
                message: 'Erro interno ao listar equipes.'
            });
        }
    },

    // GET /api/teams/:id
    async buscarPorId(req, res) {
        try {
            const companyId = req.empresa?.company_id;
            const { id } = req.params;

            if (!companyId) {
                return res.status(400).json({
                    message: 'Selecione uma empresa para continuar.'
                });
            }

            if (!validarId(id)) {
                return res.status(400).json({
                    message: 'ID da equipe inválido.'
                });
            }

            const equipe = await teamModel.buscarPorId(
                id,
                companyId
            );

            if (!equipe) {
                return res.status(404).json({
                    message: 'Equipe não encontrada.'
                });
            }

            return res.status(200).json({
                equipe
            });

        } catch (error) {
            console.error('Erro ao buscar equipe:', error);

            return res.status(500).json({
                message: 'Erro interno ao buscar equipe.'
            });
        }
    },

    // POST /api/teams
    async criar(req, res) {
        try {
            const companyId = req.empresa?.company_id;

            const {
                name,
                description,
                departmentId
            } = req.body;

            if (!companyId) {
                return res.status(400).json({
                    message: 'Selecione uma empresa para continuar.'
                });
            }

            if (typeof name !== 'string' || !name.trim()) {
                return res.status(400).json({
                    message: 'O nome da equipe é obrigatório.'
                });
            }

            if (name.trim().length > 120) {
                return res.status(400).json({
                    message: 'O nome deve ter no máximo 120 caracteres.'
                });
            }

            if (
                description !== undefined &&
                description !== null &&
                typeof description !== 'string'
            ) {
                return res.status(400).json({
                    message: 'A descrição informada é inválida.'
                });
            }

            const departamentoId = validarDepartamentoId(departmentId);

            if (departamentoId === undefined) {
                return res.status(400).json({
                    message: 'O departamento informado é inválido.'
                });
            }

            const teamId = await teamModel.criar({
                companyId,
                departmentId: departamentoId,
                name: name.trim(),
                description: description?.trim() || null
            });

            return res.status(201).json({
                message: 'Equipe criada com sucesso.',
                teamId
            });

        } catch (error) {
            if (error.message === 'DEPARTAMENTO_INVALIDO') {
                return res.status(400).json({
                    message: 'O departamento precisa estar ativo e pertencer à empresa selecionada.'
                });
            }

            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({
                    message: 'Já existe uma equipe com esse nome.'
                });
            }

            console.error('Erro ao criar equipe:', error);

            return res.status(500).json({
                message: 'Erro interno ao criar equipe.'
            });
        }
    },

    // PUT /api/teams/:id
    async atualizar(req, res) {
        try {
            const companyId = req.empresa?.company_id;
            const { id } = req.params;

            const {
                name,
                description,
                departmentId
            } = req.body;

            if (!companyId) {
                return res.status(400).json({
                    message: 'Selecione uma empresa para continuar.'
                });
            }

            if (!validarId(id)) {
                return res.status(400).json({
                    message: 'ID da equipe inválido.'
                });
            }

            if (typeof name !== 'string' || !name.trim()) {
                return res.status(400).json({
                    message: 'O nome da equipe é obrigatório.'
                });
            }

            if (name.trim().length > 120) {
                return res.status(400).json({
                    message: 'O nome deve ter no máximo 120 caracteres.'
                });
            }

            if (
                description !== undefined &&
                description !== null &&
                typeof description !== 'string'
            ) {
                return res.status(400).json({
                    message: 'A descrição informada é inválida.'
                });
            }

            const departamentoId = validarDepartamentoId(departmentId);

            if (departamentoId === undefined) {
                return res.status(400).json({
                    message: 'O departamento informado é inválido.'
                });
            }

            const existente = await teamModel.buscarPorId(
                id,
                companyId
            );

            if (!existente) {
                return res.status(404).json({
                    message: 'Equipe não encontrada.'
                });
            }

            await teamModel.atualizar(id, companyId, {
                departmentId: departamentoId,
                name: name.trim(),
                description: description?.trim() || null
            });

            return res.status(200).json({
                message: 'Equipe atualizada com sucesso.'
            });

        } catch (error) {
            if (error.message === 'DEPARTAMENTO_INVALIDO') {
                return res.status(400).json({
                    message: 'O departamento precisa estar ativo e pertencer à empresa selecionada.'
                });
            }

            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({
                    message: 'Já existe uma equipe com esse nome.'
                });
            }

            console.error('Erro ao atualizar equipe:', error);

            return res.status(500).json({
                message: 'Erro interno ao atualizar equipe.'
            });
        }
    },

    // PATCH /api/teams/:id/status
    async atualizarStatus(req, res) {
        try {
            const companyId = req.empresa?.company_id;
            const { id } = req.params;
            const { status } = req.body;

            if (!companyId) {
                return res.status(400).json({
                    message: 'Selecione uma empresa para continuar.'
                });
            }

            if (!validarId(id)) {
                return res.status(400).json({
                    message: 'ID da equipe inválido.'
                });
            }

            if (!['active', 'inactive'].includes(status)) {
                return res.status(400).json({
                    message: 'Status inválido. Utilize active ou inactive.'
                });
            }

            const existente = await teamModel.buscarPorId(
                id,
                companyId
            );

            if (!existente) {
                return res.status(404).json({
                    message: 'Equipe não encontrada.'
                });
            }

            if (existente.status === status) {
                return res.status(200).json({
                    message: 'A equipe já possui esse status.'
                });
            }

            await teamModel.atualizarStatus(
                id,
                companyId,
                status
            );

            return res.status(200).json({
                message: status === 'active'
                    ? 'Equipe ativada com sucesso.'
                    : 'Equipe desativada com sucesso.'
            });

        } catch (error) {
            console.error('Erro ao atualizar status da equipe:', error);

            return res.status(500).json({
                message: 'Erro interno ao atualizar status da equipe.'
            });
        }
    },

    // GET /api/teams/:id/members
    async listarMembros(req, res) {
        try {
            const companyId = req.empresa?.company_id;
            const { id } = req.params;

            if (!companyId) {
                return res.status(400).json({
                    message: 'Selecione uma empresa para continuar.'
                });
            }

            if (!validarId(id)) {
                return res.status(400).json({
                    message: 'ID da equipe inválido.'
                });
            }

            const equipe = await teamModel.buscarPorId(
                id,
                companyId
            );

            if (!equipe) {
                return res.status(404).json({
                    message: 'Equipe não encontrada.'
                });
            }

            const membros = await teamModel.listarMembros(
                id,
                companyId
            );

            return res.status(200).json({
                equipe,
                membros
            });

        } catch (error) {
            console.error('Erro ao listar membros da equipe:', error);

            return res.status(500).json({
                message: 'Erro interno ao listar membros da equipe.'
            });
        }
    },

    // POST /api/teams/:id/members
    async adicionarMembro(req, res) {
        try {
            const companyId = req.empresa?.company_id;
            const { id } = req.params;
            const { companyMemberId } = req.body;

            if (!companyId) {
                return res.status(400).json({
                    message: 'Selecione uma empresa para continuar.'
                });
            }

            if (!validarId(id)) {
                return res.status(400).json({
                    message: 'ID da equipe inválido.'
                });
            }

            if (!validarId(companyMemberId)) {
                return res.status(400).json({
                    message: 'ID do membro inválido.'
                });
            }

            await teamModel.adicionarMembro(
                id,
                companyId,
                String(companyMemberId)
            );

            return res.status(201).json({
                message: 'Membro adicionado à equipe com sucesso.'
            });

        } catch (error) {
            if (error.message === 'EQUIPE_NAO_ENCONTRADA') {
                return res.status(404).json({
                    message: 'Equipe não encontrada.'
                });
            }

            if (error.message === 'EQUIPE_INATIVA') {
                return res.status(400).json({
                    message: 'Não é possível adicionar membros a uma equipe inativa.'
                });
            }

            if (error.message === 'MEMBRO_INVALIDO') {
                return res.status(400).json({
                    message: 'O membro precisa possuir um vínculo ativo com esta empresa.'
                });
            }

            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({
                    message: 'Esse membro já faz parte da equipe.'
                });
            }

            console.error('Erro ao adicionar membro à equipe:', error);

            return res.status(500).json({
                message: 'Erro interno ao adicionar membro à equipe.'
            });
        }
    },

    // DELETE /api/teams/:id/members/:memberId
    async removerMembro(req, res) {
        try {
            const companyId = req.empresa?.company_id;
            const { id, memberId } = req.params;

            if (!companyId) {
                return res.status(400).json({
                    message: 'Selecione uma empresa para continuar.'
                });
            }

            if (!validarId(id) || !validarId(memberId)) {
                return res.status(400).json({
                    message: 'ID da equipe ou do membro inválido.'
                });
            }

            const removido = await teamModel.removerMembro(
                id,
                companyId,
                memberId
            );

            if (!removido) {
                return res.status(404).json({
                    message: 'Vínculo do membro com a equipe não encontrado.'
                });
            }

            return res.status(200).json({
                message: 'Membro removido da equipe com sucesso.'
            });

        } catch (error) {
            console.error('Erro ao remover membro da equipe:', error);

            return res.status(500).json({
                message: 'Erro interno ao remover membro da equipe.'
            });
        }
    }

};

export default teamController;