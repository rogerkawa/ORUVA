import conect from '../config/database.js';

const slaPolicyModel = {

    // Listar políticas de SLA de uma empresa
    async listar(companyId) {
        const [resultado] = await conect.execute(
            `SELECT
                s.id,
                s.company_id,
                s.category_id,
                s.name,
                s.priority,
                s.first_response_minutes,
                s.resolution_minutes,
                s.pause_when_waiting,
                s.status,
                s.created_at,
                s.updated_at,
                c.name AS category_name
            FROM sla_policies s
            LEFT JOIN categories c
                ON c.id = s.category_id
                AND c.company_id = s.company_id
            WHERE s.company_id = ?
            ORDER BY
                FIELD(s.priority, 'critical', 'high', 'medium', 'low'),
                s.name ASC`,
            [companyId]
        );

        return resultado.map(categoria => ({
            ...categoria,
            pause_when_waiting: Boolean(categoria.pause_when_waiting)
        }));
    },

    // Buscar política pelo ID
    async buscarPorId(id, companyId) {
        const [resultado] = await conect.execute(
            `SELECT
                s.id,
                s.company_id,
                s.category_id,
                s.name,
                s.priority,
                s.first_response_minutes,
                s.resolution_minutes,
                s.pause_when_waiting,
                s.status,
                s.created_at,
                s.updated_at,
                c.name AS category_name
            FROM sla_policies s
            LEFT JOIN categories c
                ON c.id = s.category_id
                AND c.company_id = s.company_id
            WHERE s.id = ?
                AND s.company_id = ?
            LIMIT 1`,
            [id, companyId]
        );

        if (!resultado[0]) {
            return null;
        }

        return {
            ...resultado[0],
            pause_when_waiting: Boolean(resultado[0].pause_when_waiting)
        };
    },

    // Validar categoria
    async validarCategoria(categoryId, companyId) {
        if (categoryId === null) {
            return true;
        }

        const [resultado] = await conect.execute(
            `SELECT id
            FROM categories
            WHERE id = ?
                AND company_id = ?
                AND status = 'active'
            LIMIT 1`,
            [categoryId, companyId]
        );

        return resultado.length > 0;
    },

    // Criar política
    async criar({
        companyId,
        categoryId = null,
        name,
        priority,
        firstResponseMinutes,
        resolutionMinutes,
        pauseWhenWaiting = true
    }) {
        const categoriaValida = await this.validarCategoria(
            categoryId,
            companyId
        );

        if (!categoriaValida) {
            throw new Error('CATEGORIA_INVALIDA');
        }

        const [resultado] = await conect.execute(
            `INSERT INTO sla_policies (
                company_id,
                category_id,
                name,
                priority,
                first_response_minutes,
                resolution_minutes,
                pause_when_waiting
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                companyId,
                categoryId,
                name,
                priority,
                firstResponseMinutes,
                resolutionMinutes,
                pauseWhenWaiting
            ]
        );

        return resultado.insertId;
    },

    // Atualizar política
    async atualizar(id, companyId, {
        categoryId = null,
        name,
        priority,
        firstResponseMinutes,
        resolutionMinutes,
        pauseWhenWaiting = true
    }) {
        const categoriaValida = await this.validarCategoria(
            categoryId,
            companyId
        );

        if (!categoriaValida) {
            throw new Error('CATEGORIA_INVALIDA');
        }

        const [resultado] = await conect.execute(
            `UPDATE sla_policies
            SET
                category_id = ?,
                name = ?,
                priority = ?,
                first_response_minutes = ?,
                resolution_minutes = ?,
                pause_when_waiting = ?
            WHERE id = ?
                AND company_id = ?`,
            [
                categoryId,
                name,
                priority,
                firstResponseMinutes,
                resolutionMinutes,
                pauseWhenWaiting,
                id,
                companyId
            ]
        );

        return resultado.affectedRows > 0;
    },

    // Alterar status da política
    async atualizarStatus(id, companyId, status) {
        const [resultado] = await conect.execute(
            `UPDATE sla_policies
            SET status = ?
            WHERE id = ?
                AND company_id = ?`,
            [
                status,
                id,
                companyId
            ]
        );

        return resultado.affectedRows > 0;
    }

};

export default slaPolicyModel;