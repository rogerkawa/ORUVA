
import conect from '../config/database.js';

const approvalModel = {

    // Listar etapas configuradas para uma categoria.
    async listarEtapasCategoria({ categoryId, companyId }) {
        const [categorias] = await conect.execute(
            `SELECT id, name, requires_approval
             FROM categories
             WHERE id = ?
               AND company_id = ?
             LIMIT 1`,
            [categoryId, companyId]
        );

        if (!categorias.length) {
            throw new Error('CATEGORY_NOT_FOUND');
        }

        const [steps] = await conect.execute(
            `SELECT
                cas.id,
                cas.approver_member_id,
                cas.step_order,
                cm.role,
                cm.status AS member_status,
                u.status AS user_status,
                u.name AS approver_name,
                u.email AS approver_email
             FROM category_approval_steps cas
             INNER JOIN company_members cm
                ON cm.id = cas.approver_member_id
               AND cm.company_id = ?
             INNER JOIN users u
                ON u.id = cm.user_id
             WHERE cas.category_id = ?
             ORDER BY cas.step_order ASC`,
            [companyId, categoryId]
        );

        return {
            category: categorias[0],
            steps
        };
    },

    // Substituir todas as etapas de aprovação de uma categoria.
    async atualizarEtapasCategoria({
        categoryId,
        companyId,
        steps
    }) {
        const conexao = await conect.getConnection();

        try {
            await conexao.beginTransaction();

            const [categorias] = await conexao.execute(
                `SELECT id, requires_approval, status
                 FROM categories
                 WHERE id = ?
                   AND company_id = ?
                 LIMIT 1
                 FOR UPDATE`,
                [categoryId, companyId]
            );

            if (!categorias.length) {
                throw new Error('CATEGORY_NOT_FOUND');
            }

            if (categorias[0].status !== 'active') {
                throw new Error('CATEGORY_INACTIVE');
            }

            if (!Array.isArray(steps) || !steps.length) {
                throw new Error('APPROVAL_STEPS_REQUIRED');
            }

            // Validar formato dos IDs.
            const invalidId = steps.some(
                memberId =>
                    typeof memberId !== 'string' ||
                    !/^[1-9]\d*$/.test(memberId)
            );

            if (invalidId) {
                throw new Error('INVALID_APPROVER_ID');
            }

            // Impedir que um membro apareça em mais de uma etapa.
            const membrosUnicos = new Set(steps);

            if (membrosUnicos.size !== steps.length) {
                throw new Error('DUPLICATE_APPROVER');
            }

            // Validar todos os aprovadores.
            for (const memberId of steps) {
                const [membros] = await conexao.execute(
                    `SELECT
                        cm.id,
                        cm.status AS member_status,
                        u.status AS user_status
                     FROM company_members cm
                     INNER JOIN users u
                        ON u.id = cm.user_id
                     WHERE cm.id = ?
                       AND cm.company_id = ?
                     LIMIT 1`,
                    [memberId, companyId]
                );

                const membro = membros[0];

                if (!membro) {
                    throw new Error('APPROVER_NOT_FOUND');
                }

                if (
                    membro.member_status !== 'active' ||
                    membro.user_status !== 'active'
                ) {
                    throw new Error('APPROVER_NOT_ACTIVE');
                }
            }

            // Remover configuração anterior.
            await conexao.execute(
                `DELETE FROM category_approval_steps
                 WHERE category_id = ?`,
                [categoryId]
            );

            // Criar novas etapas na ordem recebida.
            for (let index = 0; index < steps.length; index++) {
                await conexao.execute(
                    `INSERT INTO category_approval_steps (
                        category_id,
                        approver_member_id,
                        step_order
                    ) VALUES (?, ?, ?)`,
                    [
                        categoryId,
                        steps[index],
                        index + 1
                    ]
                );
            }

            await conexao.execute(
                `UPDATE categories
                 SET requires_approval = TRUE
                 WHERE id = ?
                   AND company_id = ?`,
                [categoryId, companyId]
            );

            await conexao.commit();

            return {
                categoryId,
                totalSteps: steps.length
            };

        } catch (error) {
            await conexao.rollback();
            throw error;

        } finally {
            conexao.release();
        }
    },

    // Remover configuração e desativar a exigência de aprovação.
    async removerEtapasCategoria({ categoryId, companyId }) {
        const conexao = await conect.getConnection();

        try {
            await conexao.beginTransaction();

            const [categorias] = await conexao.execute(
                `SELECT id
                 FROM categories
                 WHERE id = ?
                   AND company_id = ?
                 LIMIT 1
                 FOR UPDATE`,
                [categoryId, companyId]
            );

            if (!categorias.length) {
                throw new Error('CATEGORY_NOT_FOUND');
            }

            await conexao.execute(
                `DELETE FROM category_approval_steps
                 WHERE category_id = ?`,
                [categoryId]
            );

            await conexao.execute(
                `UPDATE categories
                 SET requires_approval = FALSE
                 WHERE id = ?
                   AND company_id = ?`,
                [categoryId, companyId]
            );

            await conexao.commit();

            return true;

        } catch (error) {
            await conexao.rollback();
            throw error;

        } finally {
            conexao.release();
        }
    },

    // Listar somente as aprovações liberadas para o membro.
    async listarPendentes({
        companyId,
        memberId,
        limit = 50,
        offset = 0
    }) {
        const [rows] = await conect.execute(
            `SELECT
                da.id AS approval_id,
                da.step_order,
                da.created_at AS requested_at,

                d.id AS demand_id,
                d.demand_number,
                d.title,
                d.description,
                d.priority,
                d.type,

                c.name AS category_name,
                requester_user.name AS requester_name

             FROM demand_approvals da

             INNER JOIN demands d
                ON d.id = da.demand_id

             INNER JOIN categories c
                ON c.id = d.category_id

             INNER JOIN company_members requester
                ON requester.id = d.requester_member_id

             INNER JOIN users requester_user
                ON requester_user.id = requester.user_id

             INNER JOIN company_members approver
                ON approver.id = da.approver_member_id
               AND approver.company_id = d.company_id
               AND approver.status = 'active'

             INNER JOIN users approver_user
                ON approver_user.id = approver.user_id
               AND approver_user.status = 'active'

             WHERE d.company_id = ?
               AND d.status = 'pending_approval'
               AND da.approver_member_id = ?
               AND da.status = 'pending'
               AND d.requester_member_id <> ?

               AND NOT EXISTS (
                    SELECT 1
                    FROM demand_approvals previous
                    WHERE previous.demand_id = da.demand_id
                      AND previous.step_order < da.step_order
                      AND previous.status <> 'approved'
               )

             ORDER BY da.created_at ASC

             LIMIT ? OFFSET ?`,
            [
                companyId,
                memberId,
                memberId,
                limit,
                offset
            ]
        );

        return rows;
    },

    // Consultar o fluxo de aprovação de uma demanda.
    async buscarFluxoDemanda({
        demandId,
        companyId,
        memberId,
        role
    }) {
        const [demandas] = await conect.execute(
            `SELECT
                id,
                demand_number,
                title,
                status,
                requester_member_id,
                opened_by_member_id
             FROM demands
             WHERE id = ?
               AND company_id = ?
             LIMIT 1`,
            [demandId, companyId]
        );

        if (!demandas.length) {
            throw new Error('DEMAND_NOT_FOUND');
        }

        const demanda = demandas[0];

        if (
            role === 'collaborator' &&
            String(demanda.requester_member_id) !== String(memberId) &&
            String(demanda.opened_by_member_id) !== String(memberId)
        ) {
            throw new Error('DEMAND_ACCESS_DENIED');
        }

        const [steps] = await conect.execute(
            `SELECT
                da.id,
                da.approver_member_id,
                da.step_order,
                da.status,
                da.comments,
                da.decided_at,
                da.created_at,
                u.name AS approver_name

             FROM demand_approvals da

             INNER JOIN company_members cm
                ON cm.id = da.approver_member_id
               AND cm.company_id = ?

             INNER JOIN users u
                ON u.id = cm.user_id

             WHERE da.demand_id = ?

             ORDER BY da.step_order ASC`,
            [companyId, demandId]
        );

        return {
            demand: demanda,
            steps
        };
    },

    // Aprovar ou rejeitar uma etapa.
    async decidir({
        approvalId,
        companyId,
        actorMemberId,
        decision,
        comments = null
    }) {
        const conexao = await conect.getConnection();

        try {
            await conexao.beginTransaction();

            // Validar a decisão.
            if (!['approve', 'reject'].includes(decision)) {
                throw new Error('INVALID_APPROVAL_DECISION');
            }

            // Validar comentários.
            if (comments !== null) {
                if (typeof comments !== 'string') {
                    throw new Error('INVALID_APPROVAL_COMMENTS');
                }

                comments = comments.trim();

                if (comments.length > 2000) {
                    throw new Error('APPROVAL_COMMENTS_TOO_LONG');
                }

                if (!comments) {
                    comments = null;
                }
            }

            /*
             * Primeiro, descobrir a demanda vinculada à aprovação.
             * Essa consulta não bloqueia registros.
             */
            const [referencias] = await conexao.execute(
                `SELECT demand_id
                 FROM demand_approvals
                 WHERE id = ?
                 LIMIT 1`,
                [approvalId]
            );

            if (!referencias.length) {
                throw new Error('APPROVAL_NOT_FOUND');
            }

            const demandId = referencias[0].demand_id;

            /*
             * BLOQUEIO PRINCIPAL:
             * bloquear primeiro a demanda.
             *
             * Assim, duas decisões simultâneas do mesmo fluxo
             * precisam aguardar uma à outra.
             */
            const [demandas] = await conexao.execute(
                `SELECT
                    id,
                    demand_number,
                    status,
                    requester_member_id
                 FROM demands
                 WHERE id = ?
                   AND company_id = ?
                 LIMIT 1
                 FOR UPDATE`,
                [demandId, companyId]
            );

            if (!demandas.length) {
                throw new Error('DEMAND_NOT_FOUND');
            }

            const demand = demandas[0];

            // Depois de bloquear a demanda, bloquear a aprovação.
            const [aprovacoes] = await conexao.execute(
                `SELECT
                    id,
                    demand_id,
                    approver_member_id,
                    step_order,
                    status
                 FROM demand_approvals
                 WHERE id = ?
                   AND demand_id = ?
                 LIMIT 1
                 FOR UPDATE`,
                [approvalId, demandId]
            );

            if (!aprovacoes.length) {
                throw new Error('APPROVAL_NOT_FOUND');
            }

            const approval = aprovacoes[0];

            // Garantir que o membro seja o aprovador designado.
            if (
                String(approval.approver_member_id) !==
                String(actorMemberId)
            ) {
                throw new Error('APPROVAL_ACCESS_DENIED');
            }

            if (approval.status !== 'pending') {
                throw new Error('APPROVAL_ALREADY_DECIDED');
            }

            if (demand.status !== 'pending_approval') {
                throw new Error('DEMAND_NOT_AWAITING_APPROVAL');
            }

            // Impedir autoaprovação.
            if (
                String(demand.requester_member_id) ===
                String(actorMemberId)
            ) {
                throw new Error('SELF_APPROVAL_NOT_ALLOWED');
            }

            // Validar vínculo e conta do aprovador.
            const [membros] = await conexao.execute(
                `SELECT
                    cm.id,
                    cm.status AS member_status,
                    u.status AS user_status
                 FROM company_members cm
                 INNER JOIN users u
                    ON u.id = cm.user_id
                 WHERE cm.id = ?
                   AND cm.company_id = ?
                 LIMIT 1`,
                [actorMemberId, companyId]
            );

            const membro = membros[0];

            if (
                !membro ||
                membro.member_status !== 'active' ||
                membro.user_status !== 'active'
            ) {
                throw new Error('MEMBER_INACTIVE');
            }

            // Impedir decisão de uma etapa antes das anteriores.
            const [etapasAnteriores] = await conexao.execute(
                `SELECT COUNT(*) AS total
                 FROM demand_approvals
                 WHERE demand_id = ?
                   AND step_order < ?
                   AND status <> 'approved'`,
                [
                    demandId,
                    approval.step_order
                ]
            );

            if (Number(etapasAnteriores[0].total) > 0) {
                throw new Error('APPROVAL_STEP_LOCKED');
            }

            const approvalStatus = decision === 'approve'
                ? 'approved'
                : 'rejected';

            // Registrar decisão.
            await conexao.execute(
                `UPDATE demand_approvals
                 SET
                    status = ?,
                    comments = ?,
                    decided_at = UTC_TIMESTAMP()
                 WHERE id = ?
                   AND status = 'pending'`,
                [
                    approvalStatus,
                    comments,
                    approvalId
                ]
            );

            // Registrar histórico da etapa.
            const eventType = decision === 'approve'
                ? 'demand.approval_approved'
                : 'demand.approval_rejected';

            const description = decision === 'approve'
                ? `Etapa ${approval.step_order} aprovada.`
                : `Demanda rejeitada na etapa ${approval.step_order}.`;

            await conexao.execute(
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
                    description,
                    JSON.stringify({
                        status: 'pending'
                    }),
                    JSON.stringify({
                        status: approvalStatus,
                        comments
                    })
                ]
            );

            let demandStatus = 'pending_approval';

            // Se rejeitada, encerrar o fluxo.
            if (decision === 'reject') {
                demandStatus = 'rejected';

                await conexao.execute(
                    `UPDATE demands
                     SET status = 'rejected'
                     WHERE id = ?
                       AND company_id = ?`,
                    [demandId, companyId]
                );

                await conexao.execute(
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
                        'demand.rejected',
                        'A demanda foi rejeitada durante o fluxo de aprovação.',
                        JSON.stringify({
                            status: 'pending_approval'
                        }),
                        JSON.stringify({
                            status: 'rejected'
                        })
                    ]
                );

            } else {
                // Verificar se ainda existem etapas pendentes.
                const [pendentes] = await conexao.execute(
                    `SELECT COUNT(*) AS total
                     FROM demand_approvals
                     WHERE demand_id = ?
                       AND status = 'pending'`,
                    [demandId]
                );

                // Todas as etapas aprovadas: liberar demanda.
                if (Number(pendentes[0].total) === 0) {
                    demandStatus = 'open';

                    await conexao.execute(
                        `UPDATE demands
                         SET status = 'open'
                         WHERE id = ?
                           AND company_id = ?`,
                        [demandId, companyId]
                    );

                    await conexao.execute(
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
                            'demand.approval_completed',
                            'Todas as etapas de aprovação foram concluídas. A demanda foi liberada.',
                            JSON.stringify({
                                status: 'pending_approval'
                            }),
                            JSON.stringify({
                                status: 'open'
                            })
                        ]
                    );
                }
            }

            await conexao.commit();

            return {
                approvalId,
                demandId,
                demandNumber: demand.demand_number,
                approvalStatus,
                demandStatus
            };

        } catch (error) {
            await conexao.rollback();
            throw error;

        } finally {
            conexao.release();
        }
    }
};

export default approvalModel;
