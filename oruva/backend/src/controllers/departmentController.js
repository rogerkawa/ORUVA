
import departmentModel from '../models/departmentModel.js';

function validarId(id) {
    return Number.isSafeInteger(Number(id)) && Number(id) > 0;
}

function validarResponsavelId(id) {
    if (id === null || id === undefined || id === '') {
        return null;
    }

    if (!validarId(id)) {
        return undefined;
    }

    return Number(id);
}

const departmentController = {

    // GET /api/departments
    async listar(req, res) {
        try {
            const companyId = req.empresa?.company_id;

            if (!companyId) {
                return res.status(400).json({
                    message: 'Selecione uma empresa para continuar.'
                });
            }

            const departamentos = await departmentModel.listar(companyId);

            return res.status(200).json({
                departamentos
            });

        } catch (error) {
            console.error('Erro ao listar departamentos:', error);

            return res.status(500).json({
                message: 'Erro interno ao listar departamentos.'
            });
        }
    },

    // GET /api/departments/:id
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
                    message: 'ID do departamento inválido.'
                });
            }

            const departamento = await departmentModel.buscarPorId(
                id,
                companyId
            );

            if (!departamento) {
                return res.status(404).json({
                    message: 'Departamento não encontrado.'
                });
            }

            return res.status(200).json({
                departamento
            });

        } catch (error) {
            console.error('Erro ao buscar departamento:', error);

            return res.status(500).json({
                message: 'Erro interno ao buscar departamento.'
            });
        }
    },

    // POST /api/departments
    async criar(req, res) {
        try {
            const companyId = req.empresa?.company_id;

            const {
                name,
                description,
                managerMemberId
            } = req.body;

            if (!companyId) {
                return res.status(400).json({
                    message: 'Selecione uma empresa para continuar.'
                });
            }

            if (typeof name !== 'string' || !name.trim()) {
                return res.status(400).json({
                    message: 'O nome do departamento é obrigatório.'
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

            const responsavelId = validarResponsavelId(managerMemberId);

            if (responsavelId === undefined) {
                return res.status(400).json({
                    message: 'O responsável informado é inválido.'
                });
            }

            const departmentId = await departmentModel.criar({
                companyId,
                managerMemberId: responsavelId,
                name: name.trim(),
                description: description?.trim() || null
            });

            return res.status(201).json({
                message: 'Departamento criado com sucesso.',
                departmentId
            });

        } catch (error) {
            if (error.message === 'RESPONSAVEL_INVALIDO') {
                return res.status(400).json({
                    message: 'O responsável precisa possuir um vínculo ativo com esta empresa.'
                });
            }

            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({
                    message: 'Já existe um departamento com esse nome.'
                });
            }

            console.error('Erro ao criar departamento:', error);

            return res.status(500).json({
                message: 'Erro interno ao criar departamento.'
            });
        }
    },

    // PUT /api/departments/:id
    async atualizar(req, res) {
        try {
            const companyId = req.empresa?.company_id;
            const { id } = req.params;

            const {
                name,
                description,
                managerMemberId
            } = req.body;

            if (!companyId) {
                return res.status(400).json({
                    message: 'Selecione uma empresa para continuar.'
                });
            }

            if (!validarId(id)) {
                return res.status(400).json({
                    message: 'ID do departamento inválido.'
                });
            }

            if (typeof name !== 'string' || !name.trim()) {
                return res.status(400).json({
                    message: 'O nome do departamento é obrigatório.'
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

            const responsavelId = validarResponsavelId(managerMemberId);

            if (responsavelId === undefined) {
                return res.status(400).json({
                    message: 'O responsável informado é inválido.'
                });
            }

            const existente = await departmentModel.buscarPorId(
                id,
                companyId
            );

            if (!existente) {
                return res.status(404).json({
                    message: 'Departamento não encontrado.'
                });
            }

            await departmentModel.atualizar(id, companyId, {
                managerMemberId: responsavelId,
                name: name.trim(),
                description: description?.trim() || null
            });

            return res.status(200).json({
                message: 'Departamento atualizado com sucesso.'
            });

        } catch (error) {
            if (error.message === 'RESPONSAVEL_INVALIDO') {
                return res.status(400).json({
                    message: 'O responsável precisa possuir um vínculo ativo com esta empresa.'
                });
            }

            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({
                    message: 'Já existe um departamento com esse nome.'
                });
            }

            console.error('Erro ao atualizar departamento:', error);

            return res.status(500).json({
                message: 'Erro interno ao atualizar departamento.'
            });
        }
    },

    // PATCH /api/departments/:id/status
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
                    message: 'ID do departamento inválido.'
                });
            }

            if (!['active', 'inactive'].includes(status)) {
                return res.status(400).json({
                    message: 'Status inválido. Utilize active ou inactive.'
                });
            }

            const existente = await departmentModel.buscarPorId(
                id,
                companyId
            );

            if (!existente) {
                return res.status(404).json({
                    message: 'Departamento não encontrado.'
                });
            }

            if (existente.status === status) {
                return res.status(200).json({
                    message: 'O departamento já possui esse status.'
                });
            }

            await departmentModel.atualizarStatus(
                id,
                companyId,
                status
            );

            return res.status(200).json({
                message: status === 'active'
                    ? 'Departamento ativado com sucesso.'
                    : 'Departamento desativado com sucesso.'
            });

        } catch (error) {
            console.error('Erro ao atualizar status do departamento:', error);

            return res.status(500).json({
                message: 'Erro interno ao atualizar status do departamento.'
            });
        }
    }

};

export default departmentController;
