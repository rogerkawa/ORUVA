
import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type FormEvent
} from 'react';

import {
    Search,
    Plus,
    RefreshCw,
    SlidersHorizontal,
    Inbox,
    Clock3,
    CheckCircle2,
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    X,
    CalendarDays,
    Layers3,
} from 'lucide-react';

import { api } from '../../services/api';

import './Solicitacoes.css';

type DemandStatus =
    | 'open'
    | 'in_progress'
    | 'waiting_requester'
    | 'waiting_third_party'
    | 'resolved'
    | 'closed'
    | 'canceled'
    | 'pending_approval'
    | 'rejected';

type Priority = 'low' | 'medium' | 'high' | 'critical';

interface Demand {
    id: string;
    demand_number: string;
    type: 'ticket' | 'service_request';
    title: string;
    description: string | null;
    priority: Priority;
    status: DemandStatus;
    source: string;
    category_name: string;
    team_name: string | null;
    requester_name: string;
    assigned_name: string | null;
    created_at: string;
    updated_at: string;
    first_response_due_at: string | null;
    resolution_due_at: string | null;
}

interface Category {
    id: string;
    name: string;
    status: string;
    demand_type: 'ticket' | 'service_request' | 'both';
}

interface Team {
    id: string;
    name: string;
    status: string;
}

interface DemandResponse {
    demands: Demand[];
    total: number;
    page: number;
    totalPages: number;
}

interface CategoriesResponse {
    categorias: Category[];
}

interface TeamsResponse {
    equipes: Team[];
}

interface CreateDemandResponse {
    message: string;
    demand: {
        id: string;
        demandNumber: string;
        status: DemandStatus;
    };
}

const STATUS_OPTIONS: { value: DemandStatus; label: string }[] = [
    { value: 'open', label: 'Aberta' },
    { value: 'in_progress', label: 'Em andamento' },
    { value: 'waiting_requester', label: 'Aguardando solicitante' },
    { value: 'waiting_third_party', label: 'Aguardando terceiros' },
    { value: 'pending_approval', label: 'Aguardando aprovação' },
    { value: 'resolved', label: 'Resolvida' },
    { value: 'closed', label: 'Fechada' },
    { value: 'canceled', label: 'Cancelada' },
    { value: 'rejected', label: 'Rejeitada' }
];

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
    { value: 'low', label: 'Baixa' },
    { value: 'medium', label: 'Média' },
    { value: 'high', label: 'Alta' },
    { value: 'critical', label: 'Crítica' }
];

function formatDate(date: string) {
    if (!date) return '—';

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) return '—';

    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    }).format(parsed);
}

function formatStatus(status: DemandStatus) {
    return STATUS_OPTIONS.find((item) => item.value === status)?.label ?? status;
}

function formatPriority(priority: Priority) {
    return PRIORITY_OPTIONS.find((item) => item.value === priority)?.label ?? priority;
}

function getInitials(name: string) {
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase();
}

function Solicitacoes() {
    const [demands, setDemands] = useState<Demand[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [teamFilter, setTeamFilter] = useState('');

    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    const [modalOpen, setModalOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [formError, setFormError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const [form, setForm] = useState({
        title: '',
        description: '',
        categoryId: '',
        teamId: '',
        type: 'ticket' as 'ticket' | 'service_request',
        priority: 'medium' as Priority
    });

    const loadDemands = useCallback(async (showRefresh = false) => {
        try {
            if (showRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            setError('');

            const params = new URLSearchParams({
                page: String(page),
                limit: '10'
            });

            if (statusFilter) params.set('status', statusFilter);
            if (priorityFilter) params.set('priority', priorityFilter);
            if (categoryFilter) params.set('categoryId', categoryFilter);
            if (teamFilter) params.set('teamId', teamFilter);

            const response = await api.get<DemandResponse>(
                `/demands?${params.toString()}`
            );

            setDemands(response.demands ?? []);
            setTotal(response.total ?? 0);
            setTotalPages(response.totalPages ?? 0);
        } catch (err) {
            console.error('Erro ao carregar solicitações:', err);
            setError(
                err instanceof Error
                    ? err.message
                    : 'Não foi possível carregar as solicitações.'
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [page, statusFilter, priorityFilter, categoryFilter, teamFilter]);

    const loadOptions = useCallback(async () => {
        try {
            const [categoryResponse, teamResponse] = await Promise.all([
                api.get<CategoriesResponse>('/categories'),
                api.get<TeamsResponse>('/teams')
            ]);

            setCategories(
                (categoryResponse.categorias ?? []).filter(
                    (category) => category.status === 'active'
                )
            );

            setTeams(
                (teamResponse.equipes ?? []).filter(
                    (team) => team.status === 'active'
                )
            );
        } catch (err) {
            console.error('Erro ao carregar categorias e equipes:', err);
        }
    }, []);

    useEffect(() => {
        loadDemands();
    }, [loadDemands]);

    useEffect(() => {
        loadOptions();
    }, [loadOptions]);

    const filteredDemands = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();

        if (!normalizedSearch) return demands;

        return demands.filter((demand) => {
            const searchable = [
                demand.title,
                demand.demand_number,
                demand.requester_name,
                demand.category_name,
                demand.team_name
            ].filter(Boolean).join(' ').toLowerCase();

            return searchable.includes(normalizedSearch);
        });
    }, [demands, search]);

    const summary = useMemo(() => ({
        open: demands.filter((item) => item.status === 'open').length,
        progress: demands.filter((item) => item.status === 'in_progress').length,
        waiting: demands.filter((item) =>
            ['waiting_requester', 'waiting_third_party', 'pending_approval']
                .includes(item.status)
        ).length,
        resolved: demands.filter((item) =>
            ['resolved', 'closed'].includes(item.status)
        ).length
    }), [demands]);

    const selectedCategory = categories.find(
        (category) => category.id === form.categoryId
    );

    const availableTypes = selectedCategory
        ? selectedCategory.demand_type === 'both'
            ? ['ticket', 'service_request']
            : [selectedCategory.demand_type]
        : ['ticket', 'service_request'];

    function updateFilter(
        setter: (value: string) => void,
        value: string
    ) {
        setter(value);
        setPage(1);
    }

    function openCreateModal() {
        setForm({
            title: '',
            description: '',
            categoryId: '',
            teamId: '',
            type: 'ticket',
            priority: 'medium'
        });

        setFormError('');
        setSuccessMessage('');
        setModalOpen(true);
    }

    function closeCreateModal() {
        if (creating) return;

        setModalOpen(false);
        setFormError('');
    }

    async function handleCreateDemand(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!form.categoryId) {
            setFormError('Selecione uma categoria para continuar.');
            return;
        }

        if (!form.title.trim()) {
            setFormError('Informe o título da solicitação.');
            return;
        }

        try {
            setCreating(true);
            setFormError('');

            const payload = {
                categoryId: form.categoryId,
                teamId: form.teamId || null,
                type: form.type,
                title: form.title.trim(),
                description: form.description.trim() || null,
                priority: form.priority,
                source: 'manual'
            };

            const response = await api.post<CreateDemandResponse>(
                '/demands',
                payload
            );

            setModalOpen(false);
            setSuccessMessage(response.message || 'Solicitação criada com sucesso.');

            setPage(1);

            if (page !== 1) {
                return;
            }

            await loadDemands(true);
        } catch (err) {
            console.error('Erro ao criar solicitação:', err);

            setFormError(
                err instanceof Error
                    ? err.message
                    : 'Não foi possível criar a solicitação.'
            );
        } finally {
            setCreating(false);
        }
    }

    function clearFilters() {
        setSearch('');
        setStatusFilter('');
        setPriorityFilter('');
        setCategoryFilter('');
        setTeamFilter('');
        setPage(1);
    }

    const hasFilters = Boolean(
        search ||
        statusFilter ||
        priorityFilter ||
        categoryFilter ||
        teamFilter
    );

    return (
        <div className="requests-page">
            {/* CABEÇALHO */}
            <header className="requests-header">
                <div>
                    <div className="requests-eyebrow">
                        <span className="requests-eyebrow-dot" />
                        CENTRAL DE ATENDIMENTO
                    </div>

                    <h1>Solicitações</h1>

                    <p>
                        Acompanhe e gerencie as demandas da sua empresa.
                    </p>
                </div>

                <div className="requests-header-actions">
                    <button
                        type="button"
                        className="requests-refresh-button"
                        onClick={() => loadDemands(true)}
                        disabled={refreshing || loading}
                        aria-label="Atualizar solicitações"
                        title="Atualizar"
                    >
                        <RefreshCw
                            size={17}
                            className={refreshing ? 'is-spinning' : ''}
                        />
                    </button>

                    <button
                        type="button"
                        className="requests-create-button"
                        onClick={openCreateModal}
                    >
                        <Plus size={18} />
                        <span>Nova solicitação</span>
                    </button>
                </div>
            </header>

            {/* MENSAGEM DE SUCESSO */}
            {successMessage && (
                <div className="requests-feedback requests-feedback-success">
                    <CheckCircle2 size={17} />
                    <span>{successMessage}</span>

                    <button
                        type="button"
                        onClick={() => setSuccessMessage('')}
                        aria-label="Fechar mensagem"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* INDICADORES */}
            <section className="requests-summary">
                <article className="requests-summary-card">
                    <div className="requests-summary-icon icon-total">
                        <Inbox size={19} />
                    </div>

                    <div className="requests-summary-info">
                        <span>Solicitações cadastradas</span>
                        <strong>{loading ? '—' : total}</strong>
                    </div>

                    <span className="requests-summary-caption">
                        Total da empresa
                    </span>
                </article>

                <article className="requests-summary-card">
                    <div className="requests-summary-icon icon-open">
                        <AlertCircle size={19} />
                    </div>

                    <div className="requests-summary-info">
                        <span>Abertas</span>
                        <strong>{loading ? '—' : summary.open}</strong>
                    </div>

                    <span className="requests-summary-caption">
                        Nesta página
                    </span>
                </article>

                <article className="requests-summary-card">
                    <div className="requests-summary-icon icon-progress">
                        <Clock3 size={19} />
                    </div>

                    <div className="requests-summary-info">
                        <span>Em andamento</span>
                        <strong>{loading ? '—' : summary.progress}</strong>
                    </div>

                    <span className="requests-summary-caption">
                        Nesta página
                    </span>
                </article>

                <article className="requests-summary-card">
                    <div className="requests-summary-icon icon-resolved">
                        <CheckCircle2 size={19} />
                    </div>

                    <div className="requests-summary-info">
                        <span>Concluídas</span>
                        <strong>{loading ? '—' : summary.resolved}</strong>
                    </div>

                    <span className="requests-summary-caption">
                        Nesta página
                    </span>
                </article>
            </section>

            {/* LISTAGEM */}
            <section className="requests-content">
                <div className="requests-list-heading">
                    <div>
                        <h2>Todas as solicitações</h2>
                        <p>
                            Consulte os registros e acompanhe cada atendimento.
                        </p>
                    </div>

                    <span className="requests-total-badge">
                        {total} {total === 1 ? 'registro' : 'registros'}
                    </span>
                </div>

                {/* FILTROS */}
                <div className="requests-toolbar">
                    <div className="requests-search">
                        <Search size={18} />

                        <input
                            type="search"
                            placeholder="Buscar por título, número ou solicitante..."
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                        />

                        {search && (
                            <button
                                type="button"
                                onClick={() => setSearch('')}
                                aria-label="Limpar busca"
                            >
                                <X size={15} />
                            </button>
                        )}
                    </div>

                    <div className="requests-filters">
                        <label className="requests-filter-select">
                            <SlidersHorizontal size={15} />

                            <select
                                value={statusFilter}
                                onChange={(event) =>
                                    updateFilter(setStatusFilter, event.target.value)
                                }
                            >
                                <option value="">Todos os status</option>

                                {STATUS_OPTIONS.map((status) => (
                                    <option key={status.value} value={status.value}>
                                        {status.label}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="requests-filter-select">
                            <select
                                value={priorityFilter}
                                onChange={(event) =>
                                    updateFilter(setPriorityFilter, event.target.value)
                                }
                            >
                                <option value="">Prioridade</option>

                                {PRIORITY_OPTIONS.map((priority) => (
                                    <option key={priority.value} value={priority.value}>
                                        {priority.label}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="requests-filter-select">
                            <select
                                value={categoryFilter}
                                onChange={(event) =>
                                    updateFilter(setCategoryFilter, event.target.value)
                                }
                            >
                                <option value="">Categorias</option>

                                {categories.map((category) => (
                                    <option key={category.id} value={category.id}>
                                        {category.name}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="requests-filter-select">
                            <select
                                value={teamFilter}
                                onChange={(event) =>
                                    updateFilter(setTeamFilter, event.target.value)
                                }
                            >
                                <option value="">Equipes</option>

                                {teams.map((team) => (
                                    <option key={team.id} value={team.id}>
                                        {team.name}
                                    </option>
                                ))}
                            </select>
                        </label>

                        {hasFilters && (
                            <button
                                type="button"
                                className="requests-clear-filters"
                                onClick={clearFilters}
                            >
                                Limpar
                            </button>
                        )}
                    </div>
                </div>

                {/* ERRO */}
                {error && (
                    <div className="requests-error">
                        <AlertCircle size={19} />

                        <div>
                            <strong>Não foi possível carregar as solicitações.</strong>
                            <span>{error}</span>
                        </div>

                        <button
                            type="button"
                            onClick={() => loadDemands(true)}
                        >
                            Tentar novamente
                        </button>
                    </div>
                )}

                {/* TABELA */}
                {!error && (
                    <div className="requests-table-wrapper">
                        <table className="requests-table">
                            <thead>
                                <tr>
                                    <th>Solicitação</th>
                                    <th>Solicitante</th>
                                    <th>Categoria / Equipe</th>
                                    <th>Prioridade</th>
                                    <th>Status</th>
                                    <th>Data</th>
                                    <th aria-label="Ações" />
                                </tr>
                            </thead>

                            <tbody>
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, index) => (
                                        <tr key={index} className="requests-skeleton-row">
                                            <td colSpan={7}>
                                                <span />
                                            </td>
                                        </tr>
                                    ))
                                ) : filteredDemands.length > 0 ? (
                                    filteredDemands.map((demand) => (
                                        <tr key={demand.id}>
                                            <td>
                                                <div className="request-main-cell">
                                                    <span className="request-number">
                                                        {demand.demand_number}
                                                    </span>

                                                    <strong>{demand.title}</strong>

                                                    <span className="request-type">
                                                        {demand.type === 'ticket'
                                                            ? 'Chamado'
                                                            : 'Solicitação de serviço'}
                                                    </span>
                                                </div>
                                            </td>

                                            <td>
                                                <div className="request-person">
                                                    <span className="request-person-avatar">
                                                        {getInitials(demand.requester_name || '?')}
                                                    </span>

                                                    <span>
                                                        {demand.requester_name || 'Não informado'}
                                                    </span>
                                                </div>
                                            </td>

                                            <td>
                                                <div className="request-category-cell">
                                                    <strong>
                                                        {demand.category_name || 'Sem categoria'}
                                                    </strong>

                                                    <span>
                                                        <Layers3 size={13} />
                                                        {demand.team_name || 'Sem equipe'}
                                                    </span>
                                                </div>
                                            </td>

                                            <td>
                                                <span className={`request-priority priority-${demand.priority}`}>
                                                    <span />
                                                    {formatPriority(demand.priority)}
                                                </span>
                                            </td>

                                            <td>
                                                <span className={`request-status status-${demand.status}`}>
                                                    {formatStatus(demand.status)}
                                                </span>
                                            </td>

                                            <td>
                                                <span className="request-date">
                                                    <CalendarDays size={14} />
                                                    {formatDate(demand.created_at)}
                                                </span>
                                            </td>

                                            <td>
                                                <button
                                                    type="button"
                                                    className="request-open-button"
                                                    title="Abrir solicitação"
                                                    aria-label={`Abrir ${demand.demand_number}`}
                                                >
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={7}>
                                            <div className="requests-empty">
                                                <div className="requests-empty-icon">
                                                    <Inbox size={25} />
                                                </div>

                                                <strong>
                                                    {search || hasFilters
                                                        ? 'Nenhum resultado encontrado'
                                                        : 'Nenhuma solicitação por aqui'}
                                                </strong>

                                                <p>
                                                    {search || hasFilters
                                                        ? 'Tente ajustar os filtros ou a busca.'
                                                        : 'Quando uma solicitação for criada, ela aparecerá nesta lista.'}
                                                </p>

                                                {hasFilters && (
                                                    <button
                                                        type="button"
                                                        onClick={clearFilters}
                                                    >
                                                        Limpar filtros
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* PAGINAÇÃO */}
                {!loading && !error && total > 0 && (
                    <footer className="requests-pagination">
                        <span>
                            Página <strong>{page}</strong> de{' '}
                            <strong>{Math.max(totalPages, 1)}</strong>
                            <span className="requests-pagination-total">
                                · {total} solicitações
                            </span>
                        </span>

                        <div>
                            <button
                                type="button"
                                onClick={() => setPage((current) => Math.max(1, current - 1))}
                                disabled={page <= 1}
                                aria-label="Página anterior"
                            >
                                <ChevronLeft size={17} />
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    setPage((current) =>
                                        Math.min(totalPages, current + 1)
                                    )
                                }
                                disabled={page >= totalPages}
                                aria-label="Próxima página"
                            >
                                <ChevronRight size={17} />
                            </button>
                        </div>
                    </footer>
                )}
            </section>

            {/* MODAL DE CRIAÇÃO */}
            {modalOpen && (
                <div
                    className="request-modal-overlay"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            closeCreateModal();
                        }
                    }}
                >
                    <section
                        className="request-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="request-modal-title"
                    >
                        <header className="request-modal-header">
                            <div>
                                <span>REGISTRO DE ATENDIMENTO</span>
                                <h2 id="request-modal-title">
                                    Nova solicitação
                                </h2>
                                <p>
                                    Preencha as informações para abrir uma nova demanda.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={closeCreateModal}
                                disabled={creating}
                                aria-label="Fechar modal"
                            >
                                <X size={19} />
                            </button>
                        </header>

                        <form onSubmit={handleCreateDemand}>
                            {formError && (
                                <div className="request-form-error">
                                    <AlertCircle size={16} />
                                    {formError}
                                </div>
                            )}

                            <div className="request-form-field">
                                <label htmlFor="request-title">
                                    Título <span>*</span>
                                </label>

                                <input
                                    id="request-title"
                                    type="text"
                                    maxLength={180}
                                    placeholder="Ex.: Solicitação de acesso ao sistema"
                                    value={form.title}
                                    onChange={(event) =>
                                        setForm((previous) => ({
                                            ...previous,
                                            title: event.target.value
                                        }))
                                    }
                                    required
                                />
                            </div>

                            <div className="request-form-field">
                                <label htmlFor="request-description">
                                    Descrição
                                </label>

                                <textarea
                                    id="request-description"
                                    rows={4}
                                    placeholder="Descreva o que precisa ser atendido..."
                                    value={form.description}
                                    onChange={(event) =>
                                        setForm((previous) => ({
                                            ...previous,
                                            description: event.target.value
                                        }))
                                    }
                                />
                            </div>

                            <div className="request-form-grid">
                                <div className="request-form-field">
                                    <label htmlFor="request-category">
                                        Categoria <span>*</span>
                                    </label>

                                    <select
                                        id="request-category"
                                        value={form.categoryId}
                                        onChange={(event) => {
                                            const category = categories.find(
                                                (item) => item.id === event.target.value
                                            );

                                            setForm((previous) => ({
                                                ...previous,
                                                categoryId: event.target.value,
                                                type:
                                                    category?.demand_type === 'service_request'
                                                        ? 'service_request'
                                                        : 'ticket'
                                            }));
                                        }}
                                        required
                                    >
                                        <option value="">Selecione</option>

                                        {categories.map((category) => (
                                            <option
                                                key={category.id}
                                                value={category.id}
                                            >
                                                {category.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="request-form-field">
                                    <label htmlFor="request-type">
                                        Tipo
                                    </label>

                                    <select
                                        id="request-type"
                                        value={form.type}
                                        onChange={(event) =>
                                            setForm((previous) => ({
                                                ...previous,
                                                type: event.target.value as
                                                    'ticket' | 'service_request'
                                            }))
                                        }
                                    >
                                        {availableTypes.includes('ticket') && (
                                            <option value="ticket">
                                                Chamado
                                            </option>
                                        )}

                                        {availableTypes.includes('service_request') && (
                                            <option value="service_request">
                                                Solicitação de serviço
                                            </option>
                                        )}
                                    </select>
                                </div>

                                <div className="request-form-field">
                                    <label htmlFor="request-priority">
                                        Prioridade
                                    </label>

                                    <select
                                        id="request-priority"
                                        value={form.priority}
                                        onChange={(event) =>
                                            setForm((previous) => ({
                                                ...previous,
                                                priority: event.target.value as Priority
                                            }))
                                        }
                                    >
                                        {PRIORITY_OPTIONS.map((priority) => (
                                            <option
                                                key={priority.value}
                                                value={priority.value}
                                            >
                                                {priority.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="request-form-field">
                                    <label htmlFor="request-team">
                                        Equipe responsável
                                    </label>

                                    <select
                                        id="request-team"
                                        value={form.teamId}
                                        onChange={(event) =>
                                            setForm((previous) => ({
                                                ...previous,
                                                teamId: event.target.value
                                            }))
                                        }
                                    >
                                        <option value="">
                                            Equipe padrão da categoria
                                        </option>

                                        {teams.map((team) => (
                                            <option key={team.id} value={team.id}>
                                                {team.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="request-modal-footer">
                                <button
                                    type="button"
                                    className="request-cancel-button"
                                    onClick={closeCreateModal}
                                    disabled={creating}
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    className="requests-create-button"
                                    disabled={creating || categories.length === 0}
                                >
                                    {creating ? (
                                        <>
                                            <span className="request-button-spinner" />
                                            Criando...
                                        </>
                                    ) : (
                                        <>
                                            <Plus size={17} />
                                            Criar solicitação
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </section>
                </div>
            )}
        </div>
    );
}

export default Solicitacoes;
