
import conect from '../config/database.js';

const demandHistoryModel = {

    async listar({
        demandId,
        companyId,
        memberId,
        role,
        limit,
        offset
    }) {

        // Verifica se a demanda pertence à empresa
        const [demandas] = await conect.execute(
            `SELECT
                id,
                requester_member_id,
                opened_by_member_id
             FROM demands
             WHERE id = ?
               AND company_id = ?
             LIMIT 1`,
            [demandId, companyId]
        );

        if (!demandas.length) {
            return null;
        }

        const demanda = demandas[0];

        // Colaboradores só podem consultar demandas próprias
        if (
            role === 'collaborator' &&
            String(demanda.requester_member_id) !== String(memberId) &&
            String(demanda.opened_by_member_id) !== String(memberId)
        ) {
            throw new Error('DEMAND_ACCESS_DENIED');
        }

        // Oculta eventos de mensagens internas para colaboradores
        const filtroInterno = role === 'collaborator'
            ? "AND dh.event_type <> 'demand.internal_message'"
            : '';

        // Contabiliza os registros para a paginação
        const [contagem] = await conect.execute(
            `SELECT COUNT(*) AS total
             FROM demand_history dh
             WHERE dh.demand_id = ?
             ${filtroInterno}`,
            [demandId]
        );

        // Busca os eventos mais recentes primeiro
        const [historico] = await conect.execute(
            `SELECT
                dh.id,
                dh.demand_id,
                dh.actor_member_id,
                dh.event_type,
                dh.description,
                dh.old_value,
                dh.new_value,
                dh.created_at,
                u.name AS actor_name,
                u.email AS actor_email
             FROM demand_history dh
             INNER JOIN demands d
                ON d.id = dh.demand_id
             LEFT JOIN company_members cm
                ON cm.id = dh.actor_member_id
                AND cm.company_id = d.company_id
             LEFT JOIN users u
                ON u.id = cm.user_id
             WHERE dh.demand_id = ?
               AND d.company_id = ?
               ${filtroInterno}
             ORDER BY dh.created_at DESC, dh.id DESC
             LIMIT ? OFFSET ?`,
            [demandId, companyId, limit, offset]
        );

        return {
            historico,
            total: Number(contagem[0].total)
        };
    }

};

export default demandHistoryModel;
