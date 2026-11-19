
import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type FormEvent,
    type CSSProperties
} from 'react';
import {
    Tag,
    Plus,
    Search,
    RefreshCw,
    Pencil,
    Power,
    X,
    AlertCircle,
    CheckCircle2,
    Building2,
    Users,
    ClipboardList,
    Wrench,
    FileText,
    ShieldCheck,
    ShoppingBag,
    Headphones,
    Laptop,
    BriefcaseBusiness,
    Layers3,
    Check
} from 'lucide-react';

import { categoryService } from '../../services/categoryService';
import { organizationService } from '../../services/organizationService';

import type {
    Category,
    CategoryPayload,
    CategoryStatus,
    DemandType
} from '../../types/category';

import type {
    Department,
    Team
} from '../../types/organization';

import './Categorias.css';

const ICON_OPTIONS = [
    { value: 'Tag', label: 'Etiqueta', Icon: Tag },
    { value: 'BriefcaseBusiness', label: 'Administrativo', Icon: BriefcaseBusiness },
    { value: 'Laptop', label: 'Tecnologia', Icon: Laptop },
    { value: 'Wrench', label: 'Manutenção', Icon: Wrench },
    { value: 'Users', label: 'Pessoas', Icon: Users },
    { value: 'FileText', label: 'Documentos', Icon: FileText },
    { value: 'ShieldCheck', label: 'Segurança', Icon: ShieldCheck },
    { value: 'ShoppingBag', label: 'Compras', Icon: ShoppingBag },
    { value: 'Headphones', label: 'Atendimento', Icon: Headphones },
    { value: 'ClipboardList', label: 'Processos', Icon: ClipboardList }
];

const COLOR_OPTIONS = [
    { value: '#8B9CF6', label: 'Índigo' },
    { value: '#75B88D', label: 'Verde' },
    { value: '#D6A46D', label: 'Âmbar' },
    { value: '#D68181', label: 'Vermelho' },
    { value: '#78AFC5', label: 'Azul' },
    { value: '#B18BD6', label: 'Violeta' },
    { value: '#C58EAF', label: 'Rosa' },
    { value: '#92969D', label: 'Neutro' }
];

const INITIAL_FORM: CategoryPayload = {
    name: '',
    description: '',
    departmentId: null,
    defaultTeamId: null,
    formSchema: null,
    icon: 'Tag',
    color: '#92969D',
    demandType: 'both',
    requiresApproval: false
};

function getCategoryIcon(iconName: string | null) {
    return ICON_OPTIONS.find((item) => item.value === iconName)?.Icon ?? Tag;
}

function getDemandTypeLabel(type: DemandType) {
    const labels: Record<DemandType, string> = {
        ticket: 'Chamados',
        service_request: 'Solicitações',
        both: 'Ambos'
    };

    return labels[type] ?? 'Ambos';
}

function Categorias() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [saving, setSaving] = useState(false);

    const [error, setError] = useState('');
    const [feedback, setFeedback] = useState('');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | CategoryStatus>('all');

    const [modalOpen, setModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);

    const [form, setForm] = useState<CategoryPayload>(INITIAL_FORM);
    const [formError, setFormError] = useState('');

    const loadData = useCallback(async (showRefresh = false) => {
        try {
            if (showRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            setError('');

            const [
                categoryResponse,
                departmentResponse,
                teamResponse
            ] = await Promise.all([
                categoryService.listar(),
                organizationService.departments.listar(),
                organizationService.teams.listar()
            ]);

            setCategories(categoryResponse.categorias ?? []);
            setDepartments(departmentResponse.departamentos ?? []);
            setTeams(teamResponse.equipes ?? []);
        } catch (err) {
            console.error('Erro ao carregar categorias:', err);

            setError(
                err instanceof Error
                    ? err.message
                    : 'Não foi possível carregar as categorias.'
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const filteredCategories = useMemo(() => {
        const term = search.trim().toLowerCase();

        return categories.filter((category) => {
            const matchesSearch = !term || [
                category.name,
                category.description,
                category.department_name,
                category.default_team_name
            ]
                .filter(Boolean)
                .some((value) =>
                    String(value).toLowerCase().includes(term)
                );

            const matchesStatus =
                statusFilter === 'all' ||
                category.status === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [categories, search, statusFilter]);

    const activeCount = categories.filter(
        (category) => category.status === 'active'
    ).length;

    const approvalCount = categories.filter(
        (category) =>
            category.status === 'active' &&
            category.requires_approval
    ).length;

    const availableTeams = useMemo(() => {
        return teams.filter((team) => {
            if (team.status !== 'active') return false;

            if (!form.departmentId) return true;

            return String(team.department_id) === String(form.departmentId);
        });
    }, [teams, form.departmentId]);

    function openCreateModal() {
        setEditingCategory(null);
        setForm(INITIAL_FORM);
        setFormError('');
        setModalOpen(true);
    }

    function openEditModal(category: Category) {
        setEditingCategory(category);

        setForm({
            name: category.name,
            description: category.description ?? '',
            departmentId: category.department_id ?? null,
            defaultTeamId: category.default_team_id ?? null,
            formSchema: category.form_schema ?? null,
            icon: category.icon || 'Tag',
            color: category.color || '#92969D',
            demandType: category.demand_type || 'both',
            requiresApproval: Boolean(category.requires_approval)
        });

        setFormError('');
        setModalOpen(true);
    }

    function closeModal() {
        if (saving) return;

        setModalOpen(false);
        setFormError('');
    }

    function updateForm<K extends keyof CategoryPayload>(
        key: K,
        value: CategoryPayload[K]
    ) {
        setForm((current) => ({
            ...current,
            [key]: value
        }));
    }

    function handleDepartmentChange(value: string) {
        const nextDepartmentId = value || null;

        setForm((current) => {
            const selectedTeam = teams.find(
                (team) =>
                    String(team.id) === String(current.defaultTeamId)
            );

            const teamStillValid =
                !selectedTeam ||
                !nextDepartmentId ||
                String(selectedTeam.department_id) === String(nextDepartmentId);

            return {
                ...current,
                departmentId: nextDepartmentId,
                defaultTeamId: teamStillValid
                    ? current.defaultTeamId
                    : null
            };
        });
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const name = form.name.trim();

        if (!name) {
            setFormError('Informe o nome da categoria.');
            return;
        }

        if (name.length > 120) {
            setFormError('O nome deve ter no máximo 120 caracteres.');
            return;
        }

        if (form.defaultTeamId && !availableTeams.some(
            (team) => String(team.id) === String(form.defaultTeamId)
        )) {
            setFormError(
                'A equipe padrão precisa pertencer ao departamento selecionado.'
            );
            return;
        }

        try {
            setSaving(true);
            setFormError('');

            const payload: CategoryPayload = {
                ...form,
                name,
                description: form.description?.trim() || null,
                departmentId: form.departmentId || null,
                defaultTeamId: form.defaultTeamId || null,
                formSchema: form.formSchema ?? null
            };

            if (editingCategory) {
                await categoryService.atualizar(
                    editingCategory.id,
                    payload
                );

                setFeedback('Categoria atualizada com sucesso.');
            } else {
                await categoryService.criar(payload);

                setFeedback('Categoria criada com sucesso.');
            }

            setModalOpen(false);
            await loadData(true);
        } catch (err) {
            console.error('Erro ao salvar categoria:', err);

            setFormError(
                err instanceof Error
                    ? err.message
                    : 'Não foi possível salvar a categoria.'
            );
        } finally {
            setSaving(false);
        }
    }

    async function handleStatusChange(category: Category) {
        const nextStatus: CategoryStatus =
            category.status === 'active' ? 'inactive' : 'active';

        try {
            setError('');

            const response = await categoryService.alterarStatus(
                category.id,
                nextStatus
            );

            setFeedback(response.message);
            await loadData(true);
        } catch (err) {
            console.error('Erro ao alterar status da categoria:', err);

            setError(
                err instanceof Error
                    ? err.message
                    : 'Não foi possível alterar o status da categoria.'
            );
        }
    }

    return (
        <main className="categories-page">
            <header className="categories-header">
                <div>
                    <div className="categories-eyebrow">
                        <span />
                        CONFIGURAÇÃO DA EMPRESA
                    </div>

                    <h1>Categorias</h1>

                    <p>
                        Classifique as solicitações e defina como cada tipo de demanda será direcionado.
                    </p>
                </div>

                <button
                    type="button"
                    className="categories-refresh"
                    onClick={() => loadData(true)}
                    disabled={refreshing || loading}
                    aria-label="Atualizar categorias"
                >
                    <RefreshCw
                        size={17}
                        className={refreshing ? 'categories-spinning' : ''}
                    />
                </button>
            </header>

            {feedback && (
                <div className="categories-feedback">
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

            {error && (
                <div className="categories-error">
                    <AlertCircle size={17} />
                    <span>{error}</span>

                    <button type="button" onClick={() => loadData()}>
                        Tentar novamente
                    </button>
                </div>
            )}

            <section className="categories-overview">
                <article className="categories-overview-card">
                    <div className="categories-overview-icon">
                        <Tag size={20} />
                    </div>

                    <div>
                        <span>Total de categorias</span>
                        <strong>{loading ? '—' : categories.length}</strong>
                        <small>Tipos cadastrados</small>
                    </div>
                </article>

                <article className="categories-overview-card">
                    <div className="categories-overview-icon">
                        <CheckCircle2 size={20} />
                    </div>

                    <div>
                        <span>Categorias ativas</span>
                        <strong>{loading ? '—' : activeCount}</strong>
                        <small>Disponíveis para uso</small>
                    </div>
                </article>

                <article className="categories-overview-card">
                    <div className="categories-overview-icon">
                        <ShieldCheck size={20} />
                    </div>

                    <div>
                        <span>Exigem aprovação</span>
                        <strong>{loading ? '—' : approvalCount}</strong>
                        <small>Com fluxo de aprovação</small>
                    </div>
                </article>
            </section>

            <section className="categories-panel">
                <div className="categories-panel-heading">
                    <div>
                        <h2>Tipos de solicitação</h2>
                        <p>
                            Cada categoria pode ter uma equipe padrão e regras próprias.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="categories-create-button"
                        onClick={openCreateModal}
                    >
                        <Plus size={17} />
                        Nova categoria
                    </button>
                </div>

                <div className="categories-toolbar">
                    <label className="categories-search">
                        <Search size={16} />

                        <input
                            type="search"
                            placeholder="Buscar categoria..."
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                        />

                        {search && (
                            <button
                                type="button"
                                onClick={() => setSearch('')}
                                aria-label="Limpar busca"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </label>

                    <select
                        className="categories-filter"
                        value={statusFilter}
                        onChange={(event) =>
                            setStatusFilter(event.target.value as typeof statusFilter)
                        }
                        aria-label="Filtrar por status"
                    >
                        <option value="all">Todos os status</option>
                        <option value="active">Ativas</option>
                        <option value="inactive">Inativas</option>
                    </select>
                </div>

                <div className="categories-table-wrapper">
                    <table className="categories-table">
                        <thead>
                            <tr>
                                <th>Categoria</th>
                                <th>Departamento / Equipe</th>
                                <th>Tipo</th>
                                <th>Aprovação</th>
                                <th>Status</th>
                                <th>Ações</th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading ? (
                                Array.from({ length: 4 }).map((_, index) => (
                                    <tr key={index} className="categories-skeleton-row">
                                        {Array.from({ length: 6 }).map((__, cell) => (
                                            <td key={cell}><span /></td>
                                        ))}
                                    </tr>
                                ))
                            ) : filteredCategories.length > 0 ? (
                                filteredCategories.map((category) => {
                                    const Icon = getCategoryIcon(category.icon);

                                    return (
                                        <tr key={category.id}>
                                            <td>
                                                <div className="categories-name-cell">
                                                    <div
                                                        className="categories-category-icon"
                                                        style={{
                                                            color: category.color || '#92969D',
                                                            backgroundColor: `${category.color || '#92969D'}18`,
                                                            borderColor: `${category.color || '#92969D'}35`
                                                        }}
                                                    >
                                                        <Icon size={17} />
                                                    </div>

                                                    <div>
                                                        <strong>{category.name}</strong>
                                                        <small>
                                                            {category.description || 'Sem descrição'}
                                                        </small>
                                                    </div>
                                                </div>
                                            </td>

                                            <td>
                                                <div className="categories-assignment">
                                                    <span>
                                                        <Building2 size={13} />
                                                        {category.department_name || 'Sem departamento'}
                                                    </span>

                                                    <span>
                                                        <Users size={13} />
                                                        {category.default_team_name || 'Sem equipe padrão'}
                                                    </span>
                                                </div>
                                            </td>

                                            <td>
                                                <span className="categories-type">
                                                    {getDemandTypeLabel(category.demand_type)}
                                                </span>
                                            </td>

                                            <td>
                                                {category.requires_approval ? (
                                                    <span className="categories-approval required">
                                                        <ShieldCheck size={14} />
                                                        Obrigatória
                                                    </span>
                                                ) : (
                                                    <span className="categories-approval">
                                                        Não
                                                    </span>
                                                )}
                                            </td>

                                            <td>
                                                <span className={`categories-status ${category.status}`}>
                                                    <i />
                                                    {category.status === 'active' ? 'Ativa' : 'Inativa'}
                                                </span>
                                            </td>

                                            <td>
                                                <div className="categories-actions">
                                                    <button
                                                        type="button"
                                                        onClick={() => openEditModal(category)}
                                                        title="Editar categoria"
                                                        aria-label={`Editar ${category.name}`}
                                                    >
                                                        <Pencil size={15} />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => handleStatusChange(category)}
                                                        title={
                                                            category.status === 'active'
                                                                ? 'Desativar categoria'
                                                                : 'Ativar categoria'
                                                        }
                                                        aria-label={
                                                            category.status === 'active'
                                                                ? 'Desativar categoria'
                                                                : 'Ativar categoria'
                                                        }
                                                    >
                                                        <Power size={15} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={6}>
                                        <div className="categories-empty">
                                            <div className="categories-empty-icon">
                                                <Tag size={23} />
                                            </div>

                                            <strong>
                                                {search || statusFilter !== 'all'
                                                    ? 'Nenhuma categoria encontrada'
                                                    : 'Nenhuma categoria cadastrada'}
                                            </strong>

                                            <p>
                                                {search || statusFilter !== 'all'
                                                    ? 'Altere os filtros para encontrar outras categorias.'
                                                    : 'Crie categorias para organizar os chamados e as solicitações de serviço.'}
                                            </p>

                                            {!search && statusFilter === 'all' && (
                                                <button
                                                    type="button"
                                                    onClick={openCreateModal}
                                                >
                                                    <Plus size={15} />
                                                    Criar primeira categoria
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <footer className="categories-table-footer">
                    <span>
                        Exibindo <strong>{filteredCategories.length}</strong>{' '}
                        {filteredCategories.length === 1 ? 'categoria' : 'categorias'}
                    </span>

                    <span>
                        <Layers3 size={14} />
                        Dados da empresa selecionada
                    </span>
                </footer>
            </section>

            {modalOpen && (
                <div
                    className="categories-modal-overlay"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) closeModal();
                    }}
                >
                    <section
                        className="categories-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="categories-modal-title"
                    >
                        <header className="categories-modal-header">
                            <div>
                                <span>
                                    {editingCategory ? 'ATUALIZAÇÃO' : 'NOVA CONFIGURAÇÃO'}
                                </span>

                                <h2 id="categories-modal-title">
                                    {editingCategory ? 'Editar categoria' : 'Nova categoria'}
                                </h2>

                                <p>
                                    Defina como essa categoria será utilizada nas solicitações.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={closeModal}
                                disabled={saving}
                                aria-label="Fechar modal"
                            >
                                <X size={19} />
                            </button>
                        </header>

                        <form onSubmit={handleSubmit}>
                            {formError && (
                                <div className="categories-form-error">
                                    <AlertCircle size={16} />
                                    <span>{formError}</span>
                                </div>
                            )}

                            <div className="categories-form-section">
                                <div className="categories-form-section-heading">
                                    <span>01</span>
                                    <div>
                                        <strong>Informações gerais</strong>
                                        <small>Identificação da categoria</small>
                                    </div>
                                </div>

                                <div className="categories-form-field">
                                    <label htmlFor="category-name">
                                        Nome da categoria <span>*</span>
                                    </label>

                                    <input
                                        id="category-name"
                                        type="text"
                                        maxLength={120}
                                        placeholder="Ex.: Suporte técnico"
                                        value={form.name}
                                        onChange={(event) =>
                                            updateForm('name', event.target.value)
                                        }
                                        required
                                        autoFocus
                                        disabled={saving}
                                    />
                                </div>

                                <div className="categories-form-field">
                                    <label htmlFor="category-description">
                                        Descrição
                                    </label>

                                    <textarea
                                        id="category-description"
                                        rows={3}
                                        placeholder="Explique quando essa categoria deve ser utilizada..."
                                        value={form.description ?? ''}
                                        onChange={(event) =>
                                            updateForm('description', event.target.value)
                                        }
                                        disabled={saving}
                                    />
                                </div>

                                <div className="categories-form-grid">
                                    <div className="categories-form-field">
                                        <label htmlFor="category-icon">Ícone</label>

                                        <select
                                            id="category-icon"
                                            value={form.icon ?? 'Tag'}
                                            onChange={(event) =>
                                                updateForm('icon', event.target.value)
                                            }
                                            disabled={saving}
                                        >
                                            {ICON_OPTIONS.map((option) => (
                                                <option
                                                    key={option.value}
                                                    value={option.value}
                                                >
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="categories-form-field">
                                        <label>Cor de identificação</label>

                                        <div className="categories-color-options">
                                            {COLOR_OPTIONS.map((color) => (
                                                <button
                                                    key={color.value}
                                                    type="button"
                                                    className={
                                                        form.color === color.value
                                                            ? 'selected'
                                                            : ''
                                                    }
                                                    style={{ '--category-color': color.value } as CSSProperties}
                                                    onClick={() => updateForm('color', color.value)}
                                                    title={color.label}
                                                    aria-label={`Selecionar cor ${color.label}`}
                                                    aria-pressed={form.color === color.value}
                                                    disabled={saving}
                                                >
                                                    {form.color === color.value && (
                                                        <Check size={14} />
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="categories-form-divider" />

                            <div className="categories-form-section">
                                <div className="categories-form-section-heading">
                                    <span>02</span>
                                    <div>
                                        <strong>Direcionamento</strong>
                                        <small>Defina quem será responsável pelo atendimento</small>
                                    </div>
                                </div>

                                <div className="categories-form-grid">
                                    <div className="categories-form-field">
                                        <label htmlFor="category-department">
                                            Departamento
                                        </label>

                                        <select
                                            id="category-department"
                                            value={form.departmentId ?? ''}
                                            onChange={(event) =>
                                                handleDepartmentChange(event.target.value)
                                            }
                                            disabled={saving}
                                        >
                                            <option value="">Sem departamento</option>

                                            {departments
                                                .filter((department) => department.status === 'active')
                                                .map((department) => (
                                                    <option
                                                        key={department.id}
                                                        value={department.id}
                                                    >
                                                        {department.name}
                                                    </option>
                                                ))}
                                        </select>
                                    </div>

                                    <div className="categories-form-field">
                                        <label htmlFor="category-team">
                                            Equipe padrão
                                        </label>

                                        <select
                                            id="category-team"
                                            value={form.defaultTeamId ?? ''}
                                            onChange={(event) =>
                                                updateForm(
                                                    'defaultTeamId',
                                                    event.target.value || null
                                                )
                                            }
                                            disabled={saving}
                                        >
                                            <option value="">Sem equipe padrão</option>

                                            {availableTeams.map((team) => (
                                                <option key={team.id} value={team.id}>
                                                    {team.name}
                                                </option>
                                            ))}
                                        </select>

                                        {form.departmentId && availableTeams.length === 0 && (
                                            <small className="categories-field-hint">
                                                Não há equipes ativas neste departamento.
                                            </small>
                                        )}
                                    </div>
                                </div>

                                <p className="categories-form-helper">
                                    A equipe padrão será sugerida ao abrir uma solicitação.
                                    Ela precisa pertencer ao departamento selecionado.
                                </p>
                            </div>

                            <div className="categories-form-divider" />

                            <div className="categories-form-section">
                                <div className="categories-form-section-heading">
                                    <span>03</span>
                                    <div>
                                        <strong>Regras de atendimento</strong>
                                        <small>Defina o comportamento da categoria</small>
                                    </div>
                                </div>

                                <div className="categories-form-field">
                                    <label htmlFor="category-demand-type">
                                        Tipo de demanda permitido
                                    </label>

                                    <select
                                        id="category-demand-type"
                                        value={form.demandType}
                                        onChange={(event) =>
                                            updateForm(
                                                'demandType',
                                                event.target.value as DemandType
                                            )
                                        }
                                        disabled={saving}
                                    >
                                        <option value="both">Chamados e solicitações de serviço</option>
                                        <option value="ticket">Somente chamados</option>
                                        <option value="service_request">Somente solicitações de serviço</option>
                                    </select>
                                </div>

                                <label className="categories-approval-toggle">
                                    <span className="categories-toggle-icon">
                                        <ShieldCheck size={18} />
                                    </span>

                                    <span className="categories-toggle-copy">
                                        <strong>Exigir aprovação</strong>
                                        <small>
                                            Solicitações desta categoria precisarão passar por aprovação.
                                        </small>
                                    </span>

                                    <input
                                        type="checkbox"
                                        checked={form.requiresApproval}
                                        onChange={(event) =>
                                            updateForm('requiresApproval', event.target.checked)
                                        }
                                        disabled={saving}
                                    />

                                    <span className="categories-switch" />
                                </label>
                            </div>

                            <footer className="categories-modal-footer">
                                <button
                                    type="button"
                                    className="categories-cancel-button"
                                    onClick={closeModal}
                                    disabled={saving}
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    className="categories-submit-button"
                                    disabled={saving}
                                >
                                    {saving ? (
                                        <>
                                            <span className="categories-spinner" />
                                            Salvando...
                                        </>
                                    ) : (
                                        <>
                                            <Plus size={16} />
                                            {editingCategory ? 'Salvar alterações' : 'Criar categoria'}
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

export default Categorias;
