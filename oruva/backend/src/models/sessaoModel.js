
import conect from '../config/database.js';

const sessaoModel = {

    // Cria uma nova sessão
    async criar({
        userId,
        companyMemberId,
        tokenHash,
        ipAddress,
        userAgent,
        expiresAt
    }) {
        const [resultado] = await conect.execute(
            `INSERT INTO sessions (
                user_id,
                company_member_id,
                token_hash,
                ip_address,
                user_agent,
                mfa_verified,
                expires_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                userId,
                companyMemberId,
                tokenHash,
                ipAddress,
                userAgent,
                true,
                expiresAt
            ]
        );

        return resultado.insertId;
    },

    // Busca uma sessão pelo hash do token
    async buscarPorTokenHash(tokenHash) {
        const [resultado] = await conect.execute(
            `SELECT
                s.id AS session_id,
                s.user_id,
                s.company_member_id,
                s.mfa_verified,
                s.expires_at,
                s.revoked_at,

                u.name,
                u.email,
                u.avatar_url,
                u.system_role,
                u.status AS user_status,
                u.mfa_enabled,

                cm.company_id,
                cm.role AS company_role,
                cm.status AS membership_status

            FROM sessions s

            INNER JOIN users u
                ON u.id = s.user_id

            LEFT JOIN company_members cm
                ON cm.id = s.company_member_id

            WHERE s.token_hash = ?
            LIMIT 1`,
            [tokenHash]
        );

        return resultado[0] || null;
    },

    // Revoga uma sessão específica
    async revogarPorId(sessionId, userId) {
        const [resultado] = await conect.execute(
            `UPDATE sessions
            SET revoked_at = CURRENT_TIMESTAMP
            WHERE id = ?
                AND user_id = ?
                AND revoked_at IS NULL`,
            [sessionId, userId]
        );

        return resultado.affectedRows > 0;
    }

};

export default sessaoModel;
