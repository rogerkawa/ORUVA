import categoryModel from '../models/categoryModel.js';

function validarId(id) {
    return /^[1-9]\d*$/.test(String(id));
}

function validarIdOpcional(id) {
    if (id === null || id === undefined || id === '') {
        return null;
    }

    if (!validarId(id)) {
        return undefined;
    }

    return String(id);
}

function validarTextoOpcional(valor, limite) {
    if (valor === undefined || valor === null || valor === '') {
        return null;
    }

    if (typeof valor !== 'string') {
        return undefined;
    }

    const texto = valor.trim();

    if (!texto || texto.length > limite) {
        return undefined;
    }

    return texto;
}

function validarFormSchema(schema) {
    if (schema === undefined || schema === null) {
        return null;
    }

    if (
        typeof schema !== 'object' ||
        (!Array.isArray(schema) &&
            Object.getPrototypeOf(schema) !== Object.prototype)
    ) {
        return undefined;
    }

    return schema;
}

function validarDadosCategoria(body) {
    const {
        name,
        description,
        departmentId,
        defaultTeamId,
        formSchema,
        icon,
        color,
        demandType,
        requiresApproval
    } = body;

    if (typeof name !== 'string' || !name.trim()) {
        return {
            erro: 'O nome da categoria é obrigatório.'
        };
    }

    if (name.trim().length > 120) {
        return {
            erro: 'O nome deve ter no máximo 120 caracteres.'
        };
    }

    if (
        description !== undefined &&
        description !== null &&
        typeof description !== 'string'
    ) {
        return {
            erro: 'A descrição informada é inválida.'
        };
    }

    const departamentoId = validarIdOpcional(departmentId);

    if (departamentoId === undefined) {
        return {
            erro: 'O departamento informado é inválido.'
        };
    }

    const equipeId = validarIdOpcional(defaultTeamId);

    if (equipeId === undefined) {
        return {
            erro: 'A equipe padrão informada é inválida.'
        };
    }

    const schema = validarFormSchema(formSchema);

    if (schema === undefined) {
        return {
            erro: 'O formulário personalizado deve ser um objeto ou uma lista JSON válida.'
        };
    }

    const icone = validarTextoOpcional(icon, 80);

    if (icone === undefined) {
        return {
            erro: 'O ícone informado é inválido ou excede 80 caracteres.'
        };
    }

    const cor = validarTextoOpcional(color, 30);

    if (cor === undefined) {
        return {
            erro: 'A cor informada é inválida ou excede 30 caracteres.'
        };
    }

    const tipoDemanda = demandType ?? 'both';

    if (!['ticket', 'service_request', 'both'].includes(tipoDemanda)) {
        return {
            erro: 'Tipo de demanda inválido. Utilize ticket, service_request ou both.'
        };
    }

    const aprovacao = requiresApproval ?? false;

    if (typeof aprovacao !== 'boolean' && aprovacao !== 0 && aprovacao !== 1) {
        return {
            erro: 'O campo requiresApproval deve ser booleano.'
        };
    }

    return {
        dados: {
            name: name.trim(),
            description: description?.trim() || null,
            departmentId: departamentoId,
            defaultTeamId: equipeId,
            formSchema: schema,
            icon: icone,
            color: cor,
            demandType: tipoDemanda,
            requiresApproval: Boolean(aprovacao)
        }
    };
}

const categoryController = {

    // GET /api/categories
    async listar(req, res) {
        try {
            const companyId = req.empresa?.company_id;

            if (!companyId) {
                return res.status(400).json({
                    message: 'Selecione uma empresa para continuar.'
                });
            }

            const categorias = await categoryModel.listar(companyId);

            return res.status(200).json({
                categorias
            });

        } catch (error) {
            console.error('Erro ao listar categorias:', error);

            return res.status(500).json({
                message: 'Erro interno ao listar categorias.'
            });
        }
    },

    // GET /api/categories/:id
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
                    message: 'ID da categoria inválido.'
                });
            }

            const categoria = await categoryModel.buscarPorId(
                id,
                companyId
            );

            if (!categoria) {
                return res.status(404).json({
                    message: 'Categoria não encontrada.'
                });
            }

            return res.status(200).json({
                categoria
            });

        } catch (error) {
            console.error('Erro ao buscar categoria:', error);

            return res.status(500).json({
                message: 'Erro interno ao buscar categoria.'
            });
        }
    },

    // POST /api/categories
    async criar(req, res) {
        try {
            const companyId = req.empresa?.company_id;

            if (!companyId) {
                return res.status(400).json({
                    message: 'Selecione uma empresa para continuar.'
                });
            }

            const validacao = validarDadosCategoria(req.body);

            if (validacao.erro) {
                return res.status(400).json({
                    message: validacao.erro
                });
            }

            const categoryId = await categoryModel.criar({
                companyId,
                ...validacao.dados
            });

            return res.status(201).json({
                message: 'Categoria criada com sucesso.',
                categoryId
            });

        } catch (error) {
            if (error.message === 'DEPARTAMENTO_INVALIDO') {
                return res.status(400).json({
                    message: 'O departamento precisa estar ativo e pertencer à empresa selecionada.'
                });
            }

            if (error.message === 'EQUIPE_INVALIDA') {
                return res.status(400).json({
                    message: 'A equipe padrão precisa estar ativa, pertencer à empresa e ser compatível com o departamento selecionado.'
                });
            }

            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({
                    message: 'Já existe uma categoria com esse nome.'
                });
            }

            console.error('Erro ao criar categoria:', error);

            return res.status(500).json({
                message: 'Erro interno ao criar categoria.'
            });
        }
    },

    // PUT /api/categories/:id
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
                    message: 'ID da categoria inválido.'
                });
            }

            const existente = await categoryModel.buscarPorId(
                id,
                companyId
            );

            if (!existente) {
                return res.status(404).json({
                    message: 'Categoria não encontrada.'
                });
            }

            const validacao = validarDadosCategoria(req.body);

            if (validacao.erro) {
                return res.status(400).json({
                    message: validacao.erro
                });
            }

            await categoryModel.atualizar(
                id,
                companyId,
                validacao.dados
            );

            return res.status(200).json({
                message: 'Categoria atualizada com sucesso.'
            });

        } catch (error) {
            if (error.message === 'DEPARTAMENTO_INVALIDO') {
                return res.status(400).json({
                    message: 'O departamento precisa estar ativo e pertencer à empresa selecionada.'
                });
            }

            if (error.message === 'EQUIPE_INVALIDA') {
                return res.status(400).json({
                    message: 'A equipe padrão precisa estar ativa, pertencer à empresa e ser compatível com o departamento selecionado.'
                });
            }

            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({
                    message: 'Já existe uma categoria com esse nome.'
                });
            }

            console.error('Erro ao atualizar categoria:', error);

            return res.status(500).json({
                message: 'Erro interno ao atualizar categoria.'
            });
        }
    },

    // PATCH /api/categories/:id/status
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
                    message: 'ID da categoria inválido.'
                });
            }

            if (!['active', 'inactive'].includes(status)) {
                return res.status(400).json({
                    message: 'Status inválido. Utilize active ou inactive.'
                });
            }

            const existente = await categoryModel.buscarPorId(
                id,
                companyId
            );

            if (!existente) {
                return res.status(404).json({
                    message: 'Categoria não encontrada.'
                });
            }

            if (existente.status === status) {
                return res.status(200).json({
                    message: 'A categoria já possui esse status.'
                });
            }

            await categoryModel.atualizarStatus(
                id,
                companyId,
                status
            );

            return res.status(200).json({
                message: status === 'active'
                    ? 'Categoria ativada com sucesso.'
                    : 'Categoria desativada com sucesso.'
            });

        } catch (error) {
            console.error('Erro ao atualizar status da categoria:', error);

            return res.status(500).json({
                message: 'Erro interno ao atualizar status da categoria.'
            });
        }
    }

};

export default categoryController;