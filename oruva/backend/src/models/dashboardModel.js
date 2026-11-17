
import conect from '../config/database.js';

const dashboardModel = {
    async buscar(companyId, period) {
        const [summaryRows] = await conect.execute(
            `SELECT
                COUNT(*) AS received,

                SUM(
                    CASE
                        WHEN status IN (
                            'open',
                            'in_progress',
                            'waiting_requester',
                            'waiting_third_party'
                        ) THEN 1 ELSE 0
                    END
                ) AS in_progress,

                SUM(
                    CASE
                        WHEN status = 'pending_approval'
                        THEN 1 ELSE 0
                    END
                ) AS pending_approval,

                SUM(
                    CASE
                        WHEN resolved_at IS NOT NULL
                         AND resolved_at >= DATE_SUB(
                            UTC_TIMESTAMP(),
                            INTERVAL ? DAY
                         )
                        THEN 1 ELSE 0
                    END
                ) AS completed

             FROM demands
             WHERE company_id = ?
               AND created_at >= DATE_SUB(
                    UTC_TIMESTAMP(),
                    INTERVAL ? DAY
               )`,
            [period, companyId, period]
        );

        const [volumeRows] = await conect.execute(
            `
        SELECT
            DATE_FORMAT(created_at, '%Y-%m-%d') AS date,
            COUNT(*) AS received
        FROM demands
        WHERE company_id = ?
          AND created_at >= DATE_SUB(
                UTC_TIMESTAMP(),
                INTERVAL ? DAY
          )
        GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
        ORDER BY date ASC
    `,
            [companyId, period]
        );

        const [completedRows] = await conect.execute(
    `
        SELECT
            DATE_FORMAT(resolved_at, '%Y-%m-%d') AS date,
            COUNT(*) AS completed
        FROM demands
        WHERE company_id = ?
          AND resolved_at >= DATE_SUB(
                UTC_TIMESTAMP(),
                INTERVAL ? DAY
          )
        GROUP BY DATE_FORMAT(resolved_at, '%Y-%m-%d')
        ORDER BY date ASC
    `,
    [companyId, period]
);

        const volumeMap = new Map();

        for (const item of volumeRows) {
            volumeMap.set(item.date, {
                date: item.date,
                received: Number(item.received),
                completed: 0
            });
        }

        for (const item of completedRows) {
            const current = volumeMap.get(item.date) || {
                date: item.date,
                received: 0,
                completed: 0
            };

            current.completed = Number(item.completed);
            volumeMap.set(item.date, current);
        }

        const volume = [];

        for (let index = period - 1; index >= 0; index--) {
            const date = new Date();
            date.setUTCHours(0, 0, 0, 0);
            date.setUTCDate(date.getUTCDate() - index);

            const dateKey = date.toISOString().slice(0, 10);
            const current = volumeMap.get(dateKey);

            volume.push({
                date: dateKey,
                label: new Intl.DateTimeFormat('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    timeZone: 'UTC'
                }).format(date),
                received: current?.received || 0,
                completed: current?.completed || 0
            });
        }

        const [statusRows] = await conect.execute(
            `SELECT
                status,
                COUNT(*) AS count
             FROM demands
             WHERE company_id = ?
               AND created_at >= DATE_SUB(
                    UTC_TIMESTAMP(),
                    INTERVAL ? DAY
               )
             GROUP BY status
             ORDER BY count DESC`,
            [companyId, period]
        );

        const [teamRows] = await conect.execute(
            `SELECT
                t.id AS team_id,
                t.name,

                SUM(
                    CASE
                        WHEN d.id IS NOT NULL
                         AND d.status NOT IN (
                            'resolved',
                            'closed',
                            'canceled',
                            'rejected'
                         )
                        THEN 1 ELSE 0
                    END
                ) AS open,

                SUM(
                    CASE
                        WHEN d.id IS NOT NULL
                         AND d.resolved_at IS NOT NULL
                        THEN 1 ELSE 0
                    END
                ) AS completed

             FROM teams t

             LEFT JOIN demands d
                ON d.team_id = t.id
               AND d.company_id = t.company_id
               AND d.created_at >= DATE_SUB(
                    UTC_TIMESTAMP(),
                    INTERVAL ? DAY
               )

             WHERE t.company_id = ?
               AND t.status = 'active'

             GROUP BY t.id, t.name
             HAVING COUNT(d.id) > 0
             ORDER BY COUNT(d.id) DESC
             LIMIT 8`,
            [period, companyId]
        );

        const [attentionRows] = await conect.execute(
            `SELECT
                (
                    SELECT COUNT(*)
                    FROM demand_approvals da
                    INNER JOIN demands d
                        ON d.id = da.demand_id
                    WHERE d.company_id = ?
                      AND d.status = 'pending_approval'
                      AND da.status = 'pending'
                      AND NOT EXISTS (
                            SELECT 1
                            FROM demand_approvals previous
                            WHERE previous.demand_id = da.demand_id
                              AND previous.step_order < da.step_order
                              AND previous.status <> 'approved'
                      )
                ) AS pending_approvals,

                (
                    SELECT COUNT(*)
                    FROM demands
                    WHERE company_id = ?
                      AND priority = 'critical'
                      AND status IN (
                        'open',
                        'in_progress',
                        'waiting_requester',
                        'waiting_third_party'
                      )
                ) AS critical_open,

                (
                    SELECT COUNT(*)
                    FROM company_invitations
                    WHERE company_id = ?
                      AND accepted_at IS NULL
                      AND revoked_at IS NULL
                      AND expires_at > UTC_TIMESTAMP()
                ) AS pending_invitations`,
            [companyId, companyId, companyId]
        );

        const [activityRows] = await conect.execute(
            `SELECT
                CAST(dh.id AS CHAR) AS id,
                COALESCE(u.name, 'Usuário') AS actor_name,
                dh.event_type,
                dh.description,
                dh.created_at,
                d.demand_number

             FROM demand_history dh

             INNER JOIN demands d
                ON d.id = dh.demand_id

             LEFT JOIN company_members cm
                ON cm.id = dh.actor_member_id
               AND cm.company_id = d.company_id

             LEFT JOIN users u
                ON u.id = cm.user_id

             WHERE d.company_id = ?

             ORDER BY dh.created_at DESC, dh.id DESC
             LIMIT 6`,
            [companyId]
        );

        const [recentRows] = await conect.execute(
            `SELECT
                CAST(d.id AS CHAR) AS id,
                d.demand_number,
                d.title,
                d.priority,
                d.status,
                t.name AS team_name,
                requester.name AS requester_name,
                d.created_at

             FROM demands d

             LEFT JOIN teams t
                ON t.id = d.team_id

             INNER JOIN company_members requester_member
                ON requester_member.id = d.requester_member_id

             INNER JOIN users requester
                ON requester.id = requester_member.user_id

             WHERE d.company_id = ?

             ORDER BY d.created_at DESC
             LIMIT 6`,
            [companyId]
        );

        const summary = summaryRows[0];

        return {
            summary: {
                received: Number(summary.received || 0),
                inProgress: Number(summary.in_progress || 0),
                pendingApproval: Number(summary.pending_approval || 0),
                completed: Number(summary.completed || 0)
            },

            volume,

            statuses: statusRows.map(item => ({
                status: item.status,
                count: Number(item.count)
            })),

            teams: teamRows.map(item => ({
                teamId: String(item.team_id),
                name: item.name,
                open: Number(item.open),
                completed: Number(item.completed)
            })),

            attention: {
                pendingApprovals: Number(
                    attentionRows[0].pending_approvals || 0
                ),
                criticalOpen: Number(
                    attentionRows[0].critical_open || 0
                ),
                pendingInvitations: Number(
                    attentionRows[0].pending_invitations || 0
                )
            },

            activities: activityRows.map(item => ({
                id: String(item.id),
                actorName: item.actor_name,
                eventType: item.event_type,
                description: item.description,
                createdAt: item.created_at,
                demandNumber: item.demand_number
            })),

            recentDemands: recentRows.map(item => ({
                id: String(item.id),
                demandNumber: item.demand_number,
                title: item.title,
                priority: item.priority,
                status: item.status,
                teamName: item.team_name,
                requesterName: item.requester_name,
                createdAt: item.created_at
            }))
        };
    }
};

export default dashboardModel;
