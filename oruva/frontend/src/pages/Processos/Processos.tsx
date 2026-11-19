
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
    Workflow,
    CheckCircle2,
    PauseCircle,
    ChevronLeft,
    ChevronRight,
    CalendarDays,
    Layers3,
    Users,
    Building2,
    X,
    AlertCircle,
    Filter,
    CircleDot
} from 'lucide-react';

import { processService } from '../../services/processService';

import type {
    Process,
    ProcessDepartment,
    ProcessPriority,
    ProcessStatus,
    ProcessTeam,
    ProcessTemplate
} from '../../types/process';

import './Processos.css';

const STATUS_OPTIONS: {
    value: ProcessStatus;
    label: string;
}[] = [
    { value: 'active', label: 'Em andamento' },
    { value: 'paused', label: 'Pausado' },
    { value: 'completed', label: 'Concluído' },
    { value: 'canceled', label: 'Cancelado' }
];

const PRIORITY_OPTIONS: {
    value: ProcessPriority;
    label: string;
}[] = [
    { value: 'low', label: 'Baixa' },
    { value: 'medium', label: 'Média' },
    { value: 'high', label: 'Alta' },
    { value: 'critical', label: 'Crítica' }
];

const INITIAL_FORM = {
    templateId: '',
    title: '',
    description: '',
    priority: 'medium' as ProcessPriority,
    departmentId: '',
    teamId: '',
    dueAt: ''
};

function formatDate(date: string | null | undefined) {
    if (!date) return '—';

    const parsed = new Date(
        date.includes('T') ? date : date.replace(' ', 'T')
    );

    if (Number.isNaN(parsed.getTime())) return '—';

    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    }).format(parsed);
}

function formatStatus(status: ProcessStatus) {
    return STATUS_OPTIONS.find(
        (item) => item.value === status
    )?.label ?? status;
}

function formatPriority(priority: ProcessPriority) {
    return PRIORITY_OPTIONS.find(
        (item) => item.value === priority
    )?.label ?? priority;
}


function Processos() {
    const [processes, setProcesses] = useState<Process[]>([]);
    const [templates, setTemplates] = useState<ProcessTemplate[]>([]);
    const [teams, setTeams] = useState<ProcessTeam[]>([]);
    const [departments, setDepartments] = useState<ProcessDepartment[]>([]);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingOptions, setLoadingOptions] = useState(false);
    const [creating, setCreating] = useState(false);

    const [error, setError] = useState('');
    const [formError, setFormError] = useState('');
    const [feedback, setFeedback] = useState('');

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('');
    const [teamFilter, setTeamFilter] = useState('');
    const [templateFilter, setTemplateFilter] = useState('');

    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    const [modalOpen, setModalOpen] = useState(false);

    const [form, setForm] = useState(INITIAL_FORM);

    const loadProcesses = useCallback(async (showRefresh = false) => {
        try {
            if (showRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            setError('');

            const response = await processService.listar({
                page,
                limit: 10,
                search: search.trim() || undefined,
                status: statusFilter as ProcessStatus | '',
                priority: priorityFilter as ProcessPriority | '',
                teamId: teamFilter,
                templateId: templateFilter
            });

            setProcesses(response.data ?? []);
            setTotal(response.pagination?.total ?? 0);
            setTotalPages(response.pagination?.totalPages ?? 0);
        } catch (err) {
            console.error('Erro ao carregar processos:', err);

            setError(
                err instanceof Error
                    ? err.message
                    : 'Não foi possível carregar os processos.'
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [
        page,
        search,
        statusFilter,
        priorityFilter,
        teamFilter,
        templateFilter
    ]);

    const loadOptions = useCallback(async () => {
        try {
            setLoadingOptions(true);

            const [
                templateResponse,
                teamResponse,
                departmentResponse
            ] = await Promise.all([
                processService.listarModelos(),
                processService.listarEquipes(),
                processService.listarDepartamentos()
            ]);

            setTemplates(
                (templateResponse.data ?? []).filter(
                    (template) =>
                        template.status === 'active' &&
                        Number(template.steps_count) > 0
                )
            );

            setTeams(
                (teamResponse.equipes ?? []).filter(
                    (team) => team.status === 'active'
                )
            );

            setDepartments(
                (departmentResponse.departamentos ?? []).filter(
                    (department) => department.status === 'active'
                )
            );
        } catch (err) {
            console.error('Erro ao carregar opções dos processos:', err);
        } finally {
            setLoadingOptions(false);
        }
    }, []);

    useEffect(() => {
        loadProcesses();
    }, [loadProcesses]);

    useEffect(() => {
        loadOptions();
    }, [loadOptions]);

    const summary = useMemo(() => ({
        active: processes.filter(
            (item) => item.status === 'active'
        ).length,
        paused: processes.filter(
            (item) => item.status === 'paused'
        ).length,
        completed: processes.filter(
            (item) => item.status === 'completed'
        ).length,
        canceled: processes.filter(
            (item) => item.status === 'canceled'
        ).length
    }), [processes]);

    const selectedTemplate = templates.find(
        (template) => String(template.id) === form.templateId
    );

    function updateFilter(
        setter: (value: string) => void,
        value: string
    ) {
        setter(value);
        setPage(1);
    }

    function clearFilters() {
        setSearch('');
        setStatusFilter('');
        setPriorityFilter('');
        setTeamFilter('');
        setTemplateFilter('');
        setPage(1);
    }

    function openCreateModal() {
        setForm(INITIAL_FORM);
        setFormError('');
        setModalOpen(true);
    }

    function closeCreateModal() {
        if (creating) return;

        setModalOpen(false);
        setFormError('');
    }

    async function handleCreateProcess(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        if (!form.templateId) {
            setFormError('Selecione um modelo de processo.');
            return;
        }

        if (!form.title.trim()) {
            setFormError('Informe o título do processo.');
            return;
        }

        if (form.title.trim().length > 200) {
            setFormError('O título deve ter no máximo 200 caracteres.');
            return;
        }

        try {
            setCreating(true);
            setFormError('');

            const response = await processService.criar({
                templateId: form.templateId,
                title: form.title.trim(),
                description: form.description.trim() || null,
                priority: form.priority,
                departmentId: form.departmentId || null,
                teamId: form.teamId || null,
                dueAt: form.dueAt
                    ? `${form.dueAt}T23:59:59`
                    : null
            });

            setModalOpen(false);
            setFeedback(
                response.message || 'Processo criado com sucesso.'
            );

            setForm(INITIAL_FORM);

            if (page !== 1) {
                setPage(1);
                return;
            }

            await loadProcesses(true);
        } catch (err) {
            console.error('Erro ao criar processo:', err);

            setFormError(
                err instanceof Error
                    ? err.message
                    : 'Não foi possível criar o processo.'
            );
        } finally {
            setCreating(false);
        }
    }

    const hasFilters = Boolean(
        search ||
        statusFilter ||
        priorityFilter ||
        teamFilter ||
        templateFilter
    );

    return (
        <main className="processes-page">
            <header className="processes-header">
                <div>
                    <div className="processes-eyebrow">
                        <span />
                        GESTÃO OPERACIONAL
                    </div>

                    <h1>Processos</h1>

                    <p>
                        Organize fluxos de trabalho e acompanhe cada etapa
                        da operação.
                    </p>
                </div>

                <div className="processes-header-actions">
                    <button
                        type="button"
                        className="processes-refresh-button"
                        onClick={() => loadProcesses(true)}
                        disabled={refreshing || loading}
                        title="Atualizar processos"
                        aria-label="Atualizar processos"
                    >
                        <RefreshCw
                            size={17}
                            className={refreshing ? 'is-spinning' : ''}
                        />
                    </button>

                    <button
                        type="button"
                        className="processes-create-button"
                        onClick={openCreateModal}
                    >
                        <Plus size={18} />
                        <span>Novo processo</span>
                    </button>
                </div>
            </header>

            {feedback && (
                <div className="processes-feedback">
                    <CheckCircle2 size={17} />
                    <span>{feedback}</span>

                    <button
                        type="button"
                        onClick={() => setFeedback('')}
                        aria-label="Fechar mensagem"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            <section className="processes-summary">
                <article className="processes-summary-card">
                    <div className="processes-summary-icon summary-active">
                        <Workflow size={19} />
                    </div>

                    <div className="processes-summary-info">
                        <span>Em andamento</span>
                        <strong>{loading ? '—' : summary.active}</strong>
                    </div>

                    <small>Nesta página</small>
                </article>

                <article className="processes-summary-card">
                    <div className="processes-summary-icon summary-paused">
                        <PauseCircle size={19} />
                    </div>

                    <div className="processes-summary-info">
                        <span>Pausados</span>
                        <strong>{loading ? '—' : summary.paused}</strong>
                    </div>

                    <small>Nesta página</small>
                </article>

                <article className="processes-summary-card">
                    <div className="processes-summary-icon summary-completed">
                        <CheckCircle2 size={19} />
                    </div>

                    <div className="processes-summary-info">
                        <span>Concluídos</span>
                        <strong>{loading ? '—' : summary.completed}</strong>
                    </div>

                    <small>Nesta página</small>
                </article>

                <article className="processes-summary-card">
                    <div className="processes-summary-icon summary-total">
                        <Layers3 size={19} />
                    </div>

                    <div className="processes-summary-info">
                        <span>Total de processos</span>
                        <strong>{loading ? '—' : total}</strong>
                    </div>

                    <small>Na empresa</small>
                </article>
            </section>

            <section className="processes-content">
                <div className="processes-list-heading">
                    <div>
                        <h2>Todos os processos</h2>
                        <p>
                            Visualize os fluxos de trabalho e suas etapas atuais.
                        </p>
                    </div>

                    <span className="processes-count">
                        {total} {total === 1 ? 'registro' : 'registros'}
                    </span>
                </div>

                <div className="processes-toolbar">
                    <label className="processes-search">
                        <Search size={17} />

                        <input
                            type="search"
                            placeholder="Buscar por título ou número..."
                            value={search}
                            onChange={(event) => {
                                setSearch(event.target.value);
                                setPage(1);
                            }}
                        />

                        {search && (
                            <button
                                type="button"
                                onClick={() => setSearch('')}
                                aria-label="Limpar pesquisa"
                            >
                                <X size={15} />
                            </button>
                        )}
                    </label>

                    <div className="processes-filters">
                        <label className="processes-filter-select">
                            <Filter size={14} />

                            <select
                                value={statusFilter}
                                onChange={(event) =>
                                    updateFilter(
                                        setStatusFilter,
                                        event.target.value
                                    )
                                }
                                aria-label="Filtrar por status"
                            >
                                <option value="">Todos os status</option>
                                {STATUS_OPTIONS.map((item) => (
                                    <option
                                        key={item.value}
                                        value={item.value}
                                    >
                                        {item.label}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="processes-filter-select">
                            <select
                                value={priorityFilter}
                                onChange={(event) =>
                                    updateFilter(
                                        setPriorityFilter,
                                        event.target.value
                                    )
                                }
                                aria-label="Filtrar por prioridade"
                            >
                                <option value="">Prioridades</option>
                                {PRIORITY_OPTIONS.map((item) => (
                                    <option
                                        key={item.value}
                                        value={item.value}
                                    >
                                        {item.label}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="processes-filter-select">
                            <select
                                value={templateFilter}
                                onChange={(event) =>
                                    updateFilter(
                                        setTemplateFilter,
                                        event.target.value
                                    )
                                }
                                aria-label="Filtrar por modelo"
                            >
                                <option value="">Todos os modelos</option>
                                {templates.map((template) => (
                                    <option
                                        key={template.id}
                                        value={template.id}
                                    >
                                        {template.name}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="processes-filter-select">
                            <select
                                value={teamFilter}
                                onChange={(event) =>
                                    updateFilter(
                                        setTeamFilter,
                                        event.target.value
                                    )
                                }
                                aria-label="Filtrar por equipe do processo"
                            >
                                <option value="">Equipes do processo</option>
                                {teams.map((team) => (
                                    <option
                                        key={team.id}
                                        value={team.id}
                                    >
                                        {team.name}
                                    </option>
                                ))}
                            </select>
                        </label>

                        {hasFilters && (
                            <button
                                type="button"
                                className="processes-clear-filters"
                                onClick={clearFilters}
                            >
                                Limpar
                            </button>
                        )}
                    </div>
                </div>

                {error && (
                    <div className="processes-error">
                        <AlertCircle size={18} />

                        <div>
                            <strong>Não foi possível carregar os processos</strong>
                            <span>{error}</span>
                        </div>

                        <button
                            type="button"
                            onClick={() => loadProcesses()}
                        >
                            Tentar novamente
                        </button>
                    </div>
                )}

                <div className="processes-table-wrapper">
                    <table className="processes-table">
                        <thead>
                            <tr>
                                <th>Processo</th>
                                <th>Modelo / etapa atual</th>
                                <th>Equipe responsável</th>
                                <th>Prioridade</th>
                                <th>Status</th>
                                <th>Prazo</th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, index) => (
                                    <tr
                                        className="processes-skeleton-row"
                                        key={index}
                                    >
                                        {Array.from({ length: 6 }).map((__, cell) => (
                                            <td key={cell}>
                                                <span />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : processes.length > 0 ? (
                                processes.map((process) => (
                                    <tr key={process.id}>
                                        <td>
                                            <div className="process-main-cell">
                                                <span className="process-number">
                                                    {process.process_number}
                                                </span>

                                                <strong title={process.title}>
                                                    {process.title}
                                                </strong>

                                                <small>
                                                    Criado por {process.creator_name || '—'}
                                                </small>
                                            </div>
                                        </td>

                                        <td>
                                            <div className="process-step-cell">
                                                <span>
                                                    {process.template_name || 'Modelo indisponível'}
                                                </span>

                                                <strong>
                                                    <CircleDot size={13} />
                                                    {process.current_step_name || 'Sem etapa'}
                                                </strong>
                                            </div>
                                        </td>

                                        <td>
                                            <div className="process-team-cell">
                                                <Users size={15} />

                                                <span>
                                                    {process.current_step_team_name || 'Equipe não definida'}
                                                </span>
                                            </div>

                                            {process.team_name && (
                                                <small className="process-general-team">
                                                    Geral: {process.team_name}
                                                </small>
                                            )}
                                        </td>

                                        <td>
                                            <span className={`process-priority priority-${process.priority}`}>
                                                <i />
                                                {formatPriority(process.priority)}
                                            </span>
                                        </td>

                                        <td>
                                            <span className={`process-status status-${process.status}`}>
                                                {formatStatus(process.status)}
                                            </span>
                                        </td>

                                        <td>
                                            <span className="process-date">
                                                <CalendarDays size={14} />
                                                {formatDate(process.due_at)}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6}>
                                        <div className="processes-empty">
                                            <div className="processes-empty-icon">
                                                <Workflow size={23} />
                                            </div>

                                            <strong>
                                                {hasFilters
                                                    ? 'Nenhum processo encontrado'
                                                    : 'Sua operação começa aqui'}
                                            </strong>

                                            <p>
                                                {hasFilters
                                                    ? 'Não encontramos processos com os filtros selecionados.'
                                                    : 'Crie seu primeiro processo para começar a organizar os fluxos de trabalho.'}
                                            </p>

                                            {hasFilters ? (
                                                <button
                                                    type="button"
                                                    onClick={clearFilters}
                                                >
                                                    Limpar filtros
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={openCreateModal}
                                                >
                                                    <Plus size={15} />
                                                    Criar processo
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <footer className="processes-pagination">
                    <span>
                        Página <strong>{page}</strong> de{' '}
                        <strong>{Math.max(totalPages, 1)}</strong>
                    </span>

                    <div>
                        <button
                            type="button"
                            onClick={() => setPage((current) => Math.max(1, current - 1))}
                            disabled={page <= 1 || loading}
                            aria-label="Página anterior"
                        >
                            <ChevronLeft size={17} />
                        </button>

                        <button
                            type="button"
                            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                            disabled={page >= totalPages || loading || totalPages === 0}
                            aria-label="Próxima página"
                        >
                            <ChevronRight size={17} />
                        </button>
                    </div>
                </footer>
            </section>

            {modalOpen && (
                <div
                    className="process-modal-overlay"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            closeCreateModal();
                        }
                    }}
                >
                    <section
                        className="process-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="process-modal-title"
                    >
                        <header className="process-modal-header">
                            <div>
                                <span>NOVO REGISTRO</span>
                                <h2 id="process-modal-title">
                                    Criar processo
                                </h2>
                                <p>
                                    Defina as informações iniciais do fluxo de trabalho.
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

                        <form onSubmit={handleCreateProcess}>
                            <div className="process-form-field">
                                <label htmlFor="process-template">
                                    Modelo de processo <span>*</span>
                                </label>

                                <select
                                    id="process-template"
                                    value={form.templateId}
                                    onChange={(event) =>
                                        setForm((current) => ({
                                            ...current,
                                            templateId: event.target.value
                                        }))
                                    }
                                    disabled={loadingOptions || creating}
                                    required
                                >
                                    <option value="">
                                        {loadingOptions
                                            ? 'Carregando modelos...'
                                            : 'Selecione um modelo'}
                                    </option>

                                    {templates.map((template) => (
                                        <option
                                            key={template.id}
                                            value={template.id}
                                        >
                                            {template.name}
                                        </option>
                                    ))}
                                </select>

                                {selectedTemplate && (
                                    <small className="process-template-hint">
                                        <Layers3 size={13} />
                                        {selectedTemplate.steps_count} etapas configuradas
                                    </small>
                                )}

                                {!loadingOptions && templates.length === 0 && (
                                    <small className="process-field-hint">
                                        Não existem modelos ativos com etapas cadastradas.
                                    </small>
                                )}
                            </div>

                            <div className="process-form-field">
                                <label htmlFor="process-title">
                                    Título do processo <span>*</span>
                                </label>

                                <input
                                    id="process-title"
                                    type="text"
                                    maxLength={200}
                                    placeholder="Ex.: Implantação de novo sistema"
                                    value={form.title}
                                    onChange={(event) =>
                                        setForm((current) => ({
                                            ...current,
                                            title: event.target.value
                                        }))
                                    }
                                    disabled={creating}
                                    required
                                />
                            </div>

                            <div className="process-form-field">
                                <label htmlFor="process-description">
                                    Descrição
                                </label>

                                <textarea
                                    id="process-description"
                                    placeholder="Adicione detalhes sobre o objetivo e o escopo deste processo..."
                                    value={form.description}
                                    onChange={(event) =>
                                        setForm((current) => ({
                                            ...current,
                                            description: event.target.value
                                        }))
                                    }
                                    disabled={creating}
                                    rows={3}
                                />
                            </div>

                            <div className="process-form-grid">
                                <div className="process-form-field">
                                    <label htmlFor="process-priority">
                                        Prioridade
                                    </label>

                                    <select
                                        id="process-priority"
                                        value={form.priority}
                                        onChange={(event) =>
                                            setForm((current) => ({
                                                ...current,
                                                priority: event.target.value as ProcessPriority
                                            }))
                                        }
                                        disabled={creating}
                                    >
                                        {PRIORITY_OPTIONS.map((item) => (
                                            <option
                                                key={item.value}
                                                value={item.value}
                                            >
                                                {item.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="process-form-field">
                                    <label htmlFor="process-due">
                                        Prazo previsto
                                    </label>

                                    <input
                                        id="process-due"
                                        type="date"
                                        value={form.dueAt}
                                        onChange={(event) =>
                                            setForm((current) => ({
                                                ...current,
                                                dueAt: event.target.value
                                            }))
                                        }
                                        disabled={creating}
                                    />
                                </div>
                            </div>

                            <div className="process-form-grid">
                                <div className="process-form-field">
                                    <label htmlFor="process-department">
                                        <Building2 size={13} />
                                        Departamento
                                    </label>

                                    <select
                                        id="process-department"
                                        value={form.departmentId}
                                        onChange={(event) =>
                                            setForm((current) => ({
                                                ...current,
                                                departmentId: event.target.value
                                            }))
                                        }
                                        disabled={creating || loadingOptions}
                                    >
                                        <option value="">Não definido</option>

                                        {departments.map((department) => (
                                            <option
                                                key={department.id}
                                                value={department.id}
                                            >
                                                {department.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="process-form-field">
                                    <label htmlFor="process-team">
                                        <Users size={13} />
                                        Equipe do processo
                                    </label>

                                    <select
                                        id="process-team"
                                        value={form.teamId}
                                        onChange={(event) =>
                                            setForm((current) => ({
                                                ...current,
                                                teamId: event.target.value
                                            }))
                                        }
                                        disabled={creating || loadingOptions}
                                    >
                                        <option value="">Não definida</option>

                                        {teams.map((team) => (
                                            <option
                                                key={team.id}
                                                value={team.id}
                                            >
                                                {team.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="process-form-note">
                                <AlertCircle size={15} />
                                <span>
                                    A equipe responsável pela primeira etapa será definida
                                    automaticamente pelo modelo selecionado.
                                </span>
                            </div>

                            {formError && (
                                <div className="process-form-error">
                                    <AlertCircle size={15} />
                                    <span>{formError}</span>
                                </div>
                            )}

                            <footer className="process-modal-footer">
                                <button
                                    type="button"
                                    className="process-cancel-button"
                                    onClick={closeCreateModal}
                                    disabled={creating}
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    className="process-submit-button"
                                    disabled={
                                        creating ||
                                        loadingOptions ||
                                        templates.length === 0
                                    }
                                >
                                    {creating ? (
                                        <>
                                            <span className="process-button-spinner" />
                                            Criando...
                                        </>
                                    ) : (
                                        <>
                                            <Plus size={16} />
                                            Criar processo
                                        </>
                                    )}
                                </button>
                            </footer>
                        </form>
                    </section>
                </div>
            )}
        </main>
    );
}

export default Processos;
