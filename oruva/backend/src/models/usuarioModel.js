
import conect from '../config/database.js';

const usuarioModel = {

    // Busca um usuário pelo e-mail
    async buscarPorEmail(email) {
        const [resultado] = await conect.execute(
            `SELECT
                id,
                name,
                email,
                password,
                phone,
                avatar_url,
                system_role,
                email_verified_at,
                mfa_enabled,
                mfa_secret_encrypted,
                mfa_confirmed_at,
                status
            FROM users
            WHERE email = ?
            LIMIT 1`,
            [email]
        );

        return resultado[0] || null;
    },

    // Busca um usuário pelo ID
    async buscarPorId(id) {
        const [resultado] = await conect.execute(
            `SELECT
                id,
                name,
                email,
                phone,
                avatar_url,
                system_role,
                email_verified_at,
                mfa_enabled,
                mfa_confirmed_at,
                status,
                last_login_at,
                created_at
            FROM users
            WHERE id = ?
            LIMIT 1`,
            [id]
        );

        return resultado[0] || null;
    },

    // Lista as empresas às quais o usuário está vinculado
    async listarVinculosAtivos(userId) {
        const [resultado] = await conect.execute(
            `SELECT
                cm.id AS company_member_id,
                cm.company_id,
                cm.role,
                cm.status AS membership_status,
                c.name AS company_name,
                c.slug AS company_slug
            FROM company_members cm
            INNER JOIN companies c
                ON c.id = cm.company_id
            WHERE cm.user_id = ?
                AND cm.status = 'active'
            ORDER BY cm.joined_at ASC`,
            [userId]
        );

        return resultado;
    },

    // Atualiza a data do último login
    async atualizarUltimoLogin(userId) {
        const [resultado] = await conect.execute(
            `UPDATE users
            SET last_login_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
            [userId]
        );

        return resultado.affectedRows > 0;
    }

};

export default usuarioModel;
