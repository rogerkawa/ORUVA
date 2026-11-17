
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
    Activity,
    AlertCircle,
    ArrowDownRight,
    ArrowUpRight,
    CheckCircle2,
    Clock3,
    Inbox,
    RefreshCw,
    Users,
} from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';

import './Dashboard.css';

type Period = 7 | 30 | 90;

interface DashboardData {
    summary: {
        received: number;
        inProgress: number;
        pendingApproval: number;
        completed: number;
    };
    volume: {
        date: string;
        label: string;
        received: number;
        completed: number;
    }[];
    statuses: {
        status: string;
        count: number;
    }[];
    teams: {
        teamId: string;
        name: string;
        open: number;
        completed: number;
    }[];
    attention: {
        pendingApprovals: number;
        criticalOpen: number;
        pendingInvitations: number;
    };
    activities: {
        id: string;
        actorName: string;
        eventType: string;
        description: string;
        createdAt: string;
        demandNumber: string | null;
    }[];
    recentDemands: {
        id: string;
        demandNumber: string;
        title: string;
        priority: string;
        status: string;
        teamName: string | null;
        requesterName: string;
        createdAt: string;
    }[];
}

const statusLabels: Record<string, string> = {
    open: 'Aberta',
    in_progress: 'Em andamento',
    waiting_requester: 'Aguardando solicitante',
    waiting_third_party: 'Aguardando terceiros',
    resolved: 'Resolvida',
    closed: 'Encerrada',
    canceled: 'Cancelada',
    pending_approval: 'Aguardando aprovação',
    rejected: 'Rejeitada',
};

const priorityLabels: Record<string, string> = {
    low: 'Baixa',
    medium: 'Média',
    high: 'Alta',
    critical: 'Crítica',
};

const statusColors: Record<string, string> = {
    open: '#7D9F91',
    in_progress: '#6C91B8',
    waiting_requester: '#C7A46C',
    waiting_third_party: '#B49A72',
    resolved: '#5F9B7B',
    closed: '#789083',
    canceled: '#A0A5A1',
    pending_approval: '#B69A62',
    rejected: '#C87979',
};

function formatDate(value: string) {
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'short',
    }).format(new Date(value));
}

function formatRelativeDate(value: string) {
    const date = new Date(value);
    const now = new Date();
    const diff = Math.max(0, now.getTime() - date.getTime());

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Agora mesmo';
    if (minutes < 60) return `Há ${minutes} min`;
    if (hours < 24) return `Há ${hours} h`;
    if (days === 1) return 'Ontem';

    return `Há ${days} dias`;
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="dashboard-empty">
            <span className="dashboard-empty-icon">
                <Inbox size={19} />
            </span>
            <p>{message}</p>
        </div>
    );
}

function VolumeChart({ data }: { data: DashboardData['volume'] }) {
    const chart = useMemo(() => {
        if (!data.length) return null;

        const width = 700;
        const height = 220;
        const padding = { top: 18, right: 12, bottom: 30, left: 12 };

        const maxValue = Math.max(
            1,
            ...data.map(item => Math.max(item.received, item.completed))
        );

        const x = (index: number) =>
            padding.left +
            (index / Math.max(data.length - 1, 1)) *
            (width - padding.left - padding.right);

        const y = (value: number) =>
            height - padding.bottom -
            (value / maxValue) *
            (height - padding.top - padding.bottom);

        const received = data.map((item, index) =>
            `${x(index)},${y(item.received)}`
        ).join(' ');

        const completed = data.map((item, index) =>
            `${x(index)},${y(item.completed)}`
        ).join(' ');

        return {
            width,
            height,
            received,
            completed,
            receivedPoints: data.map((item, index) => ({
                x: x(index),
                y: y(item.received),
                value: item.received,
                label: item.label,
            })),
            completedPoints: data.map((item, index) => ({
                x: x(index),
                y: y(item.completed),
                value: item.completed,
                label: item.label,
            })),
        };
    }, [data]);

    if (!data.length || !chart) {
        return <EmptyState message="Ainda não existem dados para este período." />;
    }

    return (
        <div className="volume-chart">
            <div className="chart-legend">
                <span><i className="legend-dot received" /> Recebidas</span>
                <span><i className="legend-dot completed" /> Concluídas</span>
            </div>

            <svg
                viewBox={`0 0 ${chart.width} ${chart.height}`}
                className="volume-chart-svg"
                role="img"
                aria-label="Gráfico de solicitações recebidas e concluídas"
            >
                {[0, 1, 2, 3].map(line => {
                    const y = 18 + line * 57;

                    return (
                        <line
                            key={line}
                            x1="12"
                            x2="688"
                            y1={y}
                            y2={y}
                            className="chart-grid-line"
                        />
                    );
                })}

                <polyline
                    points={chart.received}
                    className="chart-line chart-line-received"
                />

                <polyline
                    points={chart.completed}
                    className="chart-line chart-line-completed"
                />

                {chart.receivedPoints.map((point, index) => (
                    <circle
                        key={`received-${index}`}
                        cx={point.x}
                        cy={point.y}
                        r="3.5"
                        className="chart-point received-point"
                    >
                        <title>{point.label}: {point.value} recebidas</title>
                    </circle>
                ))}

                {chart.completedPoints.map((point, index) => (
                    <circle
                        key={`completed-${index}`}
                        cx={point.x}
                        cy={point.y}
                        r="3.5"
                        className="chart-point completed-point"
                    >
                        <title>{point.label}: {point.value} concluídas</title>
                    </circle>
                ))}
            </svg>

            <div className="chart-x-labels">
                {data.map((item, index) => {
                    const showLabel =
                        data.length <= 7 ||
                        index === 0 ||
                        index === data.length - 1 ||
                        index % Math.ceil(data.length / 6) === 0;

                    return (
                        <span key={item.date}>
                            {showLabel ? item.label : ''}
                        </span>
                    );
                })}
            </div>
        </div>
    );
}

function StatusChart({ data }: { data: DashboardData['statuses'] }) {
    const total = data.reduce((sum, item) => sum + item.count, 0);

    if (!total) {
        return <EmptyState message="Nenhuma solicitação registrada." />;
    }

    let accumulated = 0;

    const gradient = data.map(item => {
        const start = accumulated;
        const percentage = (item.count / total) * 100;
        accumulated += percentage;

        return `${statusColors[item.status] || '#A0A5A1'} ${start}% ${accumulated}%`;
    }).join(', ');

    return (
        <div className="status-chart-content">
            <div
                className="status-donut"
                style={{ background: `conic-gradient(${gradient})` }}
                role="img"
                aria-label={`Distribuição de ${total} solicitações por status`}
            >
                <div className="status-donut-center">
                    <strong>{total}</strong>
                    <span>solicitações</span>
                </div>
            </div>

            <div className="status-legend">
                {data.map(item => (
                    <div className="status-legend-item" key={item.status}>
                        <span
                            className="status-color"
                            style={{
                                background: statusColors[item.status] || '#A0A5A1',
                            }}
                        />
                        <span className="status-name">
                            {statusLabels[item.status] || item.status}
                        </span>
                        <strong>{item.count}</strong>
                    </div>
                ))}
            </div>
        </div>
    );
}

function Dashboard() {
    const { usuario, empresas, empresaSelecionada } = useAuth();

    const empresa = empresas.find(
        item => item.company_id === empresaSelecionada
    );

    const [period, setPeriod] = useState<Period>(30);
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadDashboard = useCallback(async () => {
        try {
            setLoading(true);
            setError('');

            const response = await api.get<DashboardData>(
                `/dashboard?period=${period}`
            );

            setData(response);
        } catch (err) {
            console.error('Erro ao carregar dashboard:', err);
            setError('Não foi possível carregar os dados do painel.');
        } finally {
            setLoading(false);
        }
    }, [period]);

    useEffect(() => {
        loadDashboard();
    }, [loadDashboard]);

    const metrics = [
        {
            label: 'Solicitações recebidas',
            value: data?.summary.received ?? 0,
            icon: Inbox,
            color: 'green',
            description: `Nos últimos ${period} dias`,
        },
        {
            label: 'Em andamento',
            value: data?.summary.inProgress ?? 0,
            icon: Activity,
            color: 'blue',
            description: 'Demandas em tratamento',
        },
        {
            label: 'Aguardando aprovação',
            value: data?.summary.pendingApproval ?? 0,
            icon: Clock3,
            color: 'amber',
            description: 'Precisam de uma decisão',
        },
        {
            label: 'Concluídas',
            value: data?.summary.completed ?? 0,
            icon: CheckCircle2,
            color: 'green',
            description: `Nos últimos ${period} dias`,
        },
    ];

    return (
        <div className="dashboard-page">
            <header className="dashboard-header">
                <div>
                    <span className="dashboard-eyebrow">
                        VISÃO GERAL
                    </span>

                    <h1>
                        Olá, {usuario?.name?.split(' ')[0] || 'bem-vindo'}.
                    </h1>

                    <p>
                        Acompanhe o que está acontecendo na sua operação.
                    </p>
                </div>

                <div className="dashboard-header-actions">
                    <div className="dashboard-company">
                        <span>EMPRESA</span>
                        <strong>{empresa?.name || 'Sua empresa'}</strong>
                    </div>

                    <div className="dashboard-period">
                        <button
                            className={period === 7 ? 'active' : ''}
                            onClick={() => setPeriod(7)}
                        >
                            7 dias
                        </button>
                        <button
                            className={period === 30 ? 'active' : ''}
                            onClick={() => setPeriod(30)}
                        >
                            30 dias
                        </button>
                        <button
                            className={period === 90 ? 'active' : ''}
                            onClick={() => setPeriod(90)}
                        >
                            90 dias
                        </button>
                    </div>
                </div>
            </header>

            {error && (
                <div className="dashboard-error">
                    <AlertCircle size={18} />
                    <span>{error}</span>
                    <button onClick={loadDashboard}>
                        <RefreshCw size={15} />
                        Tentar novamente
                    </button>
                </div>
            )}

            <section className="dashboard-metrics">
                {metrics.map(metric => {
                    const Icon = metric.icon;

                    return (
                        <article className="metric-card" key={metric.label}>
                            <div className="metric-card-top">
                                <span>{metric.label}</span>
                                <div className={`metric-icon ${metric.color}`}>
                                    <Icon size={19} />
                                </div>
                            </div>

                            <strong className="metric-value">
                                {loading ? '—' : metric.value.toLocaleString('pt-BR')}
                            </strong>

                            <span className="metric-description">
                                {metric.description}
                            </span>
                        </article>
                    );
                })}
            </section>

            <section className="dashboard-grid dashboard-grid-primary">
                <article className="dashboard-card volume-card">
                    <div className="dashboard-card-heading">
                        <div>
                            <span className="card-overline">MOVIMENTAÇÃO</span>
                            <h2>Volume de solicitações</h2>
                            <p>Entradas e conclusões ao longo do período.</p>
                        </div>
                        <span className="card-heading-icon">
                            <Activity size={18} />
                        </span>
                    </div>

                    {loading
                        ? <div className="dashboard-loading">Carregando gráfico...</div>
                        : <VolumeChart data={data?.volume || []} />
                    }
                </article>

                <article className="dashboard-card status-card">
                    <div className="dashboard-card-heading">
                        <div>
                            <span className="card-overline">PANORAMA</span>
                            <h2>Solicitações por status</h2>
                            <p>Como está distribuída a operação.</p>
                        </div>
                    </div>

                    {loading
                        ? <div className="dashboard-loading">Carregando gráfico...</div>
                        : <StatusChart data={data?.statuses || []} />
                    }
                </article>
            </section>

            <section className="dashboard-grid dashboard-grid-secondary">
                <article className="dashboard-card teams-card">
                    <div className="dashboard-card-heading">
                        <div>
                            <span className="card-overline">PRODUTIVIDADE</span>
                            <h2>Demandas por equipe</h2>
                            <p>Volume aberto e concluído por equipe.</p>
                        </div>
                        <Users size={19} className="heading-muted-icon" />
                    </div>

                    {loading ? (
                        <div className="dashboard-loading">Carregando equipes...</div>
                    ) : !data?.teams.length ? (
                        <EmptyState message="Nenhuma equipe com demandas neste período." />
                    ) : (
                        <div className="team-chart">
                            {data.teams.map(team => {
                                const total = team.open + team.completed;
                                const openWidth = total
                                    ? (team.open / total) * 100
                                    : 0;
                                const completedWidth = total
                                    ? (team.completed / total) * 100
                                    : 0;

                                return (
                                    <div className="team-chart-item" key={team.teamId}>
                                        <div className="team-chart-info">
                                            <strong>{team.name}</strong>
                                            <span>{total} demandas</span>
                                        </div>

                                        <div className="team-chart-bar">
                                            <span
                                                className="team-bar-open"
                                                style={{ width: `${openWidth}%` }}
                                            />
                                            <span
                                                className="team-bar-completed"
                                                style={{ width: `${completedWidth}%` }}
                                            />
                                        </div>

                                        <div className="team-chart-legend">
                                            <span><i className="legend-dot team-open" /> {team.open} abertas</span>
                                            <span><i className="legend-dot team-completed" /> {team.completed} concluídas</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </article>

                <article className="dashboard-card attention-card">
                    <div className="dashboard-card-heading">
                        <div>
                            <span className="card-overline">ACOMPANHAMENTO</span>
                            <h2>Precisa da sua atenção</h2>
                            <p>Pontos que merecem acompanhamento.</p>
                        </div>
                        <AlertCircle size={19} className="heading-muted-icon" />
                    </div>

                    {loading ? (
                        <div className="dashboard-loading">Verificando pendências...</div>
                    ) : (
                        <div className="attention-list">
                            <div className="attention-item">
                                <span className="attention-icon amber">
                                    <Clock3 size={17} />
                                </span>
                                <div>
                                    <strong>Aprovações pendentes</strong>
                                    <span>Aguardando uma decisão</span>
                                </div>
                                <b>{data?.attention.pendingApprovals ?? 0}</b>
                            </div>

                            <div className="attention-item">
                                <span className="attention-icon red">
                                    <AlertCircle size={17} />
                                </span>
                                <div>
                                    <strong>Demandas críticas</strong>
                                    <span>Prioridade crítica em aberto</span>
                                </div>
                                <b>{data?.attention.criticalOpen ?? 0}</b>
                            </div>

                            <div className="attention-item">
                                <span className="attention-icon green">
                                    <Users size={17} />
                                </span>
                                <div>
                                    <strong>Convites pendentes</strong>
                                    <span>Aguardando entrada na equipe</span>
                                </div>
                                <b>{data?.attention.pendingInvitations ?? 0}</b>
                            </div>
                        </div>
                    )}
                </article>
            </section>

            <section className="dashboard-grid dashboard-grid-bottom">
                <article className="dashboard-card activity-card">
                    <div className="dashboard-card-heading">
                        <div>
                            <span className="card-overline">ACONTECIMENTOS</span>
                            <h2>Atividades recentes</h2>
                            <p>Últimas movimentações na empresa.</p>
                        </div>
                    </div>

                    {loading ? (
                        <div className="dashboard-loading">Carregando atividades...</div>
                    ) : !data?.activities.length ? (
                        <EmptyState message="As atividades aparecerão aqui." />
                    ) : (
                        <div className="activity-list">
                            {data.activities.map(activity => (
                                <div className="activity-item" key={activity.id}>
                                    <span className="activity-avatar">
                                        {activity.actorName?.charAt(0)?.toUpperCase() || 'U'}
                                    </span>
                                    <div className="activity-content">
                                        <strong>{activity.actorName}</strong>
                                        <p>{activity.description}</p>
                                        {activity.demandNumber && (
                                            <span>{activity.demandNumber}</span>
                                        )}
                                    </div>
                                    <time>{formatRelativeDate(activity.createdAt)}</time>
                                </div>
                            ))}
                        </div>
                    )}
                </article>

                <article className="dashboard-card recent-card">
                    <div className="dashboard-card-heading">
                        <div>
                            <span className="card-overline">ACOMPANHAMENTO</span>
                            <h2>Solicitações recentes</h2>
                            <p>Demandas abertas recentemente.</p>
                        </div>
                    </div>

                    {loading ? (
                        <div className="dashboard-loading">Carregando solicitações...</div>
                    ) : !data?.recentDemands.length ? (
                        <EmptyState message="Nenhuma solicitação encontrada." />
                    ) : (
                        <div className="recent-list">
                            {data.recentDemands.map(demand => (
                                <div className="recent-demand" key={demand.id}>
                                    <div className="recent-demand-main">
                                        <span>{demand.demandNumber}</span>
                                        <strong>{demand.title}</strong>
                                        <small>
                                            {demand.teamName || 'Sem equipe'} · {formatDate(demand.createdAt)}
                                        </small>
                                    </div>

                                    <div className="recent-demand-meta">
                                        <span className={`priority-badge priority-${demand.priority}`}>
                                            {priorityLabels[demand.priority] || demand.priority}
                                        </span>
                                        <span className={`status-badge status-${demand.status}`}>
                                            {statusLabels[demand.status] || demand.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </article>
            </section>
        </div>
    );
}

export default Dashboard;
