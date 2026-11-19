
import processModel from '../models/processModel.js';
import processHistoryModel from '../models/processHistoryModel.js';

function validarId(valor) {
    const numero = Number(valor);

    return Number.isInteger(numero) && numero > 0;
}

function normalizarIdOpcional(valor) {
    if (valor === undefined || valor === null || valor === '') {
        return { valido: true, valor: null };
    }

    if (!validarId(valor)) {
        return { valido: false, valor: null };
    }

    return {
        valido: true,
        valor: Number(valor)
    };
}

function validarTextoOpcional(valor) {
    if (valor === undefined || valor === null) {
        return { valido: true, valor: null };
    }

    if (typeof valor !== 'string') {
        return { valido: false, valor: null };
    }

    return {
        valido: true,
        valor: valor.trim() || null
    };
}


function responderErroOperacao(res, error, mensagem) {
    console.error(mensagem, error);

    const codigo = error.code || error.message;

    const erros = {
        PROCESSO_NAO_ENCONTRADO: {
            status: 404,
            message: 'Processo não encontrado.'
        },

        MODELO_NAO_ENCONTRADO: {
            status: 404,
            message: 'Modelo de processo não encontrado.'
        },

        DEMANDA_NAO_ENCONTRADA: {
            status: 404,
            message: 'Solicitação não encontrada.'
        },

        MEMBRO_INVALIDO: {
            status: 403,
            message: 'Seu vínculo com a empresa não é válido.'
        },

        DEMANDA_JA_VINCULADA: {
            status: 409,
            message: 'Esta solicitação já está vinculada a um processo.'
        },

        MODELO_INATIVO: {
            status: 409,
            message: 'Este modelo está desativado.'
        },

        MODELO_SEM_ETAPAS: {
            status: 409,
            message: 'O modelo precisa ter pelo menos uma etapa.'
        },

        PROCESSO_NAO_ATIVO: {
            status: 409,
            message: 'Este processo não está ativo.'
        },

        PROCESSO_NAO_PAUSADO: {
            status: 409,
            message: 'Este processo não está pausado.'
        },

        PROCESSO_COM_ETAPAS_PENDENTES: {
            status: 409,
            message: 'O processo ainda possui etapas pendentes.'
        },

        PROCESSO_NAO_CANCELAVEL: {
            status: 409,
            message: 'Este processo não pode mais ser cancelado.'
        },

        EQUIPE_INVALIDA: {
            status: 400,
            message: 'A equipe informada é inválida ou está inativa.'
        },

        DEPARTAMENTO_INVALIDO: {
            status: 400,
            message: 'O departamento informado é inválido.'
        },

        NUMERO_PROCESSO_DUPLICADO: {
            status: 409,
            message: 'Não foi possível gerar um número exclusivo para o processo. Tente novamente.'
        },
        EQUIPE_DA_ETAPA_INVALIDA: {
            status: 409,
            message: 'A equipe responsável pela primeira etapa está indisponível.'
        },

        EQUIPE_DA_ETAPA_INDISPONIVEL: {
            status: 409,
            message: 'A equipe responsável pela próxima etapa está indisponível.'
        }
    };

    const erroConhecido = erros[codigo];

    if (erroConhecido) {
        return res.status(erroConhecido.status).json({
            success: false,
            message: erroConhecido.message
        });
    }

    if (error.status && [400, 404, 409, 422].includes(error.status)) {
        return res.status(error.status).json({
            success: false,
            message: error.message
        });
    }

    return res.status(500).json({
        success: false,
        message: 'Ocorreu um erro interno ao processar a operação.'
    });
}


const processController = {

    async listar(req, res) {
        try {
            const companyId = req.empresa.company_id;

            const {
                status,
                priority,
                teamId,
                templateId,
                search,
                page = 1,
                limit = 50
            } = req.query;

            const pagina = Math.max(1, Number(page) || 1);
            const limite = Math.min(100, Math.max(1, Number(limit) || 50));

            if (
                !Number.isSafeInteger(pagina) ||
                !Number.isFinite(limite)
            ) {
                return res.status(400).json({
                    success: false,
                    message: 'Parâmetros de paginação inválidos.'
                });
            }

            if (teamId && !validarId(teamId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Identificador de equipe inválido.'
                });
            }

            if (templateId && !validarId(templateId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Identificador de modelo inválido.'
                });
            }

            if (
                search !== undefined &&
                typeof search !== 'string'
            ) {
                return res.status(400).json({
                    success: false,
                    message: 'O filtro de pesquisa é inválido.'
                });
            }

            const offset = (pagina - 1) * limite;

            const filtros = {
                status,
                priority,
                teamId,
                templateId,
                search: search?.trim() || undefined,
                limit: limite,
                offset
            };

            const [processos, total] = await Promise.all([
                processModel.listar(companyId, filtros),
                processModel.contar(companyId, filtros)
            ]);

            return res.status(200).json({
                success: true,
                data: processos,
                pagination: {
                    page: pagina,
                    limit: limite,
                    total,
                    totalPages: Math.ceil(total / limite)
                }
            });

        } catch (error) {
            console.error('Erro ao listar processos:', error);

            return res.status(500).json({
                success: false,
                message: 'Erro ao buscar processos.'
            });
        }
    },

    async buscarPorId(req, res) {
        try {
            const companyId = req.empresa.company_id;
            const { id } = req.params;

            if (!validarId(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Identificador de processo inválido.'
                });
            }

            const processo = await processModel.buscarPorId(
                id,
                companyId
            );

            if (!processo) {
                return res.status(404).json({
                    success: false,
                    message: 'Processo não encontrado.'
                });
            }

            return res.status(200).json({
                success: true,
                data: processo
            });

        } catch (error) {
            console.error('Erro ao buscar processo:', error);

            return res.status(500).json({
                success: false,
                message: 'Erro ao buscar processo.'
            });
        }
    },

    async criar(req, res) {
        try {
            const companyId = req.empresa.company_id;
            const createdByMemberId = req.empresa.company_member_id;

            const {
                templateId,
                departmentId,
                teamId,
                demandId,
                title,
                description,
                priority = 'medium',
                dueAt
            } = req.body || {};

            if (!validarId(templateId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Selecione um modelo de processo válido.'
                });
            }

            if (typeof title !== 'string' || !title.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'Informe o título do processo.'
                });
            }

            if (title.trim().length > 200) {
                return res.status(400).json({
                    success: false,
                    message: 'O título deve ter no máximo 200 caracteres.'
                });
            }

            const prioridades = [
                'low',
                'medium',
                'high',
                'critical'
            ];

            if (!prioridades.includes(priority)) {
                return res.status(400).json({
                    success: false,
                    message: 'Prioridade inválida.'
                });
            }

            const departamento = normalizarIdOpcional(departmentId);
            const equipe = normalizarIdOpcional(teamId);
            const demanda = normalizarIdOpcional(demandId);
            const descricao = validarTextoOpcional(description);

            if (
                !departamento.valido ||
                !equipe.valido ||
                !demanda.valido
            ) {
                return res.status(400).json({
                    success: false,
                    message: 'Um dos identificadores informados é inválido.'
                });
            }

            if (!descricao.valido) {
                return res.status(400).json({
                    success: false,
                    message: 'A descrição deve ser um texto válido.'
                });
            }

            if (
                dueAt !== undefined &&
                dueAt !== null &&
                dueAt !== '' &&
                (
                    typeof dueAt !== 'string' ||
                    Number.isNaN(Date.parse(dueAt))
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message: 'A data de vencimento é inválida.'
                });
            }

            const processo = await processModel.criar({
                companyId,
                templateId: Number(templateId),
                createdByMemberId,
                departmentId: departamento.valor,
                teamId: equipe.valor,
                demandId: demanda.valor,
                title: title.trim(),
                description: descricao.valor,
                priority,
                dueAt: dueAt || null
            });

            return res.status(201).json({
                success: true,
                message: 'Processo criado com sucesso.',
                data: processo
            });

        } catch (error) {
            return responderErroOperacao(
                res,
                error,
                'Erro ao criar processo:'
            );
        }
    },

    async avancarEtapa(req, res) {
        try {
            const companyId = req.empresa.company_id;
            const actorMemberId = req.empresa.company_member_id;
            const { id } = req.params;
            const { description } = req.body || {};

            if (!validarId(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Identificador de processo inválido.'
                });
            }

            const descricao = validarTextoOpcional(description);

            if (!descricao.valido) {
                return res.status(400).json({
                    success: false,
                    message: 'A descrição deve ser um texto válido.'
                });
            }

            const resultado = await processModel.avancarEtapa({
                id,
                companyId,
                actorMemberId,
                description: descricao.valor
            });

            return res.status(200).json({
                success: true,
                message: resultado.message ||
                    (resultado.completed
                        ? 'Processo concluído com sucesso.'
                        : 'Processo avançou para a próxima etapa.'),
                data: resultado
            });

        } catch (error) {
            return responderErroOperacao(
                res,
                error,
                'Erro ao avançar processo:'
            );
        }
    },

    async pausar(req, res) {
        try {
            const companyId = req.empresa.company_id;
            const actorMemberId = req.empresa.company_member_id;
            const { id } = req.params;
            const { description } = req.body || {};

            if (!validarId(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Identificador de processo inválido.'
                });
            }

            const descricao = validarTextoOpcional(description);

            if (!descricao.valido) {
                return res.status(400).json({
                    success: false,
                    message: 'A descrição deve ser um texto válido.'
                });
            }

            await processModel.pausar({
                id,
                companyId,
                actorMemberId,
                description: descricao.valor
            });

            return res.status(200).json({
                success: true,
                message: 'Processo pausado com sucesso.'
            });

        } catch (error) {
            return responderErroOperacao(
                res,
                error,
                'Erro ao pausar processo:'
            );
        }
    },

    async retomar(req, res) {
        try {
            const companyId = req.empresa.company_id;
            const actorMemberId = req.empresa.company_member_id;
            const { id } = req.params;
            const { description } = req.body || {};

            if (!validarId(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Identificador de processo inválido.'
                });
            }

            const descricao = validarTextoOpcional(description);

            if (!descricao.valido) {
                return res.status(400).json({
                    success: false,
                    message: 'A descrição deve ser um texto válido.'
                });
            }

            await processModel.retomar({
                id,
                companyId,
                actorMemberId,
                description: descricao.valor
            });

            return res.status(200).json({
                success: true,
                message: 'Processo retomado com sucesso.'
            });

        } catch (error) {
            return responderErroOperacao(
                res,
                error,
                'Erro ao retomar processo:'
            );
        }
    },

    async concluir(req, res) {
        try {
            const companyId = req.empresa.company_id;
            const actorMemberId = req.empresa.company_member_id;
            const { id } = req.params;
            const { description } = req.body || {};

            if (!validarId(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Identificador de processo inválido.'
                });
            }

            const descricao = validarTextoOpcional(description);

            if (!descricao.valido) {
                return res.status(400).json({
                    success: false,
                    message: 'A descrição deve ser um texto válido.'
                });
            }

            await processModel.concluir({
                id,
                companyId,
                actorMemberId,
                description: descricao.valor
            });

            return res.status(200).json({
                success: true,
                message: 'Processo concluído com sucesso.'
            });

        } catch (error) {
            return responderErroOperacao(
                res,
                error,
                'Erro ao concluir processo:'
            );
        }
    },

    async cancelar(req, res) {
        try {
            const companyId = req.empresa.company_id;
            const actorMemberId = req.empresa.company_member_id;
            const { id } = req.params;
            const { description } = req.body || {};

            if (!validarId(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Identificador de processo inválido.'
                });
            }

            if (
                typeof description !== 'string' ||
                !description.trim()
            ) {
                return res.status(400).json({
                    success: false,
                    message: 'Informe o motivo do cancelamento.'
                });
            }

            await processModel.cancelar({
                id,
                companyId,
                actorMemberId,
                description: description.trim()
            });

            return res.status(200).json({
                success: true,
                message: 'Processo cancelado com sucesso.'
            });

        } catch (error) {
            return responderErroOperacao(
                res,
                error,
                'Erro ao cancelar processo:'
            );
        }
    },

    async listarHistorico(req, res) {
        try {
            const companyId = req.empresa.company_id;
            const { id } = req.params;

            if (!validarId(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Identificador de processo inválido.'
                });
            }

            const page = Math.max(
                1,
                Number(req.query.page) || 1
            );

            const limit = Math.min(
                100,
                Math.max(1, Number(req.query.limit) || 50)
            );

            if (!Number.isSafeInteger(page)) {
                return res.status(400).json({
                    success: false,
                    message: 'Parâmetro de página inválido.'
                });
            }

            const offset = (page - 1) * limit;

            const processo = await processModel.buscarPorId(
                id,
                companyId
            );

            if (!processo) {
                return res.status(404).json({
                    success: false,
                    message: 'Processo não encontrado.'
                });
            }

            const [historico, total] = await Promise.all([
                processHistoryModel.listar(id, companyId, {
                    limit,
                    offset
                }),
                processHistoryModel.contar(id, companyId)
            ]);

            return res.status(200).json({
                success: true,
                data: historico,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            });

        } catch (error) {
            console.error('Erro ao buscar histórico:', error);

            return res.status(500).json({
                success: false,
                message: 'Erro ao buscar histórico do processo.'
            });
        }
    }

};

export default processController;
