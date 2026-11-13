
import { randomBytes } from 'node:crypto';
import conect from '../config/database.js';

const demandModel = {

    // Validar se um membro pertence à empresa e está ativo.
    async validarMembro(connection, memberId, companyId) {
        const [rows] = await connection.execute(
            `SELECT id
             FROM company_members
             WHERE id = ?
               AND company_id = ?
               AND status = 'active'
             LIMIT 1`,
            [memberId, companyId]
        );

        return rows.length > 0;
    },

    // Validar equipe e departamento.
    async validarEquipe(connection, teamId, companyId) {
        const [rows] = await connection.execute(
            `SELECT id, department_id
             FROM teams
             WHERE id = ?
               AND company_id = ?
               AND status = 'active'
             LIMIT 1`,
            [teamId, companyId]
        );

        return rows[0] || null;
    },

    // Buscar uma política de SLA aplicável.
    async buscarPoliticaSla(connection, companyId, categoryId, priority) {
        // Primeiro, procura uma política específica da categoria.
        const [specificPolicies] = await connection.execute(
            `SELECT id, first_response_minutes, resolution_minutes
             FROM sla_policies
             WHERE company_id = ?
               AND category_id = ?
               AND priority = ?
               AND status = 'active'
             LIMIT 2`,
            [companyId, categoryId, priority]
        );

        if (specificPolicies.length > 1) {
            const error = new Error(
                'Existem políticas de SLA duplicadas para esta categoria e prioridade.'
            );
            error.code = 'SLA_POLICY_AMBIGUOUS';
            throw error;
        }

        if (specificPolicies.length === 1) {
            return specificPolicies[0];
        }

        // Se não houver política específica, procura uma política geral.
        const [generalPolicies] = await connection.execute(
            `SELECT id, first_response_minutes, resolution_minutes
             FROM sla_policies
             WHERE company_id = ?
               AND category_id IS NULL
               AND priority = ?
               AND status = 'active'
             LIMIT 2`,
            [companyId, priority]
        );

        if (generalPolicies.length > 1) {
            const error = new Error(
                'Existem políticas gerais de SLA duplicadas para esta prioridade.'
            );
            error.code = 'SLA_POLICY_AMBIGUOUS';
            throw error;
        }

        return generalPolicies[0] || null;
    },

    // Gerar número único para a demanda.
    gerarNumero() {
        const date = new Date().toISOString()
            .slice(0, 10)
            .replaceAll('-', '');

        const suffix = randomBytes(5).toString('hex').toUpperCase();

        return `ORV-${date}-${suffix}`;
    },

    // Criar demanda.
    async criar({
        companyId,
        requesterMemberId,
        openedByMemberId,
        categoryId,
        teamId = null,
        type,
        title,
        description = null,
        priority = 'medium',
        source = 'portal',
        formData = null
    }) {
        const connection = await conect.getConnection();

        try {
            await connection.beginTransaction();

            // Categoria.
            const [categories] = await connection.execute(
                `SELECT
                    id,
                    department_id,
                    default_team_id,
                    demand_type,
                    requires_approval,
                    form_schema
                 FROM categories
                 WHERE id = ?
                   AND company_id = ?
                   AND status = 'active'
                 LIMIT 1
                 FOR UPDATE`,
                [categoryId, companyId]
            );

            const category = categories[0];

            if (!category) {
                const error = new Error('Categoria não encontrada ou inativa.');
                error.code = 'CATEGORY_NOT_FOUND';
                throw error;
            }

            // Compatibilidade do tipo com a categoria.
            if (
                category.demand_type !== 'both' &&
                category.demand_type !== type
            ) {
                const error = new Error(
                    'O tipo informado não é permitido nesta categoria.'
                );
                error.code = 'INVALID_DEMAND_TYPE';
                throw error;
            }

            // Aprovação ainda não possui status próprio na tabela demands.
            if (category.requires_approval) {
                const error = new Error(
                    'Esta categoria exige aprovação. O fluxo de aprovação ainda precisa ser configurado.'
                );
                error.code = 'APPROVAL_FLOW_NOT_IMPLEMENTED';
                throw error;
            }

            // Solicitante.
            const requesterValid = await this.validarMembro(
                connection,
                requesterMemberId,
                companyId
            );

            if (!requesterValid) {
                const error = new Error(
                    'Solicitante não encontrado ou não pertence à empresa.'
                );
                error.code = 'REQUESTER_NOT_FOUND';
                throw error;
            }

            // Autor da abertura.
            const openerValid = await this.validarMembro(
                connection,
                openedByMemberId,
                companyId
            );

            if (!openerValid) {
                const error = new Error(
                    'Membro responsável pela abertura não encontrado.'
                );
                error.code = 'OPENER_NOT_FOUND';
                throw error;
            }

            // Equipe: utiliza a equipe informada ou a equipe padrão da categoria.
            const selectedTeamId = teamId || category.default_team_id;

            let departmentId = category.department_id;
            let validatedTeam = null;

            if (selectedTeamId) {
                validatedTeam = await this.validarEquipe(
                    connection,
                    selectedTeamId,
                    companyId
                );

                if (!validatedTeam) {
                    const error = new Error(
                        'Equipe não encontrada ou inativa.'
                    );
                    error.code = 'TEAM_NOT_FOUND';
                    throw error;
                }

                if (
                    departmentId &&
                    String(departmentId) !== String(validatedTeam.department_id)
                ) {
                    const error = new Error(
                        'A equipe selecionada não pertence ao departamento da categoria.'
                    );
                    error.code = 'TEAM_DEPARTMENT_MISMATCH';
                    throw error;
                }

                if (!departmentId) {
                    departmentId = validatedTeam.department_id;
                }
            }

            // SLA.
            const slaPolicy = await this.buscarPoliticaSla(
                connection,
                companyId,
                categoryId,
                priority
            );

            // Número da demanda.
            const demandNumber = this.gerarNumero();

            const serializedFormData = formData
                ? JSON.stringify(formData)
                : null;

            // Criar demanda.
            const [result] = await connection.execute(
                `INSERT INTO demands (
                    company_id,
                    category_id,
                    department_id,
                    team_id,
                    sla_policy_id,
                    requester_member_id,
                    opened_by_member_id,
                    demand_number,
                    type,
                    title,
                    description,
                    priority,
                    source,
                    form_data,
                    first_response_due_at,
                    resolution_due_at
                ) VALUES (
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                    CASE
                        WHEN ? IS NOT NULL
                        THEN DATE_ADD(
                            UTC_TIMESTAMP(),
                            INTERVAL ? MINUTE
                        )
                        ELSE NULL
                    END,
                    CASE
                        WHEN ? IS NOT NULL
                        THEN DATE_ADD(
                            UTC_TIMESTAMP(),
                            INTERVAL ? MINUTE
                        )
                        ELSE NULL
                    END
                )`,
                [
                    companyId,
                    categoryId,
                    departmentId,
                    selectedTeamId,
                    slaPolicy?.id || null,
                    requesterMemberId,
                    openedByMemberId,
                    demandNumber,
                    type,
                    title,
                    description,
                    priority,
                    source,
                    serializedFormData,
                    slaPolicy?.id || null,
                    slaPolicy?.first_response_minutes || 0,
                    slaPolicy?.id || null,
                    slaPolicy?.resolution_minutes || 0
                ]
            );

            const [[insertedDemand]] = await connection.execute(
                'SELECT CAST(LAST_INSERT_ID() AS CHAR) AS id'
            );

            const demandId = insertedDemand.id;

            if (selectedTeamId) {
                await connection.execute(
                    `INSERT INTO demand_assignments (
            demand_id,
            team_id,
            assigned_member_id,
            assigned_by_member_id
        ) VALUES (?, ?, NULL, ?)`,
                    [
                        demandId,
                        selectedTeamId,
                        openedByMemberId
                    ]
                );
            }

            // Histórico de abertura.
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
                    openedByMemberId,
                    'demand.created',
                    'Demanda criada.',
                    JSON.stringify({
                        demandNumber,
                        type,
                        title,
                        priority,
                        status: 'open',
                        categoryId,
                        teamId: selectedTeamId
                    })
                ]
            );

            await connection.commit();

            return {
                id: demandId,
                demandNumber,
                status: 'open'
            };

        } catch (error) {
            await connection.rollback();
            throw error;

        } finally {
            connection.release();
        }
    },

    // Listar demandas com filtros e paginação.
    async listar({
        companyId,
        memberId,
        role,
        filters = {},
        limit = 20,
        offset = 0
    }) {
        const conditions = ['d.company_id = ?'];
        const params = [companyId];

        // Colaboradores visualizam somente demandas próprias.
        if (role === 'collaborator') {
            conditions.push(
                '(d.requester_member_id = ? OR d.opened_by_member_id = ?)'
            );

            params.push(memberId, memberId);
        }

        if (filters.status) {
            conditions.push('d.status = ?');
            params.push(filters.status);
        }

        if (filters.priority) {
            conditions.push('d.priority = ?');
            params.push(filters.priority);
        }

        if (filters.categoryId) {
            conditions.push('d.category_id = ?');
            params.push(filters.categoryId);
        }

        if (filters.teamId) {
            conditions.push('d.team_id = ?');
            params.push(filters.teamId);
        }

        if (filters.assignedMemberId) {
            conditions.push('d.assigned_member_id = ?');
            params.push(filters.assignedMemberId);
        }

        const where = conditions.join(' AND ');

        const [rows] = await conect.execute(
            `SELECT
                d.id,
                d.demand_number,
                d.type,
                d.title,
                d.description,
                d.priority,
                d.status,
                d.source,
                d.first_response_due_at,
                d.resolution_due_at,
                d.first_responded_at,
                d.resolved_at,
                d.closed_at,
                d.created_at,
                d.updated_at,

                c.name AS category_name,
                t.name AS team_name,

                requester.name AS requester_name,
                assigned.name AS assigned_name

             FROM demands d

             INNER JOIN categories c
                ON c.id = d.category_id

             LEFT JOIN teams t
                ON t.id = d.team_id

             INNER JOIN company_members requester_member
                ON requester_member.id = d.requester_member_id

             INNER JOIN users requester
                ON requester.id = requester_member.user_id

             LEFT JOIN company_members assigned_member
                ON assigned_member.id = d.assigned_member_id

             LEFT JOIN users assigned
                ON assigned.id = assigned_member.user_id

             WHERE ${where}

             ORDER BY d.created_at DESC

             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        const [countRows] = await conect.execute(
            `SELECT COUNT(*) AS total
             FROM demands d
             WHERE ${where}`,
            params
        );

        return {
            demands: rows,
            total: Number(countRows[0].total),
            limit,
            offset
        };
    },

    // Consultar detalhes de uma demanda.
    async buscarPorId({ id, companyId, memberId, role }) {
        const conditions = [
            'd.id = ?',
            'd.company_id = ?'
        ];

        const params = [id, companyId];

        if (role === 'collaborator') {
            conditions.push(
                '(d.requester_member_id = ? OR d.opened_by_member_id = ?)'
            );

            params.push(memberId, memberId);
        }

        const [rows] = await conect.execute(
            `SELECT
                d.*,

                c.name AS category_name,
                c.icon AS category_icon,
                c.color AS category_color,

                t.name AS team_name,

                requester.name AS requester_name,
                requester.email AS requester_email,

                opener.name AS opened_by_name,

                assigned.name AS assigned_name

             FROM demands d

             INNER JOIN categories c
                ON c.id = d.category_id

             LEFT JOIN teams t
                ON t.id = d.team_id

             INNER JOIN company_members requester_member
                ON requester_member.id = d.requester_member_id

             INNER JOIN users requester
                ON requester.id = requester_member.user_id

             INNER JOIN company_members opener_member
                ON opener_member.id = d.opened_by_member_id

             INNER JOIN users opener
                ON opener.id = opener_member.user_id

             LEFT JOIN company_members assigned_member
                ON assigned_member.id = d.assigned_member_id

             LEFT JOIN users assigned
                ON assigned.id = assigned_member.user_id

             WHERE ${conditions.join(' AND ')}
             LIMIT 1`,
            params
        );

        return rows[0] || null;
    },

    // Atribuir ou transferir uma demanda.
    async atualizarAtribuicao({
        demandId,
        companyId,
        actorMemberId,
        teamId = null,
        assignedMemberId = null,
        transferReason = null,
        exigirAtribuicaoAnterior = false
    }) {
        const connection = await conect.getConnection();

        try {
            await connection.beginTransaction();

            // Bloquear a demanda durante a operação.
            const [demands] = await connection.execute(
                `SELECT
                    id,
                    team_id,
                    assigned_member_id,
                    status
                 FROM demands
                 WHERE id = ?
                   AND company_id = ?
                 LIMIT 1
                 FOR UPDATE`,
                [demandId, companyId]
            );

            const demand = demands[0];

            if (!demand) {
                const error = new Error('Demanda não encontrada.');
                error.code = 'DEMAND_NOT_FOUND';
                throw error;
            }

            if (['closed', 'canceled'].includes(demand.status)) {
                const error = new Error(
                    'Não é possível atribuir uma demanda encerrada ou cancelada.'
                );
                error.code = 'DEMAND_NOT_ASSIGNABLE';
                throw error;
            }

            const possuiAtribuicaoAnterior =
                demand.team_id !== null ||
                demand.assigned_member_id !== null;

            if (exigirAtribuicaoAnterior && !possuiAtribuicaoAnterior) {
                const error = new Error(
                    'Esta demanda ainda não possui uma atribuição anterior.'
                );
                error.code = 'NO_PREVIOUS_ASSIGNMENT';
                throw error;
            }

            // Validar equipe.
            let team = null;

            if (teamId) {
                const [teams] = await connection.execute(
                    `SELECT id, name, department_id
                     FROM teams
                     WHERE id = ?
                       AND company_id = ?
                       AND status = 'active'
                     LIMIT 1`,
                    [teamId, companyId]
                );

                team = teams[0] || null;

                if (!team) {
                    const error = new Error(
                        'Equipe não encontrada ou inativa.'
                    );
                    error.code = 'TEAM_NOT_FOUND';
                    throw error;
                }
            }

            // Validar membro.
            let member = null;

            if (assignedMemberId) {
                const [members] = await connection.execute(
                    `SELECT cm.id, u.name
                     FROM company_members cm
                     INNER JOIN users u ON u.id = cm.user_id
                     WHERE cm.id = ?
                       AND cm.company_id = ?
                       AND cm.status = 'active'
                       AND u.status = 'active'
                     LIMIT 1`,
                    [assignedMemberId, companyId]
                );

                member = members[0] || null;

                if (!member) {
                    const error = new Error(
                        'Membro não encontrado ou inativo.'
                    );
                    error.code = 'MEMBER_NOT_FOUND';
                    throw error;
                }

                // Quando uma equipe é informada, o membro precisa fazer parte dela.
                if (teamId) {
                    const [teamMembership] = await connection.execute(
                        `SELECT tm.id
                         FROM team_members tm
                         INNER JOIN company_members cm
                            ON cm.id = tm.company_member_id
                         WHERE tm.team_id = ?
                           AND tm.company_member_id = ?
                           AND cm.company_id = ?
                           AND cm.status = 'active'
                         LIMIT 1`,
                        [teamId, assignedMemberId, companyId]
                    );

                    if (!teamMembership.length) {
                        const error = new Error(
                            'O membro selecionado não pertence à equipe informada.'
                        );
                        error.code = 'MEMBER_NOT_IN_TEAM';
                        throw error;
                    }
                }
            }

            if (!teamId && !assignedMemberId) {
                const error = new Error(
                    'Informe uma equipe, um membro ou ambos.'
                );
                error.code = 'EMPTY_ASSIGNMENT';
                throw error;
            }

            // Evitar movimentações sem alteração.
            if (
                String(demand.team_id || '') === String(teamId || '') &&
                String(demand.assigned_member_id || '') === String(assignedMemberId || '')
            ) {
                const error = new Error(
                    'A demanda já possui essa atribuição.'
                );
                error.code = 'SAME_ASSIGNMENT';
                throw error;
            }

            // Encerrar atribuições anteriores ainda abertas.
            await connection.execute(
                `UPDATE demand_assignments
                 SET ended_at = UTC_TIMESTAMP()
                 WHERE demand_id = ?
                   AND ended_at IS NULL`,
                [demandId]
            );

            // Registrar a nova atribuição.
            await connection.execute(
                `INSERT INTO demand_assignments (
                    demand_id,
                    team_id,
                    assigned_member_id,
                    assigned_by_member_id
                 ) VALUES (?, ?, ?, ?)`,
                [
                    demandId,
                    teamId,
                    assignedMemberId,
                    actorMemberId
                ]
            );

            // Atualizar a atribuição atual na demanda.
            await connection.execute(
                `UPDATE demands
                 SET team_id = ?,
                     assigned_member_id = ?
                 WHERE id = ?
                   AND company_id = ?`,
                [
                    teamId,
                    assignedMemberId,
                    demandId,
                    companyId
                ]
            );

            const oldValue = {
                teamId: demand.team_id,
                assignedMemberId: demand.assigned_member_id
            };

            const newValue = {
                teamId,
                teamName: team?.name || null,
                assignedMemberId,
                assignedMemberName: member?.name || null
            };

            const isTransfer = possuiAtribuicaoAnterior;

            const eventType = isTransfer
                ? 'demand.transferred'
                : 'demand.assigned';

            const description = isTransfer
                ? 'Atribuição da demanda transferida.'
                : 'Demanda atribuída.';

            // Registrar movimentação no histórico.
            await connection.execute(
                `INSERT INTO demand_history (
                    demand_id,
                    actor_member_id,
                    event_type,
                    description,
                    old_value,
                    new_value
                 ) VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    demandId,
                    actorMemberId,
                    eventType,
                    transferReason
                        ? `${description} Motivo: ${transferReason}`
                        : description,
                    JSON.stringify(oldValue),
                    JSON.stringify(newValue)
                ]
            );

            await connection.commit();

            return {
                demandId,
                teamId,
                teamName: team?.name || null,
                assignedMemberId,
                assignedMemberName: member?.name || null,
                transferred: isTransfer
            };

        } catch (error) {
            await connection.rollback();
            throw error;

        } finally {
            connection.release();
        }
    },

};

export default demandModel;
