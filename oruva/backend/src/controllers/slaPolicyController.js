import slaPolicyModel from '../models/slaPolicyModel.js';

const MAX_MINUTES = 4294967295;

function validarId(id) {
    return /^[1-9]\d*$/.test(String(id));
}

function validarCategoryId(id) {
    if (id === null || id === undefined || id === '') {
        return null;
    }

    if (!validarId(id)) {
        return undefined;
    }

    return String(id);
}

function validarMinutos(valor) {
    const numero = Number(valor);

    if (
        !Number.isSafeInteger(numero) ||
        numero <= 0 ||
        numero > MAX_MINUTES
    ) {
        return undefined;
    }

    return numero;
}

function validarDados(reqBody) {
    const {
        name,
        categoryId,
        priority,
        firstResponseMinutes,
        resolutionMinutes,
        pauseWhenWaiting
    } = reqBody;

    if (typeof name !== 'string' || !name.trim()) {
        return {
            erro: 'O nome da política é obrigatório.'
        };
    }

    if (name.trim().length > 120) {
        return {
            erro: 'O nome deve ter no máximo 120 caracteres.'
        };
    }

    const categoriaId = validarCategoryId(categoryId);

    if (categoriaId === undefined) {
        return {
            erro: 'A categoria informada é inválida.'
        };
    }

    const prioridades = ['low', 'medium', 'high', 'critical'];

    if (!prioridades.includes(priority)) {
        return {
            erro: 'Prioridade inválida. Utilize low, medium, high ou critical.'
        };
    }

    const primeiraResposta = validarMinutos(firstResponseMinutes);

    if (primeiraResposta === undefined) {
        return {
            erro: 'O prazo da primeira resposta deve ser um número inteiro positivo de minutos.'
        };
    }

    const resolucao = validarMinutos(resolutionMinutes);

    if (resolucao === undefined) {
        return {
            erro: 'O prazo de resolução deve ser um número inteiro positivo de minutos.'
        };
    }

    if (
        pauseWhenWaiting !== undefined &&
        typeof pauseWhenWaiting !== 'boolean' &&
        pauseWhenWaiting !== 0 &&
        pauseWhenWaiting !== 1
    ) {
        return {
            erro: 'O campo pauseWhenWaiting deve ser booleano.'
        };
    }

    return {
        dados: {
            name: name.trim(),
            categoryId: categoriaId,
            priority,
            firstResponseMinutes: primeiraResposta,
            resolutionMinutes: resolucao,
            pauseWhenWaiting: pauseWhenWaiting === undefined
                ? true
                : Boolean(pauseWhenWaiting)
        }
    };
}

const slaPolicyController = {

    // GET /api/sla-policies
    async listar(req, res) {
        try {
            const companyId = req.empresa?.company_id;

            if (!companyId) {
                return res.status(400).json({
                    message: 'Selecione uma empresa para continuar.'
                });
            }

            const politicas = await slaPolicyModel.listar(companyId);

            return res.status(200).json({
                politicas
            });

        } catch (error) {
            console.error('Erro ao listar políticas de SLA:', error);

            return res.status(500).json({
                message: 'Erro interno ao listar políticas de SLA.'
            });
        }
    },

    // GET /api/sla-policies/:id
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
                    message: 'ID da política de SLA inválido.'
                });
            }

            const politica = await slaPolicyModel.buscarPorId(
                id,
                companyId
            );

            if (!politica) {
                return res.status(404).json({
                    message: 'Política de SLA não encontrada.'
                });
            }

            return res.status(200).json({
                politica
            });

        } catch (error) {
            console.error('Erro ao buscar política de SLA:', error);

            return res.status(500).json({
                message: 'Erro interno ao buscar política de SLA.'
            });
        }
    },

    // POST /api/sla-policies
    async criar(req, res) {
        try {
            const companyId = req.empresa?.company_id;

            if (!companyId) {
                return res.status(400).json({
                    message: 'Selecione uma empresa para continuar.'
                });
            }

            const validacao = validarDados(req.body);

            if (validacao.erro) {
                return res.status(400).json({
                    message: validacao.erro
                });
            }

            const slaPolicyId = await slaPolicyModel.criar({
                companyId,
                ...validacao.dados
            });

            return res.status(201).json({
                message: 'Política de SLA criada com sucesso.',
                slaPolicyId
            });

        } catch (error) {
            if (error.message === 'CATEGORIA_INVALIDA') {
                return res.status(400).json({
                    message: 'A categoria precisa estar ativa e pertencer à empresa selecionada.'
                });
            }

            console.error('Erro ao criar política de SLA:', error);

            return res.status(500).json({
                message: 'Erro interno ao criar política de SLA.'
            });
        }
    },

    // PUT /api/sla-policies/:id
    async atualizar(req, res) {
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
                    message: 'ID da política de SLA inválido.'
                });
            }

            const existente = await slaPolicyModel.buscarPorId(
                id,
                companyId
            );

            if (!existente) {
                return res.status(404).json({
                    message: 'Política de SLA não encontrada.'
                });
            }

            const validacao = validarDados(req.body);

            if (validacao.erro) {
                return res.status(400).json({
                    message: validacao.erro
                });
            }

            await slaPolicyModel.atualizar(
                id,
                companyId,
                validacao.dados
            );

            return res.status(200).json({
                message: 'Política de SLA atualizada com sucesso.'
            });

        } catch (error) {
            if (error.message === 'CATEGORIA_INVALIDA') {
                return res.status(400).json({
                    message: 'A categoria precisa estar ativa e pertencer à empresa selecionada.'
                });
            }

            console.error('Erro ao atualizar política de SLA:', error);

            return res.status(500).json({
                message: 'Erro interno ao atualizar política de SLA.'
            });
        }
    },

    // PATCH /api/sla-policies/:id/status
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
                    message: 'ID da política de SLA inválido.'
                });
            }

            if (!['active', 'inactive'].includes(status)) {
                return res.status(400).json({
                    message: 'Status inválido. Utilize active ou inactive.'
                });
            }

            const existente = await slaPolicyModel.buscarPorId(
                id,
                companyId
            );

            if (!existente) {
                return res.status(404).json({
                    message: 'Política de SLA não encontrada.'
                });
            }

            if (existente.status === status) {
                return res.status(200).json({
                    message: 'A política já possui esse status.'
                });
            }

            await slaPolicyModel.atualizarStatus(
                id,
                companyId,
                status
            );

            return res.status(200).json({
                message: status === 'active'
                    ? 'Política de SLA ativada com sucesso.'
                    : 'Política de SLA desativada com sucesso.'
            });

        } catch (error) {
            console.error('Erro ao atualizar status da política:', error);

            return res.status(500).json({
                message: 'Erro interno ao atualizar status da política.'
            });
        }
    }

};

export default slaPolicyController;