
import processTemplateModel from '../models/processTemplateModel.js';

const obterCodigoErro = (error) => error.code || error.message;

const validarId = (valor) => {
    const id = Number(valor);

    return Number.isSafeInteger(id) && id > 0 ? id : null;
};

const validarTexto = (valor, maxLength = 150) => {
    if (typeof valor !== 'string') return null;

    const texto = valor.trim();

    if (!texto || texto.length > maxLength) return null;

    return texto;
};

const validarDescricao = (valor) => {
    if (valor === undefined || valor === null) return null;

    if (typeof valor !== 'string') return undefined;

    return valor.trim() || null;
};

const validarHoras = (valor) => {
    if (valor === undefined || valor === null || valor === '') {
        return null;
    }

    const horas = Number(valor);

    if (!Number.isFinite(horas) || horas < 0) {
        return undefined;
    }

    return horas;
};

const responderErro = (res, error, contexto, mensagens = {}) => {
    const codigo = obterCodigoErro(error);

    console.error(`${contexto}:`, error);

    if (codigo === 'ER_DUP_ENTRY') {
        return res.status(409).json({
            success: false,
            message: mensagens.duplicado || 'Já existe um registro com esses dados.'
        });
    }

    const errosConhecidos = {
        MODELO_COM_PROCESSOS_EM_ANDAMENTO: {
            status: 409,
            message: error.message
        },
        ETAPA_VINCULADA_A_PROCESSOS: {
            status: 409,
            message: error.message
        },
        EQUIPE_INVALIDA: {
            status: 400,
            message: 'A equipe selecionada é inválida ou não está disponível.'
        },
        ETAPAS_INVALIDAS: {
            status: 400,
            message: error.message
        },
        MODELO_NAO_ENCONTRADO: {
            status: 404,
            message: 'Modelo de processo não encontrado.'
        }
    };

    const erroConhecido = errosConhecidos[codigo];

    if (erroConhecido) {
        return res.status(erroConhecido.status).json({
            success: false,
            message: erroConhecido.message
        });
    }

    return res.status(500).json({
        success: false,
        message: mensagens.interno || 'Ocorreu um erro interno no servidor.'
    });
};

const processTemplateController = {

    async listar(req, res) {
        try {
            const companyId = req.empresa.company_id;
            const { status, search } = req.query;

            const templates = await processTemplateModel.listar(
                companyId,
                {
                    status,
                    search
                }
            );

            return res.status(200).json({
                success: true,
                data: templates
            });

        } catch (error) {
            return responderErro(
                res,
                error,
                'Erro ao listar modelos de processos',
                {
                    interno: 'Erro ao buscar modelos de processos.'
                }
            );
        }
    },

    async buscarPorId(req, res) {
        try {
            const companyId = req.empresa.company_id;
            const templateId = validarId(req.params.id);

            if (!templateId) {
                return res.status(400).json({
                    success: false,
                    message: 'Identificador de modelo inválido.'
                });
            }

            const template = await processTemplateModel.buscarPorId(
                templateId,
                companyId
            );

            if (!template) {
                return res.status(404).json({
                    success: false,
                    message: 'Modelo de processo não encontrado.'
                });
            }

            const etapas = await processTemplateModel.listarEtapas(
                templateId,
                companyId
            );

            return res.status(200).json({
                success: true,
                data: {
                    ...template,
                    etapas
                }
            });

        } catch (error) {
            return responderErro(
                res,
                error,
                'Erro ao buscar modelo de processo',
                {
                    interno: 'Erro ao buscar modelo de processo.'
                }
            );
        }
    },

    async criar(req, res) {
        try {
            const companyId = req.empresa.company_id;
            const createdByMemberId = req.empresa.company_member_id;

            const { name, description } = req.body;

            const nomeValidado = validarTexto(name);
            const descricaoValidada = validarDescricao(description);

            if (!nomeValidado) {
                return res.status(400).json({
                    success: false,
                    message: 'Informe um nome válido para o modelo, com até 150 caracteres.'
                });
            }

            if (descricaoValidada === undefined) {
                return res.status(400).json({
                    success: false,
                    message: 'A descrição deve ser um texto válido.'
                });
            }

            const template = await processTemplateModel.criar({
                companyId,
                createdByMemberId,
                name: nomeValidado,
                description: descricaoValidada
            });

            return res.status(201).json({
                success: true,
                message: 'Modelo de processo criado com sucesso.',
                data: template
            });

        } catch (error) {
            return responderErro(
                res,
                error,
                'Erro ao criar modelo de processo',
                {
                    duplicado: 'Já existe um modelo com esse nome.',
                    interno: 'Erro ao criar modelo de processo.'
                }
            );
        }
    },

    async atualizar(req, res) {
        try {
            const companyId = req.empresa.company_id;
            const templateId = validarId(req.params.id);

            const { name, description } = req.body;

            if (!templateId) {
                return res.status(400).json({
                    success: false,
                    message: 'Identificador de modelo inválido.'
                });
            }

            const nomeValidado = validarTexto(name);
            const descricaoValidada = validarDescricao(description);

            if (!nomeValidado) {
                return res.status(400).json({
                    success: false,
                    message: 'Informe um nome válido para o modelo, com até 150 caracteres.'
                });
            }

            if (descricaoValidada === undefined) {
                return res.status(400).json({
                    success: false,
                    message: 'A descrição deve ser um texto válido.'
                });
            }

            const atualizado = await processTemplateModel.atualizar(
                templateId,
                companyId,
                {
                    name: nomeValidado,
                    description: descricaoValidada
                }
            );

            if (!atualizado) {
                return res.status(404).json({
                    success: false,
                    message: 'Modelo não encontrado ou indisponível para edição.'
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Modelo atualizado com sucesso.'
            });

        } catch (error) {
            return responderErro(
                res,
                error,
                'Erro ao atualizar modelo de processo',
                {
                    duplicado: 'Já existe um modelo com esse nome.',
                    interno: 'Erro ao atualizar modelo de processo.'
                }
            );
        }
    },

    async atualizarStatus(req, res) {
        try {
            const companyId = req.empresa.company_id;
            const templateId = validarId(req.params.id);
            const { status } = req.body;

            if (!templateId) {
                return res.status(400).json({
                    success: false,
                    message: 'Identificador de modelo inválido.'
                });
            }

            if (!['active', 'inactive'].includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Status inválido.'
                });
            }

            const atualizado = await processTemplateModel.atualizarStatus(
                templateId,
                companyId,
                status
            );

            if (!atualizado) {
                return res.status(404).json({
                    success: false,
                    message: 'Modelo de processo não encontrado.'
                });
            }

            return res.status(200).json({
                success: true,
                message: status === 'active'
                    ? 'Modelo ativado com sucesso.'
                    : 'Modelo desativado com sucesso.'
            });

        } catch (error) {
            return responderErro(
                res,
                error,
                'Erro ao alterar status do modelo',
                {
                    interno: 'Erro ao alterar status do modelo.'
                }
            );
        }
    },

    async listarEtapas(req, res) {
        try {
            const companyId = req.empresa.company_id;
            const templateId = validarId(req.params.templateId);

            if (!templateId) {
                return res.status(400).json({
                    success: false,
                    message: 'Identificador de modelo inválido.'
                });
            }

            const template = await processTemplateModel.buscarPorId(
                templateId,
                companyId
            );

            if (!template) {
                return res.status(404).json({
                    success: false,
                    message: 'Modelo de processo não encontrado.'
                });
            }

            const etapas = await processTemplateModel.listarEtapas(
                templateId,
                companyId
            );

            return res.status(200).json({
                success: true,
                data: etapas
            });

        } catch (error) {
            return responderErro(
                res,
                error,
                'Erro ao listar etapas do modelo',
                {
                    interno: 'Erro ao buscar etapas do modelo.'
                }
            );
        }
    },

    async criarEtapa(req, res) {
        try {
            const companyId = req.empresa.company_id;
            const templateId = validarId(req.params.templateId);

            const {
                name,
                description,
                teamId,
                estimatedHours
            } = req.body;

            if (!templateId) {
                return res.status(400).json({
                    success: false,
                    message: 'Identificador de modelo inválido.'
                });
            }

            const nomeValidado = validarTexto(name);
            const descricaoValidada = validarDescricao(description);
            const equipeId = validarId(teamId);
            const horas = validarHoras(estimatedHours);

            if (!nomeValidado) {
                return res.status(400).json({
                    success: false,
                    message: 'Informe um nome válido para a etapa, com até 150 caracteres.'
                });
            }

            if (descricaoValidada === undefined) {
                return res.status(400).json({
                    success: false,
                    message: 'A descrição da etapa deve ser um texto válido.'
                });
            }

            if (!equipeId) {
                return res.status(400).json({
                    success: false,
                    message: 'Selecione uma equipe válida para a etapa.'
                });
            }

            if (horas === undefined) {
                return res.status(400).json({
                    success: false,
                    message: 'O prazo estimado deve ser um número maior ou igual a zero.'
                });
            }

            const etapa = await processTemplateModel.criarEtapa({
                templateId,
                companyId,
                name: nomeValidado,
                description: descricaoValidada,
                teamId: equipeId,
                estimatedHours: horas
            });

            return res.status(201).json({
                success: true,
                message: 'Etapa criada com sucesso.',
                data: etapa
            });

        } catch (error) {
            return responderErro(
                res,
                error,
                'Erro ao criar etapa',
                {
                    duplicado: 'Já existe uma etapa nessa posição.',
                    interno: 'Erro interno ao criar etapa.'
                }
            );
        }
    },

    async atualizarEtapa(req, res) {
        try {
            const companyId = req.empresa.company_id;
            const templateId = validarId(req.params.templateId);
            const stepId = validarId(req.params.stepId);

            const {
                name,
                description,
                teamId,
                estimatedHours
            } = req.body;

            if (!templateId || !stepId) {
                return res.status(400).json({
                    success: false,
                    message: 'Identificador de modelo ou etapa inválido.'
                });
            }

            const nomeValidado = validarTexto(name);
            const descricaoValidada = validarDescricao(description);
            const equipeId = validarId(teamId);
            const horas = validarHoras(estimatedHours);

            if (!nomeValidado) {
                return res.status(400).json({
                    success: false,
                    message: 'Informe um nome válido para a etapa, com até 150 caracteres.'
                });
            }

            if (descricaoValidada === undefined) {
                return res.status(400).json({
                    success: false,
                    message: 'A descrição da etapa deve ser um texto válido.'
                });
            }

            if (!equipeId) {
                return res.status(400).json({
                    success: false,
                    message: 'Selecione uma equipe válida para a etapa.'
                });
            }

            if (horas === undefined) {
                return res.status(400).json({
                    success: false,
                    message: 'O prazo estimado deve ser um número maior ou igual a zero.'
                });
            }

            const atualizado = await processTemplateModel.atualizarEtapa({
                id: stepId,
                templateId,
                companyId,
                name: nomeValidado,
                description: descricaoValidada,
                teamId: equipeId,
                estimatedHours: horas
            });

            if (!atualizado) {
                return res.status(404).json({
                    success: false,
                    message: 'Etapa não encontrada.'
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Etapa atualizada com sucesso.'
            });

        } catch (error) {
            return responderErro(
                res,
                error,
                'Erro ao atualizar etapa',
                {
                    interno: 'Erro interno ao atualizar etapa.'
                }
            );
        }
    },

    async removerEtapa(req, res) {
        try {
            const companyId = req.empresa.company_id;
            const templateId = validarId(req.params.templateId);
            const stepId = validarId(req.params.stepId);

            if (!templateId || !stepId) {
                return res.status(400).json({
                    success: false,
                    message: 'Identificador de modelo ou etapa inválido.'
                });
            }

            const removida = await processTemplateModel.removerEtapa(
                stepId,
                templateId,
                companyId
            );

            if (!removida) {
                return res.status(404).json({
                    success: false,
                    message: 'Etapa não encontrada.'
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Etapa removida com sucesso.'
            });

        } catch (error) {
            return responderErro(
                res,
                error,
                'Erro ao remover etapa',
                {
                    interno: 'Erro interno ao remover etapa.'
                }
            );
        }
    },

    async reordenarEtapas(req, res) {
        try {
            const companyId = req.empresa.company_id;
            const templateId = validarId(req.params.templateId);
            const { stepIds } = req.body;

            if (!templateId) {
                return res.status(400).json({
                    success: false,
                    message: 'Identificador de modelo inválido.'
                });
            }

            if (
                !Array.isArray(stepIds) ||
                stepIds.length === 0 ||
                !stepIds.every(id => Number.isSafeInteger(id) && id > 0) ||
                new Set(stepIds).size !== stepIds.length
            ) {
                return res.status(400).json({
                    success: false,
                    message: 'Informe uma lista válida de IDs de etapas, sem duplicações.'
                });
            }

            const resultado = await processTemplateModel.reordenarEtapas(
                templateId,
                companyId,
                stepIds
            );

            return res.status(200).json({
                success: true,
                message: 'Etapas reordenadas com sucesso.',
                data: resultado
            });

        } catch (error) {
            return responderErro(
                res,
                error,
                'Erro ao reordenar etapas',
                {
                    interno: 'Erro interno ao reordenar etapas.'
                }
            );
        }
    }

};

export default processTemplateController;
