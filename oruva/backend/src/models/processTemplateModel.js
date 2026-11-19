
import conect from '../config/database.js';

const processTemplateModel = {

    // =====================================================
    // VALIDADORES
    // =====================================================

    async validarEquipe(connection, teamId, companyId) {
        if (!teamId) {
            throw new Error('EQUIPE_INVALIDA');
        }

        const [rows] = await connection.execute(
            `SELECT id
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

        return true;
    },

    async validarMembro(connection, memberId, companyId) {
        const [rows] = await connection.execute(
            `SELECT id
             FROM company_members
             WHERE id = ?
               AND company_id = ?
               AND status = 'active'
             LIMIT 1`,
            [memberId, companyId]
        );

        if (!rows.length) {
            throw new Error('MEMBRO_INVALIDO');
        }

        return true;
    },

    async bloquearSeProcessosEmAndamento(connection, templateId) {
        const [rows] = await connection.execute(
            `SELECT id
             FROM processes
             WHERE template_id = ?
               AND status IN ('active', 'paused')
             LIMIT 1`,
            [templateId]
        );

        if (rows.length) {
            throw new Error('MODELO_COM_PROCESSOS_EM_ANDAMENTO');
        }
    },

    async buscarModelo(connection, templateId, companyId, lock = false) {
        const [rows] = await connection.execute(
            `SELECT id, name, status
             FROM process_templates
             WHERE id = ?
               AND company_id = ?
             LIMIT 1
             ${lock ? 'FOR UPDATE' : ''}`,
            [templateId, companyId]
        );

        return rows[0] || null;
    },

    // =====================================================
    // BUSCAR MODELO
    // =====================================================

    async buscarPorId(id, companyId) {
        const [rows] = await conect.execute(
            `SELECT
                pt.*,
                u.name AS creator_name,

                (
                    SELECT COUNT(*)
                    FROM process_template_steps pts
                    WHERE pts.template_id = pt.id
                ) AS steps_count,

                (
                    SELECT COUNT(*)
                    FROM processes p
                    WHERE p.template_id = pt.id
                ) AS processes_count

             FROM process_templates pt

             INNER JOIN company_members cm
                ON cm.id = pt.created_by_member_id

             INNER JOIN users u
                ON u.id = cm.user_id

             WHERE pt.id = ?
               AND pt.company_id = ?

             LIMIT 1`,
            [id, companyId]
        );

        return rows[0] || null;
    },

    // =====================================================
    // LISTAR MODELOS
    // =====================================================

    async listar(companyId, {
        status = null,
        search = null
    } = {}) {
        let sql = `
            SELECT
                pt.id,
                pt.company_id,
                pt.created_by_member_id,
                pt.name,
                pt.description,
                pt.status,
                pt.created_at,
                pt.updated_at,

                u.name AS creator_name,

                COUNT(DISTINCT pts.id) AS steps_count,
                COUNT(DISTINCT p.id) AS processes_count

            FROM process_templates pt

            INNER JOIN company_members cm
                ON cm.id = pt.created_by_member_id

            INNER JOIN users u
                ON u.id = cm.user_id

            LEFT JOIN process_template_steps pts
                ON pts.template_id = pt.id

            LEFT JOIN processes p
                ON p.template_id = pt.id

            WHERE pt.company_id = ?
        `;

        const params = [companyId];

        if (status) {
            sql += ` AND pt.status = ?`;
            params.push(status);
        }

        if (search) {
            sql += ` AND pt.name LIKE ?`;
            params.push(`%${search}%`);
        }

        sql += `
            GROUP BY
                pt.id,
                pt.company_id,
                pt.created_by_member_id,
                pt.name,
                pt.description,
                pt.status,
                pt.created_at,
                pt.updated_at,
                u.name

            ORDER BY pt.created_at DESC
        `;

        const [rows] = await conect.execute(sql, params);

        return rows;
    },

    // =====================================================
    // CRIAR MODELO
    // =====================================================

    async criar({
        companyId,
        createdByMemberId,
        name,
        description = null
    }) {
        const connection = await conect.getConnection();

        try {
            await connection.beginTransaction();

            await this.validarMembro(
                connection,
                createdByMemberId,
                companyId
            );

            const [result] = await connection.execute(
                `INSERT INTO process_templates (
                    company_id,
                    created_by_member_id,
                    name,
                    description
                ) VALUES (?, ?, ?, ?)`,
                [
                    companyId,
                    createdByMemberId,
                    name,
                    description
                ]
            );

            await connection.commit();

            return result.insertId;

        } catch (error) {
            await connection.rollback();
            throw error;

        } finally {
            connection.release();
        }
    },

    // =====================================================
    // ATUALIZAR MODELO
    // =====================================================

    async atualizar(id, companyId, {
        name,
        description = null
    }) {
        const [result] = await conect.execute(
            `UPDATE process_templates
             SET
                name = ?,
                description = ?
             WHERE id = ?
               AND company_id = ?
               AND status = 'active'`,
            [
                name,
                description,
                id,
                companyId
            ]
        );

        return result.affectedRows > 0;
    },

    // =====================================================
    // ATUALIZAR STATUS
    // =====================================================

    async atualizarStatus(id, companyId, status) {
        const [result] = await conect.execute(
            `UPDATE process_templates
             SET status = ?
             WHERE id = ?
               AND company_id = ?`,
            [
                status,
                id,
                companyId
            ]
        );

        return result.affectedRows > 0;
    },

    // =====================================================
    // LISTAR ETAPAS
    // =====================================================

    async listarEtapas(templateId, companyId) {
        const [rows] = await conect.execute(
            `SELECT
                pts.id,
                pts.template_id,
                pts.team_id,
                pts.name,
                pts.description,
                pts.step_order,
                pts.estimated_hours,
                pts.created_at,

                t.name AS team_name

             FROM process_template_steps pts

             INNER JOIN process_templates pt
                ON pt.id = pts.template_id

             LEFT JOIN teams t
                ON t.id = pts.team_id

             WHERE pts.template_id = ?
               AND pt.company_id = ?

             ORDER BY pts.step_order ASC`,
            [
                templateId,
                companyId
            ]
        );

        return rows;
    },

    // =====================================================
    // CRIAR ETAPA
    // =====================================================

    async criarEtapa({
        templateId,
        companyId,
        teamId,
        name,
        description = null,
        estimatedHours = null
    }) {
        const connection = await conect.getConnection();

        try {
            await connection.beginTransaction();

            const template = await this.buscarModelo(
                connection,
                templateId,
                companyId,
                true
            );

            if (!template) {
                throw new Error('MODELO_NAO_ENCONTRADO');
            }

            if (template.status !== 'active') {
                throw new Error('MODELO_INATIVO');
            }

            await this.bloquearSeProcessosEmAndamento(
                connection,
                templateId
            );

            await this.validarEquipe(
                connection,
                teamId,
                companyId
            );

            const [lastStep] = await connection.execute(
                `SELECT COALESCE(MAX(step_order), 0) + 1 AS next_order
                 FROM process_template_steps
                 WHERE template_id = ?`,
                [templateId]
            );

            const stepOrder = lastStep[0].next_order;

            const [result] = await connection.execute(
                `INSERT INTO process_template_steps (
                    template_id,
                    team_id,
                    name,
                    description,
                    step_order,
                    estimated_hours
                ) VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    templateId,
                    teamId,
                    name,
                    description,
                    stepOrder,
                    estimatedHours
                ]
            );

            await connection.commit();

            return result.insertId;

        } catch (error) {
            await connection.rollback();
            throw error;

        } finally {
            connection.release();
        }
    },

    // =====================================================
    // ATUALIZAR ETAPA
    // =====================================================

    async atualizarEtapa({
        id,
        templateId,
        companyId,
        teamId,
        name,
        description = null,
        estimatedHours = null
    }) {
        const connection = await conect.getConnection();

        try {
            await connection.beginTransaction();

            const template = await this.buscarModelo(
                connection,
                templateId,
                companyId,
                true
            );

            if (!template) {
                throw new Error('MODELO_NAO_ENCONTRADO');
            }

            if (template.status !== 'active') {
                throw new Error('MODELO_INATIVO');
            }

            await this.bloquearSeProcessosEmAndamento(
                connection,
                templateId
            );

            const [steps] = await connection.execute(
                `SELECT pts.id
                 FROM process_template_steps pts

                 WHERE pts.id = ?
                   AND pts.template_id = ?

                 LIMIT 1
                 FOR UPDATE`,
                [
                    id,
                    templateId
                ]
            );

            if (!steps.length) {
                throw new Error('ETAPA_NAO_ENCONTRADA');
            }

            await this.validarEquipe(
                connection,
                teamId,
                companyId
            );

            const [result] = await connection.execute(
                `UPDATE process_template_steps
                 SET
                    team_id = ?,
                    name = ?,
                    description = ?,
                    estimated_hours = ?

                 WHERE id = ?
                   AND template_id = ?`,
                [
                    teamId,
                    name,
                    description,
                    estimatedHours,
                    id,
                    templateId
                ]
            );

            await connection.commit();

            return result.affectedRows > 0;

        } catch (error) {
            await connection.rollback();
            throw error;

        } finally {
            connection.release();
        }
    },

    // =====================================================
    // REMOVER ETAPA
    // =====================================================

    async removerEtapa(id, templateId, companyId) {
        const connection = await conect.getConnection();

        try {
            await connection.beginTransaction();

            const template = await this.buscarModelo(
                connection,
                templateId,
                companyId,
                true
            );

            if (!template) {
                throw new Error('MODELO_NAO_ENCONTRADO');
            }

            const [steps] = await connection.execute(
                `SELECT id
                 FROM process_template_steps
                 WHERE id = ?
                   AND template_id = ?
                 LIMIT 1
                 FOR UPDATE`,
                [
                    id,
                    templateId
                ]
            );

            if (!steps.length) {
                throw new Error('ETAPA_NAO_ENCONTRADA');
            }

            // Não permitir remover etapas de modelos
            // que já possuem processos associados.
            const [processes] = await connection.execute(
                `SELECT id
                 FROM processes
                 WHERE template_id = ?
                 LIMIT 1`,
                [templateId]
            );

            if (processes.length) {
                throw new Error('ETAPA_EM_USO');
            }

            await connection.execute(
                `DELETE FROM process_template_steps
                 WHERE id = ?
                   AND template_id = ?`,
                [
                    id,
                    templateId
                ]
            );

            // Reorganizar a ordem das etapas restantes.
            const [remaining] = await connection.execute(
                `SELECT id
                 FROM process_template_steps
                 WHERE template_id = ?
                 ORDER BY step_order ASC
                 FOR UPDATE`,
                [templateId]
            );

            // Utilizar posições temporárias evita
            // colisões com a constraint UNIQUE.
            for (let index = 0; index < remaining.length; index++) {
                await connection.execute(
                    `UPDATE process_template_steps
                     SET step_order = ?
                     WHERE id = ?`,
                    [
                        1000000 + index,
                        remaining[index].id
                    ]
                );
            }

            for (let index = 0; index < remaining.length; index++) {
                await connection.execute(
                    `UPDATE process_template_steps
                     SET step_order = ?
                     WHERE id = ?`,
                    [
                        index + 1,
                        remaining[index].id
                    ]
                );
            }

            await connection.commit();

            return true;

        } catch (error) {
            await connection.rollback();
            throw error;

        } finally {
            connection.release();
        }
    },

    // =====================================================
    // REORDENAR ETAPAS
    // =====================================================

    async reordenarEtapas(templateId, companyId, orderedIds) {
        const connection = await conect.getConnection();

        try {
            await connection.beginTransaction();

            const template = await this.buscarModelo(
                connection,
                templateId,
                companyId,
                true
            );

            if (!template) {
                throw new Error('MODELO_NAO_ENCONTRADO');
            }

            if (template.status !== 'active') {
                throw new Error('MODELO_INATIVO');
            }

            await this.bloquearSeProcessosEmAndamento(
                connection,
                templateId
            );

            const [steps] = await connection.execute(
                `SELECT id
                 FROM process_template_steps
                 WHERE template_id = ?
                 ORDER BY step_order ASC
                 FOR UPDATE`,
                [templateId]
            );

            const existingIds = steps.map(step => String(step.id));
            const requestedIds = orderedIds.map(String);

            if (
                existingIds.length !== requestedIds.length ||
                new Set(requestedIds).size !== requestedIds.length ||
                !requestedIds.every(id => existingIds.includes(id))
            ) {
                throw new Error('ORDEM_ETAPAS_INVALIDA');
            }

            // Posições temporárias para evitar conflito UNIQUE.
            for (let index = 0; index < requestedIds.length; index++) {
                await connection.execute(
                    `UPDATE process_template_steps
                     SET step_order = ?
                     WHERE id = ?
                       AND template_id = ?`,
                    [
                        1000000 + index,
                        requestedIds[index],
                        templateId
                    ]
                );
            }

            // Aplicar nova ordem.
            for (let index = 0; index < requestedIds.length; index++) {
                await connection.execute(
                    `UPDATE process_template_steps
                     SET step_order = ?
                     WHERE id = ?
                       AND template_id = ?`,
                    [
                        index + 1,
                        requestedIds[index],
                        templateId
                    ]
                );
            }

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

export default processTemplateModel;
