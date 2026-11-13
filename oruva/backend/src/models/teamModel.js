import conect from '../config/database.js';

const teamModel = {

    // Listar equipes de uma empresa
    async listar(companyId) {
        const [resultado] = await conect.execute(
            `SELECT
                t.id,
                t.company_id,
                t.department_id,
                t.name,
                t.description,
                t.status,
                t.created_at,
                t.updated_at,
                d.name AS department_name,
                COUNT(tm.id) AS members_count
            FROM teams t
            LEFT JOIN departments d
                ON d.id = t.department_id
                AND d.company_id = t.company_id
            LEFT JOIN team_members tm
                ON tm.team_id = t.id
            WHERE t.company_id = ?
            GROUP BY
                t.id,
                t.company_id,
                t.department_id,
                t.name,
                t.description,
                t.status,
                t.created_at,
                t.updated_at,
                d.name
            ORDER BY t.name ASC`,
            [companyId]
        );

        return resultado;
    },

    // Buscar equipe pelo ID
    async buscarPorId(id, companyId) {
        const [resultado] = await conect.execute(
            `SELECT
                t.id,
                t.company_id,
                t.department_id,
                t.name,
                t.description,
                t.status,
                t.created_at,
                t.updated_at,
                d.name AS department_name
            FROM teams t
            LEFT JOIN departments d
                ON d.id = t.department_id
                AND d.company_id = t.company_id
            WHERE t.id = ?
                AND t.company_id = ?
            LIMIT 1`,
            [id, companyId]
        );

        return resultado[0] || null;
    },

    // Validar departamento e garantir que pertence à empresa
    async validarDepartamento(departmentId, companyId) {
        if (departmentId === null) {
            return true;
        }

        const [resultado] = await conect.execute(
            `SELECT id
            FROM departments
            WHERE id = ?
                AND company_id = ?
                AND status = 'active'
            LIMIT 1`,
            [departmentId, companyId]
        );

        return resultado.length > 0;
    },

    // Validar membro ativo da empresa
    async validarMembro(companyMemberId, companyId) {
        const [resultado] = await conect.execute(
            `SELECT id
            FROM company_members
            WHERE id = ?
                AND company_id = ?
                AND status = 'active'
            LIMIT 1`,
            [companyMemberId, companyId]
        );

        return resultado.length > 0;
    },

    // Criar equipe
    async criar({
        companyId,
        departmentId = null,
        name,
        description = null
    }) {
        if (
            !(await this.validarDepartamento(
                departmentId,
                companyId
            ))
        ) {
            throw new Error('DEPARTAMENTO_INVALIDO');
        }

        const [resultado] = await conect.execute(
            `INSERT INTO teams (
                company_id,
                department_id,
                name,
                description
            ) VALUES (?, ?, ?, ?)`,
            [
                companyId,
                departmentId,
                name,
                description
            ]
        );

        return resultado.insertId;
    },

    // Atualizar dados da equipe
    async atualizar(id, companyId, {
        departmentId = null,
        name,
        description = null
    }) {
        if (
            !(await this.validarDepartamento(
                departmentId,
                companyId
            ))
        ) {
            throw new Error('DEPARTAMENTO_INVALIDO');
        }

        const [resultado] = await conect.execute(
            `UPDATE teams
            SET
                department_id = ?,
                name = ?,
                description = ?
            WHERE id = ?
                AND company_id = ?`,
            [
                departmentId,
                name,
                description,
                id,
                companyId
            ]
        );

        return resultado.affectedRows > 0;
    },

    // Alterar status da equipe
    async atualizarStatus(id, companyId, status) {
        const [resultado] = await conect.execute(
            `UPDATE teams
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
    },

    // Listar membros de uma equipe
    async listarMembros(teamId, companyId) {
        const [resultado] = await conect.execute(
            `SELECT
                cm.id AS company_member_id,
                cm.user_id,
                cm.role,
                cm.status AS member_status,
                u.name,
                u.email,
                u.avatar_url,
                tm.created_at AS added_at
            FROM team_members tm
            INNER JOIN teams t
                ON t.id = tm.team_id
            INNER JOIN company_members cm
                ON cm.id = tm.company_member_id
            INNER JOIN users u
                ON u.id = cm.user_id
            WHERE tm.team_id = ?
                AND t.company_id = ?
            ORDER BY u.name ASC`,
            [teamId, companyId]
        );

        return resultado;
    },

    // Adicionar membro à equipe
    async adicionarMembro(teamId, companyId, companyMemberId) {
        const equipe = await this.buscarPorId(teamId, companyId);

        if (!equipe) {
            throw new Error('EQUIPE_NAO_ENCONTRADA');
        }

        if (equipe.status !== 'active') {
            throw new Error('EQUIPE_INATIVA');
        }

        if (
            !(await this.validarMembro(
                companyMemberId,
                companyId
            ))
        ) {
            throw new Error('MEMBRO_INVALIDO');
        }

        const [resultado] = await conect.execute(
            `INSERT INTO team_members (
                team_id,
                company_member_id
            ) VALUES (?, ?)`,
            [
                teamId,
                companyMemberId
            ]
        );

        return resultado.insertId;
    },

    // Remover membro da equipe
    async removerMembro(teamId, companyId, companyMemberId) {
        const [resultado] = await conect.execute(
            `DELETE tm
            FROM team_members tm
            INNER JOIN teams t
                ON t.id = tm.team_id
            WHERE tm.team_id = ?
                AND tm.company_member_id = ?
                AND t.company_id = ?`,
            [
                teamId,
                companyMemberId,
                companyId
            ]
        );

        return resultado.affectedRows > 0;
    }

};

export default teamModel;