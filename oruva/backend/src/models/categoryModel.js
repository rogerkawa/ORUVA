import conect from '../config/database.js';

const categoryModel = {

    // Listar categorias de uma empresa
    async listar(companyId) {
        const [resultado] = await conect.execute(
            `SELECT
                c.id,
                c.company_id,
                c.department_id,
                c.default_team_id,
                c.name,
                c.description,
                c.form_schema,
                c.icon,
                c.color,
                c.demand_type,
                c.requires_approval,
                c.status,
                c.created_at,
                c.updated_at,
                d.name AS department_name,
                t.name AS default_team_name
            FROM categories c
            LEFT JOIN departments d
                ON d.id = c.department_id
                AND d.company_id = c.company_id
            LEFT JOIN teams t
                ON t.id = c.default_team_id
                AND t.company_id = c.company_id
            WHERE c.company_id = ?
            ORDER BY c.name ASC`,
            [companyId]
        );

        return resultado.map(this.formatarCategoria);
    },

    // Buscar categoria pelo ID
    async buscarPorId(id, companyId) {
        const [resultado] = await conect.execute(
            `SELECT
                c.id,
                c.company_id,
                c.department_id,
                c.default_team_id,
                c.name,
                c.description,
                c.form_schema,
                c.icon,
                c.color,
                c.demand_type,
                c.requires_approval,
                c.status,
                c.created_at,
                c.updated_at,
                d.name AS department_name,
                t.name AS default_team_name
            FROM categories c
            LEFT JOIN departments d
                ON d.id = c.department_id
                AND d.company_id = c.company_id
            LEFT JOIN teams t
                ON t.id = c.default_team_id
                AND t.company_id = c.company_id
            WHERE c.id = ?
                AND c.company_id = ?
            LIMIT 1`,
            [id, companyId]
        );

        return resultado[0]
            ? this.formatarCategoria(resultado[0])
            : null;
    },

    // Normalizar os dados retornados pelo MySQL
    formatarCategoria(categoria) {
        if (!categoria) {
            return null;
        }

        let formSchema = categoria.form_schema;

        if (typeof formSchema === 'string') {
            try {
                formSchema = JSON.parse(formSchema);
            } catch {
                formSchema = null;
            }
        }

        return {
            ...categoria,
            form_schema: formSchema,
            requires_approval: Boolean(categoria.requires_approval)
        };
    },

    // Validar departamento
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

    // Validar equipe padrão
    async validarEquipe(defaultTeamId, companyId, departmentId) {
        if (defaultTeamId === null) {
            return true;
        }

        const [resultado] = await conect.execute(
            `SELECT id
            FROM teams
            WHERE id = ?
                AND company_id = ?
                AND status = 'active'
                AND (
                    ? IS NULL
                    OR department_id = ?
                )
            LIMIT 1`,
            [
                defaultTeamId,
                companyId,
                departmentId,
                departmentId
            ]
        );

        return resultado.length > 0;
    },

    // Validar associações da categoria
    async validarAssociacoes({
        companyId,
        departmentId,
        defaultTeamId
    }) {
        const departamentoValido = await this.validarDepartamento(
            departmentId,
            companyId
        );

        if (!departamentoValido) {
            throw new Error('DEPARTAMENTO_INVALIDO');
        }

        const equipeValida = await this.validarEquipe(
            defaultTeamId,
            companyId,
            departmentId
        );

        if (!equipeValida) {
            throw new Error('EQUIPE_INVALIDA');
        }

        return true;
    },

    // Criar categoria
    async criar({
        companyId,
        departmentId = null,
        defaultTeamId = null,
        name,
        description = null,
        formSchema = null,
        icon = null,
        color = null,
        demandType = 'both',
        requiresApproval = false
    }) {
        await this.validarAssociacoes({
            companyId,
            departmentId,
            defaultTeamId
        });

        const [resultado] = await conect.execute(
            `INSERT INTO categories (
                company_id,
                department_id,
                default_team_id,
                name,
                description,
                form_schema,
                icon,
                color,
                demand_type,
                requires_approval
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                companyId,
                departmentId,
                defaultTeamId,
                name,
                description,
                formSchema === null
                    ? null
                    : JSON.stringify(formSchema),
                icon,
                color,
                demandType,
                requiresApproval
            ]
        );

        return resultado.insertId;
    },

    // Atualizar categoria
    async atualizar(id, companyId, {
        departmentId = null,
        defaultTeamId = null,
        name,
        description = null,
        formSchema = null,
        icon = null,
        color = null,
        demandType = 'both',
        requiresApproval = false
    }) {
        await this.validarAssociacoes({
            companyId,
            departmentId,
            defaultTeamId
        });

        const [resultado] = await conect.execute(
            `UPDATE categories
            SET
                department_id = ?,
                default_team_id = ?,
                name = ?,
                description = ?,
                form_schema = ?,
                icon = ?,
                color = ?,
                demand_type = ?,
                requires_approval = ?
            WHERE id = ?
                AND company_id = ?`,
            [
                departmentId,
                defaultTeamId,
                name,
                description,
                formSchema === null
                    ? null
                    : JSON.stringify(formSchema),
                icon,
                color,
                demandType,
                requiresApproval,
                id,
                companyId
            ]
        );

        return resultado.affectedRows > 0;
    },

    // Alterar status da categoria
    async atualizarStatus(id, companyId, status) {
        const [resultado] = await conect.execute(
            `UPDATE categories
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

export default categoryModel;