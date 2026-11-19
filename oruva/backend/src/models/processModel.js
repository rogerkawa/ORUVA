
import conect from '../config/database.js';
import processHistoryModel from './processHistoryModel.js';

const processModel = {

    // VALIDAÇÕES

    async validarMembro(connection, memberId, companyId) {
        const [rows] = await connection.execute(
            `SELECT id
             FROM company_members
             WHERE id = ?
               AND company_id = ?
             LIMIT 1`,
            [memberId, companyId]
        );

        if (!rows.length) {
            throw new Error('MEMBRO_INVALIDO');
        }

        return rows[0];
    },

    async validarEquipe(connection, teamId, companyId) {
        if (!teamId) return null;

        const [rows] = await connection.execute(
            `SELECT id, name
             FROM teams
             WHERE id = ?
               AND company_id = ?
               AND status = 'active'
             LIMIT 1`,
            [teamId, companyId]
        );

        if (!rows.length) {
            throw new Error('EQUIPE_INVALIDA');
        }

        return rows[0];
    },

    async validarDepartamento(connection, departmentId, companyId) {
        if (!departmentId) return null;

        const [rows] = await connection.execute(
            `SELECT id, name
             FROM departments
             WHERE id = ?
               AND company_id = ?
             LIMIT 1`,
            [departmentId, companyId]
        );

        if (!rows.length) {
            throw new Error('DEPARTAMENTO_INVALIDO');
        }

        return rows[0];
    },

    async validarDemanda(connection, demandId, companyId) {
        if (!demandId) return null;

        const [rows] = await connection.execute(
            `SELECT id, title, status
             FROM demands
             WHERE id = ?
               AND company_id = ?
             LIMIT 1
             FOR UPDATE`,
            [demandId, companyId]
        );

        if (!rows.length) {
            throw new Error('DEMANDA_NAO_ENCONTRADA');
        }

        const [processos] = await connection.execute(
            `SELECT id
             FROM processes
             WHERE demand_id = ?
               AND company_id = ?
             LIMIT 1`,
            [demandId, companyId]
        );

        if (processos.length) {
            throw new Error('DEMANDA_JA_VINCULADA');
        }

        return rows[0];
    },

    // GERAR NÚMERO DO PROCESSO

    gerarNumero() {
        const data = new Date();

        const ano = data.getFullYear();
        const mes = String(data.getMonth() + 1).padStart(2, '0');
        const dia = String(data.getDate()).padStart(2, '0');

        const identificador = `${Date.now()}${Math.floor(Math.random() * 10000)}`;

        return `PROC-${ano}${mes}${dia}-${identificador}`;
    },

    // BUSCAR PROCESSO POR ID

    async buscarPorId(id, companyId) {
        const [rows] = await conect.execute(
            `SELECT
                p.*,

                pt.name AS template_name,

                current_step.name AS current_step_name,
                current_step.step_order AS current_step_order,
                current_step.team_id AS current_step_team_id,

                current_step_team.name AS current_step_team_name,

                t.name AS team_name,
                d.name AS department_name,

                creator_user.name AS creator_name,

                demand.demand_number AS demand_number

             FROM processes p

             LEFT JOIN process_templates pt
                ON pt.id = p.template_id
               AND pt.company_id = p.company_id

             LEFT JOIN process_template_steps current_step
                ON current_step.id = p.current_step_id
               AND current_step.template_id = p.template_id

             LEFT JOIN teams current_step_team
                ON current_step_team.id = current_step.team_id
               AND current_step_team.company_id = p.company_id

             LEFT JOIN teams t
                ON t.id = p.team_id
               AND t.company_id = p.company_id

             LEFT JOIN departments d
                ON d.id = p.department_id
               AND d.company_id = p.company_id

             LEFT JOIN company_members creator
                ON creator.id = p.created_by_member_id
               AND creator.company_id = p.company_id

             LEFT JOIN users creator_user
                ON creator_user.id = creator.user_id

             LEFT JOIN demands demand
                ON demand.id = p.demand_id
               AND demand.company_id = p.company_id

             WHERE p.id = ?
               AND p.company_id = ?

             LIMIT 1`,
            [id, companyId]
        );

        return rows[0] || null;
    },

    // LISTAR PROCESSOS

    async listar(companyId, {
        status,
        priority,
        teamId,
        templateId,
        search,
        limit = 50,
        offset = 0
    } = {}) {
        let sql = `
            SELECT
                p.*,

                pt.name AS template_name,

                current_step.name AS current_step_name,
                current_step.step_order AS current_step_order,
                current_step.team_id AS current_step_team_id,

                current_step_team.name AS current_step_team_name,

                t.name AS team_name,

                creator_user.name AS creator_name

            FROM processes p

            LEFT JOIN process_templates pt
                ON pt.id = p.template_id
               AND pt.company_id = p.company_id

            LEFT JOIN process_template_steps current_step
                ON current_step.id = p.current_step_id
               AND current_step.template_id = p.template_id

            LEFT JOIN teams current_step_team
                ON current_step_team.id = current_step.team_id
               AND current_step_team.company_id = p.company_id

            LEFT JOIN teams t
                ON t.id = p.team_id
               AND t.company_id = p.company_id

            LEFT JOIN company_members creator
                ON creator.id = p.created_by_member_id
               AND creator.company_id = p.company_id

            LEFT JOIN users creator_user
                ON creator_user.id = creator.user_id

            WHERE p.company_id = ?
        `;

        const params = [companyId];

        if (status) {
            sql += ` AND p.status = ?`;
            params.push(status);
        }

        if (priority) {
            sql += ` AND p.priority = ?`;
            params.push(priority);
        }

        if (teamId) {
            sql += ` AND p.team_id = ?`;
            params.push(teamId);
        }

        if (templateId) {
            sql += ` AND p.template_id = ?`;
            params.push(templateId);
        }

        if (search) {
            sql += ` AND (
                p.title LIKE ?
                OR p.description LIKE ?
                OR p.process_number LIKE ?
            )`;

            const termo = `%${search}%`;

            params.push(termo, termo, termo);
        }

        const paginaLimit = Math.min(
            Math.max(Number.parseInt(limit, 10) || 50, 1),
            100
        );

        const paginaOffset = Math.max(
            Number.parseInt(offset, 10) || 0,
            0
        );

        sql += `
            ORDER BY p.created_at DESC
            LIMIT ? OFFSET ?
        `;

        params.push(paginaLimit, paginaOffset);

        const [rows] = await conect.execute(sql, params);

        return rows;
    },

    // CONTAR PROCESSOS

    async contar(companyId, {
        status,
        priority,
        teamId,
        templateId,
        search
    } = {}) {
        let sql = `
            SELECT COUNT(*) AS total
            FROM processes p
            WHERE p.company_id = ?
        `;

        const params = [companyId];

        if (status) {
            sql += ` AND p.status = ?`;
            params.push(status);
        }

        if (priority) {
            sql += ` AND p.priority = ?`;
            params.push(priority);
        }

        if (teamId) {
            sql += ` AND p.team_id = ?`;
            params.push(teamId);
        }

        if (templateId) {
            sql += ` AND p.template_id = ?`;
            params.push(templateId);
        }

        if (search) {
            sql += ` AND (
                p.title LIKE ?
                OR p.description LIKE ?
                OR p.process_number LIKE ?
            )`;

            const termo = `%${search}%`;

            params.push(termo, termo, termo);
        }

        const [rows] = await conect.execute(sql, params);

        return Number(rows[0]?.total ?? 0);
    },

    // CRIAR PROCESSO

    async criar({
        companyId,
        templateId,
        createdByMemberId,
        departmentId = null,
        teamId = null,
        demandId = null,
        title,
        description = null,
        priority = 'medium',
        dueAt = null
    }) {
        const connection = await conect.getConnection();

        try {
            await connection.beginTransaction();

            await this.validarMembro(
                connection,
                createdByMemberId,
                companyId
            );

            const [templates] = await connection.execute(
                `SELECT id, name, status
                 FROM process_templates
                 WHERE id = ?
                   AND company_id = ?
                 LIMIT 1
                 FOR UPDATE`,
                [templateId, companyId]
            );

            if (!templates.length) {
                throw new Error('MODELO_NAO_ENCONTRADO');
            }

            const template = templates[0];

            if (template.status !== 'active') {
                throw new Error('MODELO_INATIVO');
            }

            const [steps] = await connection.execute(
                `SELECT
                    pts.id,
                    pts.name,
                    pts.step_order,
                    pts.team_id,
                    t.id AS valid_team_id,
                    t.name AS team_name,
                    t.status AS team_status

                 FROM process_template_steps pts

                 LEFT JOIN teams t
                    ON t.id = pts.team_id
                   AND t.company_id = ?

                 WHERE pts.template_id = ?

                 ORDER BY pts.step_order ASC
                 LIMIT 1`,
                [companyId, templateId]
            );

            if (!steps.length) {
                throw new Error('MODELO_SEM_ETAPAS');
            }

            const primeiraEtapa = steps[0];

            if (
                !primeiraEtapa.valid_team_id ||
                primeiraEtapa.team_status !== 'active'
            ) {
                throw new Error('EQUIPE_DA_ETAPA_INVALIDA');
            }

            await this.validarDepartamento(
                connection,
                departmentId,
                companyId
            );

            await this.validarEquipe(
                connection,
                teamId,
                companyId
            );

            await this.validarDemanda(
                connection,
                demandId,
                companyId
            );

            const processNumber = this.gerarNumero();

            const [result] = await connection.execute(
                `INSERT INTO processes (
                    company_id,
                    template_id,
                    current_step_id,
                    created_by_member_id,
                    department_id,
                    team_id,
                    demand_id,
                    process_number,
                    title,
                    description,
                    origin,
                    priority,
                    status,
                    started_at,
                    due_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW(), ?)`,
                [
                    companyId,
                    templateId,
                    primeiraEtapa.id,
                    createdByMemberId,
                    departmentId,
                    teamId,
                    demandId,
                    processNumber,
                    title,
                    description,
                    demandId ? 'demand' : 'manual',
                    priority,
                    dueAt
                ]
            );

            await processHistoryModel.registrar(connection, {
                processId: result.insertId,
                actorMemberId: createdByMemberId,
                toStepId: primeiraEtapa.id,
                toStepName: primeiraEtapa.name,
                eventType: 'created',
                description: `Processo iniciado na etapa "${primeiraEtapa.name}".`,
                metadata: {
                    process_number: processNumber,
                    template_id: templateId,
                    template_name: template.name,
                    team_id: primeiraEtapa.team_id,
                    team_name: primeiraEtapa.team_name
                }
            });

            await connection.commit();

            return {
                id: result.insertId,
                processNumber,
                currentStep: {
                    id: primeiraEtapa.id,
                    name: primeiraEtapa.name,
                    order: primeiraEtapa.step_order,
                    teamId: primeiraEtapa.team_id,
                    teamName: primeiraEtapa.team_name
                }
            };

        } catch (error) {
            await connection.rollback();

            if (error.code === 'ER_DUP_ENTRY') {
                const mensagem = String(error.message || '');

                if (
                    demandId &&
                    mensagem.includes('uq_processes_company_demand')
                ) {
                    throw new Error('DEMANDA_JA_VINCULADA');
                }

                throw new Error('NUMERO_PROCESSO_DUPLICADO');
            }

            throw error;

        } finally {
            connection.release();
        }
    },

    // AVANÇAR ETAPA

    async avancarEtapa({
        id,
        companyId,
        actorMemberId,
        description = null
    }) {
        const connection = await conect.getConnection();

        try {
            await connection.beginTransaction();

            await this.validarMembro(
                connection,
                actorMemberId,
                companyId
            );

            const [rows] = await connection.execute(
                `SELECT
                    p.id,
                    p.status,
                    p.template_id,
                    p.current_step_id,

                    current_step.name AS current_step_name,
                    current_step.step_order AS current_step_order

                 FROM processes p

                 INNER JOIN process_templates pt
                    ON pt.id = p.template_id
                   AND pt.company_id = p.company_id

                 INNER JOIN process_template_steps current_step
                    ON current_step.id = p.current_step_id
                   AND current_step.template_id = p.template_id

                 WHERE p.id = ?
                   AND p.company_id = ?

                 LIMIT 1
                 FOR UPDATE`,
                [id, companyId]
            );

            if (!rows.length) {
                throw new Error('PROCESSO_NAO_ENCONTRADO');
            }

            const processo = rows[0];

            if (processo.status !== 'active') {
                throw new Error('PROCESSO_NAO_ATIVO');
            }

            const [nextSteps] = await connection.execute(
                `SELECT
                    pts.id,
                    pts.name,
                    pts.step_order,
                    pts.team_id,
                    t.id AS valid_team_id,
                    t.name AS team_name,
                    t.status AS team_status

                 FROM process_template_steps pts

                 INNER JOIN process_templates pt
                    ON pt.id = pts.template_id
                   AND pt.company_id = ?

                 LEFT JOIN teams t
                    ON t.id = pts.team_id
                   AND t.company_id = pt.company_id

                 WHERE pts.template_id = ?
                   AND pts.step_order > ?

                 ORDER BY pts.step_order ASC
                 LIMIT 1`,
                [
                    companyId,
                    processo.template_id,
                    processo.current_step_order
                ]
            );

            if (!nextSteps.length) {
                await connection.execute(
                    `UPDATE processes
                     SET status = 'completed',
                         completed_at = NOW()
                     WHERE id = ?
                       AND company_id = ?`,
                    [id, companyId]
                );

                await processHistoryModel.registrar(connection, {
                    processId: id,
                    actorMemberId,
                    fromStepId: processo.current_step_id,
                    fromStepName: processo.current_step_name,
                    eventType: 'completed',
                    description: description || 'Processo concluído.'
                });

                await connection.commit();

                return {
                    completed: true,
                    message: 'Processo concluído com sucesso.'
                };
            }

            const proximaEtapa = nextSteps[0];

            if (
                !proximaEtapa.valid_team_id ||
                proximaEtapa.team_status !== 'active'
            ) {
                throw new Error('EQUIPE_DA_ETAPA_INDISPONIVEL');
            }

            await connection.execute(
                `UPDATE processes
                 SET current_step_id = ?
                 WHERE id = ?
                   AND company_id = ?`,
                [
                    proximaEtapa.id,
                    id,
                    companyId
                ]
            );

            await processHistoryModel.registrar(connection, {
                processId: id,
                actorMemberId,
                fromStepId: processo.current_step_id,
                toStepId: proximaEtapa.id,
                fromStepName: processo.current_step_name,
                toStepName: proximaEtapa.name,
                eventType: 'step_changed',
                description: description || `Processo avançou para "${proximaEtapa.name}".`,
                metadata: {
                    team_id: proximaEtapa.team_id,
                    team_name: proximaEtapa.team_name
                }
            });

            await connection.commit();

            return {
                completed: false,
                currentStep: {
                    id: proximaEtapa.id,
                    name: proximaEtapa.name,
                    order: proximaEtapa.step_order,
                    teamId: proximaEtapa.team_id,
                    teamName: proximaEtapa.team_name
                }
            };

        } catch (error) {
            await connection.rollback();
            throw error;

        } finally {
            connection.release();
        }
    },

    // PAUSAR PROCESSO

    async pausar({
        id,
        companyId,
        actorMemberId,
        description = null
    }) {
        const connection = await conect.getConnection();

        try {
            await connection.beginTransaction();

            await this.validarMembro(
                connection,
                actorMemberId,
                companyId
            );

            const [rows] = await connection.execute(
                `SELECT id, status
                 FROM processes
                 WHERE id = ?
                   AND company_id = ?
                 LIMIT 1
                 FOR UPDATE`,
                [id, companyId]
            );

            if (!rows.length) {
                throw new Error('PROCESSO_NAO_ENCONTRADO');
            }

            if (rows[0].status !== 'active') {
                throw new Error('PROCESSO_NAO_ATIVO');
            }

            await connection.execute(
                `UPDATE processes
                 SET status = 'paused'
                 WHERE id = ?
                   AND company_id = ?`,
                [id, companyId]
            );

            await processHistoryModel.registrar(connection, {
                processId: id,
                actorMemberId,
                eventType: 'paused',
                description: description || 'Processo pausado.'
            });

            await connection.commit();

            return true;

        } catch (error) {
            await connection.rollback();
            throw error;

        } finally {
            connection.release();
        }
    },

    // RETOMAR PROCESSO

    async retomar({
        id,
        companyId,
        actorMemberId,
        description = null
    }) {
        const connection = await conect.getConnection();

        try {
            await connection.beginTransaction();

            await this.validarMembro(
                connection,
                actorMemberId,
                companyId
            );

            const [rows] = await connection.execute(
                `SELECT id, status
                 FROM processes
                 WHERE id = ?
                   AND company_id = ?
                 LIMIT 1
                 FOR UPDATE`,
                [id, companyId]
            );

            if (!rows.length) {
                throw new Error('PROCESSO_NAO_ENCONTRADO');
            }

            if (rows[0].status !== 'paused') {
                throw new Error('PROCESSO_NAO_PAUSADO');
            }

            await connection.execute(
                `UPDATE processes
                 SET status = 'active'
                 WHERE id = ?
                   AND company_id = ?`,
                [id, companyId]
            );

            await processHistoryModel.registrar(connection, {
                processId: id,
                actorMemberId,
                eventType: 'resumed',
                description: description || 'Processo retomado.'
            });

            await connection.commit();

            return true;

        } catch (error) {
            await connection.rollback();
            throw error;

        } finally {
            connection.release();
        }
    },

    // CONCLUIR PROCESSO

    async concluir({
        id,
        companyId,
        actorMemberId,
        description = null
    }) {
        const connection = await conect.getConnection();

        try {
            await connection.beginTransaction();

            await this.validarMembro(
                connection,
                actorMemberId,
                companyId
            );

            const [rows] = await connection.execute(
                `SELECT
                    p.id,
                    p.status,
                    p.template_id,
                    p.current_step_id,

                    current_step.name AS current_step_name,
                    current_step.step_order AS current_step_order

                 FROM processes p

                 INNER JOIN process_templates pt
                    ON pt.id = p.template_id
                   AND pt.company_id = p.company_id

                 INNER JOIN process_template_steps current_step
                    ON current_step.id = p.current_step_id
                   AND current_step.template_id = p.template_id

                 WHERE p.id = ?
                   AND p.company_id = ?

                 LIMIT 1
                 FOR UPDATE`,
                [id, companyId]
            );

            if (!rows.length) {
                throw new Error('PROCESSO_NAO_ENCONTRADO');
            }

            const processo = rows[0];

            if (processo.status !== 'active') {
                throw new Error('PROCESSO_NAO_ATIVO');
            }

            const [nextSteps] = await connection.execute(
                `SELECT pts.id
                 FROM process_template_steps pts

                 INNER JOIN process_templates pt
                    ON pt.id = pts.template_id
                   AND pt.company_id = ?

                 WHERE pts.template_id = ?
                   AND pts.step_order > ?

                 LIMIT 1`,
                [
                    companyId,
                    processo.template_id,
                    processo.current_step_order
                ]
            );

            if (nextSteps.length) {
                throw new Error('PROCESSO_COM_ETAPAS_PENDENTES');
            }

            await connection.execute(
                `UPDATE processes
                 SET status = 'completed',
                     completed_at = NOW()
                 WHERE id = ?
                   AND company_id = ?`,
                [id, companyId]
            );

            await processHistoryModel.registrar(connection, {
                processId: id,
                actorMemberId,
                fromStepId: processo.current_step_id,
                fromStepName: processo.current_step_name,
                eventType: 'completed',
                description: description || 'Processo concluído.'
            });

            await connection.commit();

            return true;

        } catch (error) {
            await connection.rollback();
            throw error;

        } finally {
            connection.release();
        }
    },

    // CANCELAR PROCESSO

    async cancelar({
        id,
        companyId,
        actorMemberId,
        description = null
    }) {
        const connection = await conect.getConnection();

        try {
            await connection.beginTransaction();

            await this.validarMembro(
                connection,
                actorMemberId,
                companyId
            );

            const [rows] = await connection.execute(
                `SELECT
                    p.id,
                    p.status,
                    p.current_step_id,
                    current_step.name AS current_step_name

                 FROM processes p

                 INNER JOIN process_templates pt
                    ON pt.id = p.template_id
                   AND pt.company_id = p.company_id

                 LEFT JOIN process_template_steps current_step
                    ON current_step.id = p.current_step_id
                   AND current_step.template_id = p.template_id

                 WHERE p.id = ?
                   AND p.company_id = ?

                 LIMIT 1
                 FOR UPDATE`,
                [id, companyId]
            );

            if (!rows.length) {
                throw new Error('PROCESSO_NAO_ENCONTRADO');
            }

            const processo = rows[0];

            if (!['active', 'paused'].includes(processo.status)) {
                throw new Error('PROCESSO_NAO_CANCELAVEL');
            }

            await connection.execute(
                `UPDATE processes
                 SET status = 'canceled',
                     canceled_at = NOW()
                 WHERE id = ?
                   AND company_id = ?`,
                [id, companyId]
            );

            await processHistoryModel.registrar(connection, {
                processId: id,
                actorMemberId,
                fromStepId: processo.current_step_id,
                fromStepName: processo.current_step_name,
                eventType: 'canceled',
                description: description || 'Processo cancelado.'
            });

            await connection.commit();

            return true;

        } catch (error) {
            await connection.rollback();
            throw error;

        } finally {
            connection.release();
        }
    }

};

export default processModel;
