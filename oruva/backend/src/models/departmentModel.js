
import conect from '../config/database.js';

const departmentModel = {

    // Listar departamentos de uma empresa
    async listar(companyId) {
        const [resultado] = await conect.execute(
            `SELECT
                d.id,
                d.company_id,
                d.manager_member_id,
                d.name,
                d.description,
                d.status,
                d.created_at,
                d.updated_at,
                u.name AS manager_name
            FROM departments d
            LEFT JOIN company_members cm
                ON cm.id = d.manager_member_id
            LEFT JOIN users u
                ON u.id = cm.user_id
            WHERE d.company_id = ?
            ORDER BY d.name ASC`,
            [companyId]
        );

        return resultado;
    },

    // Buscar departamento pelo ID
    async buscarPorId(id, companyId) {
        const [resultado] = await conect.execute(
            `SELECT
                d.id,
                d.company_id,
                d.manager_member_id,
                d.name,
                d.description,
                d.status,
                d.created_at,
                d.updated_at,
                u.name AS manager_name
            FROM departments d
            LEFT JOIN company_members cm
                ON cm.id = d.manager_member_id
            LEFT JOIN users u
                ON u.id = cm.user_id
            WHERE d.id = ?
                AND d.company_id = ?
            LIMIT 1`,
            [id, companyId]
        );

        return resultado[0] || null;
    },

    // Validar responsável do departamento
    async validarResponsavel(managerMemberId, companyId) {
        if (managerMemberId === null) {
            return true;
        }

        const [resultado] = await conect.execute(
            `SELECT id
            FROM company_members
            WHERE id = ?
                AND company_id = ?
                AND status = 'active'
            LIMIT 1`,
            [managerMemberId, companyId]
        );

        return resultado.length > 0;
    },

    // Criar departamento
    async criar({
        companyId,
        managerMemberId = null,
        name,
        description = null
    }) {
        if (
            !(await this.validarResponsavel(
                managerMemberId,
                companyId
            ))
        ) {
            throw new Error('RESPONSAVEL_INVALIDO');
        }

        const [resultado] = await conect.execute(
            `INSERT INTO departments (
                company_id,
                manager_member_id,
                name,
                description
            ) VALUES (?, ?, ?, ?)`,
            [
                companyId,
                managerMemberId,
                name,
                description
            ]
        );

        return resultado.insertId;
    },

    // Atualizar dados do departamento
    async atualizar(id, companyId, {
        managerMemberId = null,
        name,
        description = null
    }) {
        if (
            !(await this.validarResponsavel(
                managerMemberId,
                companyId
            ))
        ) {
            throw new Error('RESPONSAVEL_INVALIDO');
        }

        const [resultado] = await conect.execute(
            `UPDATE departments
            SET
                manager_member_id = ?,
                name = ?,
                description = ?
            WHERE id = ?
                AND company_id = ?`,
            [
                managerMemberId,
                name,
                description,
                id,
                companyId
            ]
        );

        return resultado.affectedRows > 0;
    },

    // Alterar status do departamento
    async atualizarStatus(id, companyId, status) {
        const [resultado] = await conect.execute(
            `UPDATE departments
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

export default departmentModel;
