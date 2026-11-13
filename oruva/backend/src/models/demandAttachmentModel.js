
import conect from '../config/database.js';

const demandAttachmentModel = {

    // Verifica se o membro pode acessar a demanda
    async validarDemanda(connection, {
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

        // Collaborator só acessa demandas das quais participa
        if (role === 'collaborator') {
            conditions.push(
                '(d.requester_member_id = ? OR d.opened_by_member_id = ?)'
            );

            params.push(memberId, memberId);
        }

        const [rows] = await connection.execute(
            `SELECT
                d.id,
                d.status
             FROM demands d
             WHERE ${conditions.join(' AND ')}
             LIMIT 1
             ${lock ? 'FOR UPDATE' : ''}`,
            params
        );

        return rows[0] || null;
    },

    // Lista os anexos de uma demanda
    async listar({
        demandId,
        companyId,
        memberId,
        role
    }) {
        const demanda = await this.validarDemanda(conect, {
            demandId,
            companyId,
            memberId,
            role
        });

        if (!demanda) {
            throw new Error('DEMAND_NOT_FOUND');
        }

        const conditions = ['a.demand_id = ?'];
        const params = [demandId];

        // Collaborator só visualiza anexos de mensagens públicas
        if (role === 'collaborator') {
            conditions.push(
                'a.message_id IS NOT NULL',
                "m.visibility = 'public'"
            );
        }

        const [rows] = await conect.execute(
            `SELECT
                CAST(a.id AS CHAR) AS id,
                CAST(a.demand_id AS CHAR) AS demand_id,
                CAST(a.message_id AS CHAR) AS message_id,
                CAST(a.uploaded_by_member_id AS CHAR) AS uploaded_by_member_id,
                a.original_name,
                a.file_name,
                a.mime_type,
                a.file_size,
                a.created_at
             FROM demand_attachments a
             LEFT JOIN demand_messages m
                ON m.id = a.message_id
             WHERE ${conditions.join(' AND ')}
             ORDER BY a.created_at DESC`,
            params
        );

        return rows;
    },

    // Busca um anexo específico
    async buscarPorId({
        attachmentId,
        demandId,
        companyId,
        memberId,
        role
    }) {
        const demanda = await this.validarDemanda(conect, {
            demandId,
            companyId,
            memberId,
            role
        });

        if (!demanda) {
            throw new Error('DEMAND_NOT_FOUND');
        }

        const conditions = [
            'a.id = ?',
            'a.demand_id = ?'
        ];

        const params = [attachmentId, demandId];

        if (role === 'collaborator') {
            conditions.push(
                'a.message_id IS NOT NULL',
                "m.visibility = 'public'"
            );
        }

        const [rows] = await conect.execute(
            `SELECT
                CAST(a.id AS CHAR) AS id,
                CAST(a.demand_id AS CHAR) AS demand_id,
                CAST(a.message_id AS CHAR) AS message_id,
                CAST(a.uploaded_by_member_id AS CHAR) AS uploaded_by_member_id,
                a.original_name,
                a.file_name,
                a.mime_type,
                a.file_size
             FROM demand_attachments a
             LEFT JOIN demand_messages m
                ON m.id = a.message_id
             WHERE ${conditions.join(' AND ')}
             LIMIT 1`,
            params
        );

        return rows[0] || null;
    },

    // Registra um novo anexo
    async criar({
        demandId,
        companyId,
        memberId,
        role,
        messageId = null,
        originalName,
        fileName,
        fileUrl,
        mimeType,
        fileSize
    }) {
        const connection = await conect.getConnection();

        try {
            await connection.beginTransaction();

            const demanda = await this.validarDemanda(connection, {
                demandId,
                companyId,
                memberId,
                role,
                lock: true
            });

            if (!demanda) {
                throw new Error('DEMAND_NOT_FOUND');
            }

            if (['closed', 'canceled'].includes(demanda.status)) {
                throw new Error('DEMAND_NOT_AVAILABLE');
            }

            // Confirma que o membro continua ativo na empresa
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
                throw new Error('MEMBER_NOT_FOUND');
            }

            // Collaborator precisa vincular o arquivo a uma mensagem
            if (role === 'collaborator' && !messageId) {
                throw new Error('PUBLIC_MESSAGE_REQUIRED');
            }

            // Se houver mensagem, confirma que ela pertence à demanda
            if (messageId) {
                const [messages] = await connection.execute(
                    `SELECT id, visibility
                     FROM demand_messages
                     WHERE id = ?
                       AND demand_id = ?
                     LIMIT 1`,
                    [messageId, demandId]
                );

                if (!messages.length) {
                    throw new Error('MESSAGE_NOT_FOUND');
                }

                if (
                    role === 'collaborator' &&
                    messages[0].visibility !== 'public'
                ) {
                    throw new Error('MESSAGE_NOT_AVAILABLE');
                }
            }

            const [result] = await connection.execute(
                `INSERT INTO demand_attachments (
                    demand_id,
                    message_id,
                    uploaded_by_member_id,
                    original_name,
                    file_name,
                    file_url,
                    mime_type,
                    file_size
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    demandId,
                    messageId,
                    memberId,
                    originalName,
                    fileName,
                    fileUrl,
                    mimeType,
                    fileSize
                ]
            );

            const attachmentId = result.insertId.toString();

            // Registra o evento no histórico da demanda
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
                    'demand.attachment_added',
                    `Anexo adicionado: ${originalName}`,
                    JSON.stringify({
                        attachmentId,
                        messageId
                    })
                ]
            );

            await connection.commit();

            return {
                id: attachmentId,
                demand_id: demandId,
                message_id: messageId,
                original_name: originalName,
                file_name: fileName,
                mime_type: mimeType,
                file_size: fileSize
            };

        } catch (error) {
            await connection.rollback();
            throw error;

        } finally {
            connection.release();
        }
    },

    // Remove o registro de um anexo
    async excluir({
        attachmentId,
        demandId,
        companyId,
        memberId,
        role
    }) {
        const connection = await conect.getConnection();

        try {
            await connection.beginTransaction();

            // Confirma novamente o acesso à demanda
            const demanda = await this.validarDemanda(connection, {
                demandId,
                companyId,
                memberId,
                role,
                lock: true
            });

            if (!demanda) {
                throw new Error('DEMAND_NOT_FOUND');
            }

            const [rows] = await connection.execute(
                `SELECT id
                 FROM demand_attachments
                 WHERE id = ?
                   AND demand_id = ?
                 LIMIT 1
                 FOR UPDATE`,
                [attachmentId, demandId]
            );

            if (!rows.length) {
                throw new Error('ATTACHMENT_NOT_FOUND');
            }

            await connection.execute(
                `DELETE FROM demand_attachments
                 WHERE id = ?
                   AND demand_id = ?`,
                [attachmentId, demandId]
            );

            await connection.execute(
                `INSERT INTO demand_history (
                    demand_id,
                    actor_member_id,
                    event_type,
                    description,
                    old_value
                ) VALUES (?, ?, ?, ?, ?)`,
                [
                    demandId,
                    memberId,
                    'demand.attachment_removed',
                    'Um anexo foi removido.',
                    JSON.stringify({ attachmentId })
                ]
            );

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

export default demandAttachmentModel;
