
import conect from '../config/database.js';

const companyInvitationModel = {

    // Criar convite e revogar convites anteriores ainda pendentes
    async criar({
        companyId,
        invitedByMemberId = null,
        invitedByUserId = null,
        email,
        role,
        tokenHash,
        expiresAt
    }) {
        if (
            (invitedByMemberId === null && invitedByUserId === null) ||
            (invitedByMemberId !== null && invitedByUserId !== null)
        ) {
            throw new Error('REMETENTE_CONVITE_INVALIDO');
        }

        const conexao = await conect.getConnection();

        try {
            await conexao.beginTransaction();

            await conexao.execute(
                `UPDATE company_invitations
                SET revoked_at = CURRENT_TIMESTAMP
                WHERE company_id = ?
                    AND email = ?
                    AND accepted_at IS NULL
                    AND revoked_at IS NULL`,
                [companyId, email]
            );

            const [resultado] = await conexao.execute(
                `INSERT INTO company_invitations (
                    company_id,
                    invited_by_member_id,
                    invited_by_user_id,
                    email,
                    role,
                    token_hash,
                    expires_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    companyId,
                    invitedByMemberId,
                    invitedByUserId,
                    email,
                    role,
                    tokenHash,
                    expiresAt
                ]
            );

            await conexao.commit();

            return resultado.insertId;

        } catch (error) {
            await conexao.rollback();
            throw error;

        } finally {
            conexao.release();
        }
    },

    // Consultar convite pelo hash do token
    async buscarPorTokenHash(tokenHash) {
        const [resultado] = await conect.execute(
            `SELECT
                ci.id,
                ci.company_id,
                ci.email,
                ci.role,
                ci.expires_at,
                ci.accepted_at,
                ci.revoked_at,
                c.name AS company_name,
                c.slug AS company_slug,
                c.status AS company_status
            FROM company_invitations ci
            INNER JOIN companies c ON c.id = ci.company_id
            WHERE ci.token_hash = ?
            LIMIT 1`,
            [tokenHash]
        );

        return resultado[0] || null;
    },

    // Aceitar convite e criar o vínculo com a empresa
    async aceitar({
        tokenHash,
        userId = null,
        name = null,
        email = null,
        passwordHash = null
    }) {
        const conexao = await conect.getConnection();

        try {
            await conexao.beginTransaction();

            // 1. Bloquear o convite durante a operação
            const [convites] = await conexao.execute(
                `SELECT
                    id,
                    company_id,
                    email,
                    role,
                    expires_at,
                    accepted_at,
                    revoked_at
                FROM company_invitations
                WHERE token_hash = ?
                LIMIT 1
                FOR UPDATE`,
                [tokenHash]
            );

            const convite = convites[0];

            if (!convite) {
                throw new Error('CONVITE_NAO_ENCONTRADO');
            }

            if (convite.accepted_at) {
                throw new Error('CONVITE_JA_ACEITO');
            }

            if (convite.revoked_at) {
                throw new Error('CONVITE_REVOGADO');
            }

            if (new Date(convite.expires_at).getTime() <= Date.now()) {
                throw new Error('CONVITE_EXPIRADO');
            }

            // 2. Verificar se a empresa continua ativa
            const [empresas] = await conexao.execute(
                `SELECT id, status
                FROM companies
                WHERE id = ?
                LIMIT 1
                FOR UPDATE`,
                [convite.company_id]
            );

            if (!empresas[0] || empresas[0].status !== 'active') {
                throw new Error('EMPRESA_INATIVA');
            }

            let usuarioId;

            // 3. Caminho para usuário já existente
            if (userId !== null) {
                const [usuarios] = await conexao.execute(
                    `SELECT id, email, status
                    FROM users
                    WHERE id = ?
                    LIMIT 1
                    FOR UPDATE`,
                    [userId]
                );

                const usuario = usuarios[0];

                if (!usuario || usuario.status !== 'active') {
                    throw new Error('USUARIO_INVALIDO');
                }

                if (
                    usuario.email.toLowerCase() !==
                    convite.email.toLowerCase()
                ) {
                    throw new Error('EMAIL_DIVERGENTE');
                }

                usuarioId = usuario.id;

            } else {
                // 4. Caminho para criação de uma nova conta
                if (!name || !email || !passwordHash) {
                    throw new Error('DADOS_USUARIO_INVALIDOS');
                }

                if (
                    email.trim().toLowerCase() !==
                    convite.email.toLowerCase()
                ) {
                    throw new Error('EMAIL_DIVERGENTE');
                }

                const [usuariosExistentes] = await conexao.execute(
                    `SELECT id
                    FROM users
                    WHERE email = ?
                    LIMIT 1
                    FOR UPDATE`,
                    [email.trim().toLowerCase()]
                );

                if (usuariosExistentes.length > 0) {
                    throw new Error('USUARIO_JA_EXISTE');
                }

                const [novoUsuario] = await conexao.execute(
                    `INSERT INTO users (
                        name,
                        email,
                        password,
                        email_verified_at,
                        password_changed_at
                    ) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                    [
                        name.trim(),
                        email.trim().toLowerCase(),
                        passwordHash
                    ]
                );

                usuarioId = novoUsuario.insertId;
            }

            // 5. Impedir vínculo duplicado
            const [vinculos] = await conexao.execute(
                `SELECT id
                FROM company_members
                WHERE company_id = ?
                    AND user_id = ?
                LIMIT 1
                FOR UPDATE`,
                [convite.company_id, usuarioId]
            );

            if (vinculos.length > 0) {
                throw new Error('USUARIO_JA_VINCULADO');
            }

            // 6. Criar vínculo ativo com a empresa
            const [novoVinculo] = await conexao.execute(
                `INSERT INTO company_members (
                    company_id,
                    user_id,
                    role,
                    status,
                    joined_at
                ) VALUES (?, ?, ?, 'active', CURRENT_TIMESTAMP)`,
                [
                    convite.company_id,
                    usuarioId,
                    convite.role
                ]
            );

            // 7. Marcar convite como aceito
            const [atualizacao] = await conexao.execute(
                `UPDATE company_invitations
                SET accepted_at = CURRENT_TIMESTAMP
                WHERE id = ?
                    AND accepted_at IS NULL
                    AND revoked_at IS NULL`,
                [convite.id]
            );

            if (atualizacao.affectedRows !== 1) {
                throw new Error('FALHA_AO_ACEITAR_CONVITE');
            }

            await conexao.commit();

            return {
                userId: usuarioId,
                companyId: convite.company_id,
                companyMemberId: novoVinculo.insertId,
                role: convite.role
            };

        } catch (error) {
            await conexao.rollback();
            throw error;

        } finally {
            conexao.release();
        }
    }
};

export default companyInvitationModel;
