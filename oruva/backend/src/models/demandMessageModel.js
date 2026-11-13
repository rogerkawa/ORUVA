
import conect from '../config/database.js';

const demandMessageModel = {

    // Verificar se o membro pode acessar a demanda.
    async validarAcesso(connection, {
        demandId,
        companyId,
        memberId,
        role,
        lock = false
    }) {
        const conditions = [
            'd.id = ?',
            'd.company_id = ?'
        ];

        const params = [demandId, companyId];

        // Colaboradores só acessam suas próprias demandas.
        if (role === 'collaborator') {
            conditions.push(
                '(d.requester_member_id = ? OR d.opened_by_member_id = ?)'
            );

            params.push(memberId, memberId);
        }

        const [rows] = await connection.execute(
            `SELECT
                d.id,
                d.status,
                d.first_responded_at
             FROM demands d
             WHERE ${conditions.join(' AND ')}
             LIMIT 1
             ${lock ? 'FOR UPDATE' : ''}`,
            params
        );

        return rows[0] || null;
    },

    // Listar mensagens de uma demanda.
    async listar({
        demandId,
        companyId,
        memberId,
        role,
        limit = 20,
        offset = 0
    }) {
        const demand = await this.validarAcesso(conect, {
            demandId,
            companyId,
            memberId,
            role,
            lock: true
        });

        if (!demand) {
            const error = new Error('Demanda não encontrada.');
            error.code = 'DEMAND_NOT_FOUND';
            throw error;
        }

        const conditions = [
            'dm.demand_id = ?'
        ];

        const params = [demandId];

        // Colaboradores não podem visualizar comentários internos.
        if (role === 'collaborator') {
            conditions.push("dm.visibility = 'public'");
        }

        const where = conditions.join(' AND ');

        const [messages] = await conect.execute(
            `SELECT
                CAST(dm.id AS CHAR) AS id,
                CAST(dm.demand_id AS CHAR) AS demand_id,
                CAST(dm.author_member_id AS CHAR) AS author_member_id,
                dm.message,
                dm.visibility,
                dm.created_at,

                u.name AS author_name,
                u.avatar_url AS author_avatar

             FROM demand_messages dm

             INNER JOIN company_members cm
                ON cm.id = dm.author_member_id

             INNER JOIN users u
                ON u.id = cm.user_id

             WHERE ${where}

             ORDER BY dm.created_at ASC, dm.id ASC

             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        const [countRows] = await conect.execute(
            `SELECT COUNT(*) AS total
             FROM demand_messages dm
             WHERE ${where}`,
            params
        );

        return {
            messages,
            total: Number(countRows[0].total),
            limit,
            offset
        };
    },

    // Enviar mensagem em uma demanda.
    async criar({
        demandId,
        companyId,
        memberId,
        role,
        message,
        visibility = 'public'
    }) {
        const connection = await conect.getConnection();

        try {
            await connection.beginTransaction();

            // Bloquear a demanda durante a operação.
            const demand = await this.validarAcesso(connection, {
                demandId,
                companyId,
                memberId,
                role
            });

            if (!demand) {
                const error = new Error('Demanda não encontrada.');
                error.code = 'DEMAND_NOT_FOUND';
                throw error;
            }

            // Impedir novas mensagens em demandas encerradas.
            if (['closed', 'canceled'].includes(demand.status)) {
                const error = new Error(
                    'Não é possível enviar mensagens em demandas encerradas ou canceladas.'
                );
                error.code = 'DEMAND_NOT_AVAILABLE';
                throw error;
            }

            // Garantir que o autor ainda é um membro ativo.
            const [members] = await connection.execute(
                `SELECT id
                 FROM company_members
                 WHERE id = ?
                   AND company_id = ?
                   AND status = 'active'
                 LIMIT 1`,
                [memberId, companyId]
            );

            if (!members.length) {
                const error = new Error(
                    'Membro não encontrado ou inativo.'
                );
                error.code = 'MEMBER_NOT_FOUND';
                throw error;
            }

            // Inserir mensagem.
            await connection.execute(
                `INSERT INTO demand_messages (
                    demand_id,
                    author_member_id,
                    message,
                    visibility
                 ) VALUES (?, ?, ?, ?)`,
                [
                    demandId,
                    memberId,
                    message,
                    visibility
                ]
            );

            const [[insertedMessage]] = await connection.execute(
                'SELECT CAST(LAST_INSERT_ID() AS CHAR) AS id'
            );

            // A primeira resposta pública de um membro operacional
            // registra o primeiro atendimento para o SLA.
            if (
                visibility === 'public' &&
                ['admin', 'manager', 'agent'].includes(role) &&
                !demand.first_responded_at
            ) {
                await connection.execute(
                    `UPDATE demands
                     SET first_responded_at = CURRENT_TIMESTAMP
                     WHERE id = ?
                       AND company_id = ?
                       AND first_responded_at IS NULL`,
                    [demandId, companyId]
                );
            }

            // Registrar a interação no histórico.
            await connection.execute(
                `INSERT INTO demand_history (
                    demand_id,
                    actor_member_id,
                    event_type,
                    description,
                    new_value
                 ) VALUES (?, ?, ?, ?, ?)`,
                [
                    demandId,
                    memberId,
                    visibility === 'internal'
                        ? 'demand.internal_message'
                        : 'demand.public_message',
                    visibility === 'internal'
                        ? 'Comentário interno adicionado.'
                        : 'Nova mensagem pública adicionada.',
                    JSON.stringify({
                        messageId: insertedMessage.id,
                        visibility
                    })
                ]
            );

            await connection.commit();

            return {
                id: insertedMessage.id,
                demandId,
                authorMemberId: memberId,
                message,
                visibility
            };

        } catch (error) {
            await connection.rollback();
            throw error;

        } finally {
            connection.release();
        }
    }

};

export default demandMessageModel;
