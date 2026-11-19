
import conect from '../config/database.js';

function validarPaginacao(limit, offset) {
    const limite = Number(limit);
    const deslocamento = Number(offset);

    if (
        !Number.isSafeInteger(limite) ||
        limite < 1 ||
        limite > 100
    ) {
        throw new Error('LIMITE_INVALIDO');
    }

    if (
        !Number.isSafeInteger(deslocamento) ||
        deslocamento < 0
    ) {
        throw new Error('OFFSET_INVALIDO');
    }

    return {
        limit: limite,
        offset: deslocamento
    };
}

const processHistoryModel = {

    async registrar(connection, {
        processId,
        actorMemberId = null,
        fromStepId = null,
        toStepId = null,
        fromStepName = null,
        toStepName = null,
        eventType,
        description = null,
        metadata = null
    }) {
        const [result] = await connection.execute(
            `INSERT INTO process_history (
                process_id,
                actor_member_id,
                from_step_id,
                to_step_id,
                from_step_name,
                to_step_name,
                event_type,
                description,
                metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                processId,
                actorMemberId,
                fromStepId,
                toStepId,
                fromStepName,
                toStepName,
                eventType,
                description,
                metadata !== null
                    ? JSON.stringify(metadata)
                    : null
            ]
        );

        return result.insertId;
    },

    async listar(processId, companyId, {
        limit = 50,
        offset = 0
    } = {}) {
        const paginacao = validarPaginacao(limit, offset);

        const [rows] = await conect.execute(
            `SELECT
                ph.id,
                ph.process_id,
                ph.actor_member_id,
                ph.from_step_id,
                ph.to_step_id,
                ph.from_step_name,
                ph.to_step_name,
                ph.event_type,
                ph.description,
                ph.metadata,
                ph.created_at,

                u.name AS actor_name,
                u.avatar_url AS actor_avatar

            FROM process_history ph

            INNER JOIN processes p
                ON p.id = ph.process_id

            LEFT JOIN company_members cm
                ON cm.id = ph.actor_member_id
                AND cm.company_id = p.company_id

            LEFT JOIN users u
                ON u.id = cm.user_id

            WHERE ph.process_id = ?
              AND p.company_id = ?

            ORDER BY ph.created_at DESC, ph.id DESC

            LIMIT ? OFFSET ?`,
            [
                processId,
                companyId,
                paginacao.limit,
                paginacao.offset
            ]
        );

        return rows;
    },

    async contar(processId, companyId) {
        const [rows] = await conect.execute(
            `SELECT COUNT(*) AS total
             FROM process_history ph

             INNER JOIN processes p
                ON p.id = ph.process_id

             WHERE ph.process_id = ?
               AND p.company_id = ?`,
            [
                processId,
                companyId
            ]
        );

        return Number(rows[0]?.total ?? 0);
    },

    async buscarUltimo(processId, companyId) {
        const [rows] = await conect.execute(
            `SELECT
                ph.*,
                u.name AS actor_name

             FROM process_history ph

             INNER JOIN processes p
                ON p.id = ph.process_id

             LEFT JOIN company_members cm
                ON cm.id = ph.actor_member_id
                AND cm.company_id = p.company_id

             LEFT JOIN users u
                ON u.id = cm.user_id

             WHERE ph.process_id = ?
               AND p.company_id = ?

             ORDER BY ph.created_at DESC, ph.id DESC

             LIMIT 1`,
            [
                processId,
                companyId
            ]
        );

        return rows[0] || null;
    }

};

export default processHistoryModel;
