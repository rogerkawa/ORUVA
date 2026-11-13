
import conect from '../config/database.js';

const departmentModel = {

    // Listar departamentos da empresa
    async listar(companyId) {
        const [departamentos] = await conect.execute(
            `SELECT
                d.id,
                d.company_id,
                d.manager_member_id,
                d.name,
                d.description,
                d.status,
                d.created_at,
                d.updated_at,
                u.name AS manager_name,
                u.email AS manager_email
            FROM departments d
            LEFT JOIN company_members cm
                ON cm.id = d.manager_member_id
                AND cm.company_id = d.company_id
            LEFT JOIN users u
                ON u.id = cm.user_id
            WHERE d.company_id = ?
            ORDER BY d.name ASC`,
            [companyId]
        );

        return departamentos;
    },


    // Buscar departamento específico
    async buscarPorId(id, companyId) {
        const [departamentos] = await conect.execute(
            `SELECT
                d.id,
                d.company_id,
                d.manager_member_id,
                d.name,
                d.description,
                d.status,
                d.created_at,
                d.updated_at,
                u.name AS manager_name,
                u.email AS manager_email
            FROM departments d
            LEFT JOIN company_members cm
                ON cm.id = d.manager_member_id
                AND cm.company_id = d.company_id
            LEFT JOIN users u
                ON u.id = cm.user_id
            WHERE d.id = ?
              AND d.company_id = ?
            LIMIT 1`,
            [id, companyId]
        );

        return departamentos[0] || null;
    },


    // Validar responsável pelo departamento
    async validarResponsavel(managerMemberId, companyId) {
        if (managerMemberId === null || managerMemberId === undefined) {
            return true;
        }

        const [membros] = await conect.execute(
            `SELECT id
             FROM company_members
             WHERE id = ?
               AND company_id = ?
               AND status = 'active'
             LIMIT 1`,
            [managerMemberId, companyId]
        );

        if (!membros.length) {
            throw new Error('RESPONSAVEL_INVALIDO');
        }

        return true;
    },


    // Criar departamento
    async criar({
        companyId,
        managerMemberId = null,
        name,
        description = null
    }) {
        await this.validarResponsavel(managerMemberId, companyId);

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
                name.trim(),
                description?.trim() || null
            ]
        );

        return resultado.insertId;
    },


    // Atualizar departamento
    async atualizar(id, companyId, {
        managerMemberId = null,
        name,
        description = null
    }) {
        await this.validarResponsavel(managerMemberId, companyId);

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
                name.trim(),
                description?.trim() || null,
                id,
                companyId
            ]
        );

        if (resultado.affectedRows === 0) {
            throw new Error('DEPARTAMENTO_NAO_ENCONTRADO');
        }

        return {
            message: 'Departamento atualizado com sucesso.'
        };
    },


    // Ativar ou desativar departamento
    async atualizarStatus(id, companyId, status) {
        const statusPermitidos = ['active', 'inactive'];

        if (!statusPermitidos.includes(status)) {
            throw new Error('STATUS_INVALIDO');
        }

        const [resultado] = await conect.execute(
            `UPDATE departments
             SET status = ?
             WHERE id = ?
               AND company_id = ?`,
            [status, id, companyId]
        );

        if (resultado.affectedRows === 0) {
            throw new Error('DEPARTAMENTO_NAO_ENCONTRADO');
        }

        return {
            message: status === 'active'
                ? 'Departamento ativado com sucesso.'
                : 'Departamento desativado com sucesso.'
        };
    }

};

export default departmentModel;
