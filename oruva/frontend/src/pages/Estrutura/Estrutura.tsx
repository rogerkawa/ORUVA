
import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type FormEvent
} from 'react';

import {
    Building2,
    Users,
    Plus,
    Search,
    RefreshCw,
    Pencil,
    Power,
    Layers3,
    X,
    AlertCircle,
    CheckCircle2,
    Network,
    FolderTree
} from 'lucide-react';

import { organizationService } from '../../services/organizationService';

import type {
    Department,
    DepartmentPayload,
    OrganizationStatus,
    Team,
    TeamPayload
} from '../../types/organization';

import './Estrutura.css';

type Tab = 'departments' | 'teams';
type ModalType = 'department' | 'team';

const INITIAL_DEPARTMENT: DepartmentPayload = {
    name: '',
    description: '',
    managerMemberId: null
};

const INITIAL_TEAM: TeamPayload = {
    name: '',
    description: '',
    departmentId: null
};

function Estrutura() {
    const [activeTab, setActiveTab] = useState<Tab>('departments');

    const [departments, setDepartments] = useState<Department[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [saving, setSaving] = useState(false);

    const [error, setError] = useState('');
    const [feedback, setFeedback] = useState('');
    const [search, setSearch] = useState('');

    const [modalOpen, setModalOpen] = useState(false);
    const [modalType, setModalType] = useState<ModalType>('department');
    const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
    const [editingTeam, setEditingTeam] = useState<Team | null>(null);

    const [departmentForm, setDepartmentForm] = useState<DepartmentPayload>(
        INITIAL_DEPARTMENT
    );

    const [teamForm, setTeamForm] = useState<TeamPayload>(
        INITIAL_TEAM
    );

    const [formError, setFormError] = useState('');

    const loadData = useCallback(async (showRefresh = false) => {
        try {
            if (showRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            setError('');

            const [departmentResponse, teamResponse] = await Promise.all([
                organizationService.departments.listar(),
                organizationService.teams.listar()
            ]);

            setDepartments(departmentResponse.departamentos ?? []);
            setTeams(teamResponse.equipes ?? []);
        } catch (err) {
            console.error('Erro ao carregar estrutura organizacional:', err);

            setError(
                err instanceof Error
                    ? err.message
                    : 'Não foi possível carregar os dados da empresa.'
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const filteredDepartments = useMemo(() => {
        const term = search.trim().toLowerCase();

        if (!term) return departments;

        return departments.filter((department) =>
            [
                department.name,
                department.description,
                department.manager_name
            ]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(term))
        );
    }, [departments, search]);

    const filteredTeams = useMemo(() => {
        const term = search.trim().toLowerCase();

        if (!term) return teams;

        return teams.filter((team) =>
            [
                team.name,
                team.description,
                team.department_name
            ]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(term))
        );
    }, [teams, search]);

    const activeDepartments = departments.filter(
        (department) => department.status === 'active'
    ).length;

    const activeTeams = teams.filter(
        (team) => team.status === 'active'
    ).length;

    function openCreateDepartment() {
        setModalType('department');
        setEditingDepartment(null);
        setEditingTeam(null);
        setDepartmentForm(INITIAL_DEPARTMENT);
        setFormError('');
        setModalOpen(true);
    }

    function openEditDepartment(department: Department) {
        setModalType('department');
        setEditingDepartment(department);
        setEditingTeam(null);

        setDepartmentForm({
            name: department.name,
            description: department.description ?? '',
            managerMemberId: department.manager_member_id ?? null
        });

        setFormError('');
        setModalOpen(true);
    }

    function openCreateTeam() {
        setModalType('team');
        setEditingTeam(null);
        setEditingDepartment(null);
        setTeamForm(INITIAL_TEAM);
        setFormError('');
        setModalOpen(true);
    }

    function openEditTeam(team: Team) {
        setModalType('team');
        setEditingTeam(team);
        setEditingDepartment(null);

        setTeamForm({
            name: team.name,
            description: team.description ?? '',
            departmentId: team.department_id ?? null
        });

        setFormError('');
        setModalOpen(true);
    }

    function closeModal() {
        if (saving) return;

        setModalOpen(false);
        setFormError('');
    }

    async function handleDepartmentSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const name = departmentForm.name.trim();

        if (!name) {
            setFormError('Informe o nome do departamento.');
            return;
        }

        if (name.length > 120) {
            setFormError('O nome deve ter no máximo 120 caracteres.');
            return;
        }

        try {
            setSaving(true);
            setFormError('');

            const payload: DepartmentPayload = {
                name,
                description: departmentForm.description?.trim() || null,
                managerMemberId: departmentForm.managerMemberId ?? null
            };

            if (editingDepartment) {
                await organizationService.departments.atualizar(
                    editingDepartment.id,
                    payload
                );

                setFeedback('Departamento atualizado com sucesso.');
            } else {
                await organizationService.departments.criar(payload);

                setFeedback('Departamento criado com sucesso.');
            }

            setModalOpen(false);
            await loadData(true);
        } catch (err) {
            console.error('Erro ao salvar departamento:', err);

            setFormError(
                err instanceof Error
                    ? err.message
                    : 'Não foi possível salvar o departamento.'
            );
        } finally {
            setSaving(false);
        }
    }

    async function handleTeamSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const name = teamForm.name.trim();

        if (!name) {
            setFormError('Informe o nome da equipe.');
            return;
        }

        if (name.length > 120) {
            setFormError('O nome deve ter no máximo 120 caracteres.');
            return;
        }

        try {
            setSaving(true);
            setFormError('');

            const payload: TeamPayload = {
                name,
                description: teamForm.description?.trim() || null,
                departmentId: teamForm.departmentId || null
            };

            if (editingTeam) {
                await organizationService.teams.atualizar(
                    editingTeam.id,
                    payload
                );

                setFeedback('Equipe atualizada com sucesso.');
            } else {
                await organizationService.teams.criar(payload);

                setFeedback('Equipe criada com sucesso.');
            }

            setModalOpen(false);
            await loadData(true);
        } catch (err) {
            console.error('Erro ao salvar equipe:', err);

            setFormError(
                err instanceof Error
                    ? err.message
                    : 'Não foi possível salvar a equipe.'
            );
        } finally {
            setSaving(false);
        }
    }

    async function handleDepartmentStatus(department: Department) {
        const nextStatus: OrganizationStatus =
            department.status === 'active' ? 'inactive' : 'active';

        try {
            setError('');

            const response = await organizationService.departments.alterarStatus(
                department.id,
                nextStatus
            );

            setFeedback(response.message);
            await loadData(true);
        } catch (err) {
            console.error('Erro ao alterar status do departamento:', err);

            setError(
                err instanceof Error
                    ? err.message
                    : 'Não foi possível alterar o status do departamento.'
            );
        }
    }

    async function handleTeamStatus(team: Team) {
        const nextStatus: OrganizationStatus =
            team.status === 'active' ? 'inactive' : 'active';

        try {
            setError('');

            const response = await organizationService.teams.alterarStatus(
                team.id,
                nextStatus
            );

            setFeedback(response.message);
            await loadData(true);
        } catch (err) {
            console.error('Erro ao alterar status da equipe:', err);

            setError(
                err instanceof Error
                    ? err.message
                    : 'Não foi possível alterar o status da equipe.'
            );
        }
    }

    const isDepartmentTab = activeTab === 'departments';

    const currentCount = isDepartmentTab
        ? filteredDepartments.length
        : filteredTeams.length;

    return (
        <main className="structure-page">
            <header className="structure-header">
                <div>
                    <div className="structure-eyebrow">
                        <span />
                        ADMINISTRAÇÃO DA EMPRESA
                    </div>

                    <h1>Estrutura organizacional</h1>

                    <p>
                        Organize os departamentos e as equipes que compõem sua operação.
                    </p>
                </div>

                <button
                    type="button"
                    className="structure-refresh"
                    onClick={() => loadData(true)}
                    disabled={refreshing || loading}
                    aria-label="Atualizar estrutura"
                >
                    <RefreshCw
                        size={17}
                        className={refreshing ? 'structure-spinning' : ''}
                    />
                </button>
            </header>

            {feedback && (
                <div className="structure-feedback">
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
                <div className="structure-error">
                    <AlertCircle size={17} />
                    <span>{error}</span>

                    <button
                        type="button"
                        onClick={() => loadData()}
                    >
                        Tentar novamente
                    </button>
                </div>
            )}

            <section className="structure-overview">
                <article className="structure-overview-card">
                    <div className="structure-overview-icon">
                        <Building2 size={20} />
                    </div>

                    <div>
                        <span>Departamentos</span>
                        <strong>{loading ? '—' : departments.length}</strong>
                        <small>{activeDepartments} ativos</small>
                    </div>
                </article>

                <article className="structure-overview-card">
                    <div className="structure-overview-icon">
                        <Users size={20} />
                    </div>

                    <div>
                        <span>Equipes</span>
                        <strong>{loading ? '—' : teams.length}</strong>
                        <small>{activeTeams} ativas</small>
                    </div>
                </article>

                <article className="structure-overview-card">
                    <div className="structure-overview-icon">
                        <Layers3 size={20} />
                    </div>

                    <div>
                        <span>Integrantes em equipes</span>
                        <strong>
                            {loading
                                ? '—'
                                : teams.reduce(
                                    (total, team) => total + Number(team.members_count || 0),
                                    0
                                )}
                        </strong>
                        <small>Vínculos cadastrados</small>
                    </div>
                </article>
            </section>

            <section className="structure-panel">
                <div className="structure-panel-header">
                    <div>
                        <h2>Organização interna</h2>
                        <p>
                            Gerencie a divisão de responsabilidades da empresa.
                        </p>
                    </div>
                </div>

                <div className="structure-tabs">
                    <button
                        type="button"
                        className={activeTab === 'departments' ? 'active' : ''}
                        onClick={() => {
                            setActiveTab('departments');
                            setSearch('');
                        }}
                    >
                        <Building2 size={16} />
                        Departamentos
                        <span>{departments.length}</span>
                    </button>

                    <button
                        type="button"
                        className={activeTab === 'teams' ? 'active' : ''}
                        onClick={() => {
                            setActiveTab('teams');
                            setSearch('');
                        }}
                    >
                        <Users size={16} />
                        Equipes
                        <span>{teams.length}</span>
                    </button>
                </div>

                <div className="structure-toolbar">
                    <label className="structure-search">
                        <Search size={16} />

                        <input
                            type="search"
                            placeholder={
                                isDepartmentTab
                                    ? 'Buscar departamento...'
                                    : 'Buscar equipe...'
                            }
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

                    <button
                        type="button"
                        className="structure-create-button"
                        onClick={
                            isDepartmentTab
                                ? openCreateDepartment
                                : openCreateTeam
                        }
                    >
                        <Plus size={17} />
                        {isDepartmentTab
                            ? 'Novo departamento'
                            : 'Nova equipe'}
                    </button>
                </div>

                <div className="structure-table-wrapper">
                    <table className="structure-table">
                        <thead>
                            {isDepartmentTab ? (
                                <tr>
                                    <th>Departamento</th>
                                    <th>Responsável</th>
                                    <th>Equipes</th>
                                    <th>Status</th>
                                    <th>Ações</th>
                                </tr>
                            ) : (
                                <tr>
                                    <th>Equipe</th>
                                    <th>Departamento</th>
                                    <th>Integrantes</th>
                                    <th>Status</th>
                                    <th>Ações</th>
                                </tr>
                            )}
                        </thead>

                        <tbody>
                            {loading ? (
                                Array.from({ length: 4 }).map((_, index) => (
                                    <tr key={index} className="structure-skeleton-row">
                                        {Array.from({ length: 5 }).map((__, cell) => (
                                            <td key={cell}>
                                                <span />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : isDepartmentTab ? (
                                filteredDepartments.length > 0 ? (
                                    filteredDepartments.map((department) => {
                                        const departmentTeams = teams.filter(
                                            (team) =>
                                                String(team.department_id) ===
                                                String(department.id)
                                        ).length;

                                        return (
                                            <tr key={department.id}>
                                                <td>
                                                    <div className="structure-name-cell">
                                                        <div className="structure-row-icon">
                                                            <Building2 size={17} />
                                                        </div>

                                                        <div>
                                                            <strong>{department.name}</strong>
                                                            <small>
                                                                {department.description || 'Sem descrição'}
                                                            </small>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td>
                                                    <span className="structure-secondary-text">
                                                        {department.manager_name || 'Não definido'}
                                                    </span>
                                                </td>

                                                <td>
                                                    <span className="structure-count">
                                                        <FolderTree size={14} />
                                                        {departmentTeams}
                                                    </span>
                                                </td>

                                                <td>
                                                    <span className={`structure-status ${department.status}`}>
                                                        <i />
                                                        {department.status === 'active'
                                                            ? 'Ativo'
                                                            : 'Inativo'}
                                                    </span>
                                                </td>

                                                <td>
                                                    <div className="structure-actions">
                                                        <button
                                                            type="button"
                                                            onClick={() => openEditDepartment(department)}
                                                            title="Editar departamento"
                                                            aria-label={`Editar ${department.name}`}
                                                        >
                                                            <Pencil size={15} />
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => handleDepartmentStatus(department)}
                                                            title={
                                                                department.status === 'active'
                                                                    ? 'Desativar departamento'
                                                                    : 'Ativar departamento'
                                                            }
                                                            aria-label={
                                                                department.status === 'active'
                                                                    ? 'Desativar departamento'
                                                                    : 'Ativar departamento'
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
                                        <td colSpan={5}>
                                            <EmptyState
                                                title={
                                                    search
                                                        ? 'Nenhum departamento encontrado'
                                                        : 'Nenhum departamento cadastrado'
                                                }
                                                description={
                                                    search
                                                        ? 'Tente alterar os termos da busca.'
                                                        : 'Crie departamentos para organizar as áreas da empresa.'
                                                }
                                                onCreate={search ? undefined : openCreateDepartment}
                                                actionLabel="Criar departamento"
                                            />
                                        </td>
                                    </tr>
                                )
                            ) : filteredTeams.length > 0 ? (
                                filteredTeams.map((team) => (
                                    <tr key={team.id}>
                                        <td>
                                            <div className="structure-name-cell">
                                                <div className="structure-row-icon">
                                                    <Users size={17} />
                                                </div>

                                                <div>
                                                    <strong>{team.name}</strong>
                                                    <small>
                                                        {team.description || 'Sem descrição'}
                                                    </small>
                                                </div>
                                            </div>
                                        </td>

                                        <td>
                                            <span className="structure-secondary-text">
                                                {team.department_name || 'Sem departamento'}
                                            </span>
                                        </td>

                                        <td>
                                            <span className="structure-count">
                                                <Users size={14} />
                                                {Number(team.members_count || 0)}
                                            </span>
                                        </td>

                                        <td>
                                            <span className={`structure-status ${team.status}`}>
                                                <i />
                                                {team.status === 'active'
                                                    ? 'Ativa'
                                                    : 'Inativa'}
                                            </span>
                                        </td>

                                        <td>
                                            <div className="structure-actions">
                                                <button
                                                    type="button"
                                                    onClick={() => openEditTeam(team)}
                                                    title="Editar equipe"
                                                    aria-label={`Editar ${team.name}`}
                                                >
                                                    <Pencil size={15} />
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => handleTeamStatus(team)}
                                                    title={
                                                        team.status === 'active'
                                                            ? 'Desativar equipe'
                                                            : 'Ativar equipe'
                                                    }
                                                    aria-label={
                                                        team.status === 'active'
                                                            ? 'Desativar equipe'
                                                            : 'Ativar equipe'
                                                    }
                                                >
                                                    <Power size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5}>
                                        <EmptyState
                                            title={
                                                search
                                                    ? 'Nenhuma equipe encontrada'
                                                    : 'Nenhuma equipe cadastrada'
                                            }
                                            description={
                                                search
                                                    ? 'Tente alterar os termos da busca.'
                                                    : 'Crie equipes para distribuir as responsabilidades entre os departamentos.'
                                            }
                                            onCreate={search ? undefined : openCreateTeam}
                                            actionLabel="Criar equipe"
                                        />
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <footer className="structure-table-footer">
                    <span>
                        Exibindo <strong>{currentCount}</strong>{' '}
                        {currentCount === 1 ? 'registro' : 'registros'}
                    </span>

                    <span>
                        <Network size={14} />
                        Dados da empresa selecionada
                    </span>
                </footer>
            </section>

            {modalOpen && (
                <div
                    className="structure-modal-overlay"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            closeModal();
                        }
                    }}
                >
                    <section
                        className="structure-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="structure-modal-title"
                    >
                        <header className="structure-modal-header">
                            <div>
                                <span>
                                    {editingDepartment || editingTeam
                                        ? 'ATUALIZAÇÃO'
                                        : 'NOVO CADASTRO'}
                                </span>

                                <h2 id="structure-modal-title">
                                    {modalType === 'department'
                                        ? editingDepartment
                                            ? 'Editar departamento'
                                            : 'Novo departamento'
                                        : editingTeam
                                            ? 'Editar equipe'
                                            : 'Nova equipe'}
                                </h2>

                                <p>
                                    {modalType === 'department'
                                        ? 'Defina as informações da área organizacional.'
                                        : 'Configure a equipe e seu departamento vinculado.'}
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

                        {modalType === 'department' ? (
                            <form onSubmit={handleDepartmentSubmit}>
                                <div className="structure-form-field">
                                    <label htmlFor="department-name">
                                        Nome do departamento <span>*</span>
                                    </label>

                                    <input
                                        id="department-name"
                                        type="text"
                                        maxLength={120}
                                        placeholder="Ex.: Tecnologia"
                                        value={departmentForm.name}
                                        onChange={(event) =>
                                            setDepartmentForm((current) => ({
                                                ...current,
                                                name: event.target.value
                                            }))
                                        }
                                        disabled={saving}
                                        required
                                        autoFocus
                                    />
                                </div>

                                <div className="structure-form-field">
                                    <label htmlFor="department-description">
                                        Descrição
                                    </label>

                                    <textarea
                                        id="department-description"
                                        rows={4}
                                        placeholder="Descreva a função deste departamento..."
                                        value={departmentForm.description ?? ''}
                                        onChange={(event) =>
                                            setDepartmentForm((current) => ({
                                                ...current,
                                                description: event.target.value
                                            }))
                                        }
                                        disabled={saving}
                                    />
                                </div>

                                <div className="structure-form-note">
                                    <AlertCircle size={15} />
                                    <span>
                                        O responsável pelo departamento poderá ser configurado
                                        quando a gestão de membros estiver disponível nesta área.
                                    </span>
                                </div>

                                <ModalFooter
                                    saving={saving}
                                    onCancel={closeModal}
                                    submitLabel={
                                        editingDepartment
                                            ? 'Salvar alterações'
                                            : 'Criar departamento'
                                    }
                                />
                            </form>
                        ) : (
                            <form onSubmit={handleTeamSubmit}>
                                <div className="structure-form-field">
                                    <label htmlFor="team-name">
                                        Nome da equipe <span>*</span>
                                    </label>

                                    <input
                                        id="team-name"
                                        type="text"
                                        maxLength={120}
                                        placeholder="Ex.: Desenvolvimento"
                                        value={teamForm.name}
                                        onChange={(event) =>
                                            setTeamForm((current) => ({
                                                ...current,
                                                name: event.target.value
                                            }))
                                        }
                                        disabled={saving}
                                        required
                                        autoFocus
                                    />
                                </div>

                                <div className="structure-form-field">
                                    <label htmlFor="team-department">
                                        Departamento vinculado
                                    </label>

                                    <select
                                        id="team-department"
                                        value={teamForm.departmentId ?? ''}
                                        onChange={(event) =>
                                            setTeamForm((current) => ({
                                                ...current,
                                                departmentId: event.target.value || null
                                            }))
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

                                    {departments.filter(
                                        (department) => department.status === 'active'
                                    ).length === 0 && (
                                        <small className="structure-field-hint">
                                            Cadastre um departamento ativo para vinculá-lo à equipe.
                                        </small>
                                    )}
                                </div>

                                <div className="structure-form-field">
                                    <label htmlFor="team-description">
                                        Descrição
                                    </label>

                                    <textarea
                                        id="team-description"
                                        rows={4}
                                        placeholder="Descreva as responsabilidades desta equipe..."
                                        value={teamForm.description ?? ''}
                                        onChange={(event) =>
                                            setTeamForm((current) => ({
                                                ...current,
                                                description: event.target.value
                                            }))
                                        }
                                        disabled={saving}
                                    />
                                </div>

                                <div className="structure-form-note">
                                    <AlertCircle size={15} />
                                    <span>
                                        Os integrantes poderão ser vinculados à equipe
                                        posteriormente, pela gestão de membros.
                                    </span>
                                </div>

                                <ModalFooter
                                    saving={saving}
                                    onCancel={closeModal}
                                    submitLabel={
                                        editingTeam
                                            ? 'Salvar alterações'
                                            : 'Criar equipe'
                                    }
                                />
                            </form>
                        )}

                        {formError && (
                            <div className="structure-modal-error">
                                <AlertCircle size={15} />
                                <span>{formError}</span>
                            </div>
                        )}
                    </section>
                </div>
            )}
        </main>
    );
}

function EmptyState({
    title,
    description,
    onCreate,
    actionLabel
}: {
    title: string;
    description: string;
    onCreate?: () => void;
    actionLabel: string;
}) {
    return (
        <div className="structure-empty">
            <div className="structure-empty-icon">
                <Layers3 size={22} />
            </div>

            <strong>{title}</strong>
            <p>{description}</p>

            {onCreate && (
                <button
                    type="button"
                    onClick={onCreate}
                >
                    <Plus size={15} />
                    {actionLabel}
                </button>
            )}
        </div>
    );
}

function ModalFooter({
    saving,
    onCancel,
    submitLabel
}: {
    saving: boolean;
    onCancel: () => void;
    submitLabel: string;
}) {
    return (
        <footer className="structure-modal-footer">
            <button
                type="button"
                className="structure-cancel-button"
                onClick={onCancel}
                disabled={saving}
            >
                Cancelar
            </button>

            <button
                type="submit"
                className="structure-submit-button"
                disabled={saving}
            >
                {saving ? (
                    <>
                        <span className="structure-spinner" />
                        Salvando...
                    </>
                ) : (
                    <>
                        <Plus size={16} />
                        {submitLabel}
                    </>
                )}
            </button>
        </footer>
    );
}

export default Estrutura;
