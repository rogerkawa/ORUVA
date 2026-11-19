
export type ProcessStatus =
    | 'active'
    | 'paused'
    | 'completed'
    | 'canceled';

export type ProcessPriority =
    | 'low'
    | 'medium'
    | 'high'
    | 'critical';

export interface Process {
    id: number | string;
    company_id: number | string;
    template_id: number | string;
    current_step_id: number | string | null;
    created_by_member_id: number | string;
    department_id: number | string | null;
    team_id: number | string | null;
    demand_id: number | string | null;
    process_number: string;
    title: string;
    description: string | null;
    origin: 'manual' | 'demand';
    priority: ProcessPriority;
    status: ProcessStatus;
    started_at: string;
    completed_at: string | null;
    canceled_at: string | null;
    due_at: string | null;
    created_at: string;
    updated_at: string;

    template_name: string | null;
    current_step_name: string | null;
    current_step_order: number | null;
    current_step_team_id: number | string | null;
    current_step_team_name: string | null;
    team_name: string | null;
    creator_name: string | null;
    department_name?: string | null;
    demand_number?: string | null;
}

export interface ProcessTemplate {
    id: number | string;
    name: string;
    description: string | null;
    status: 'active' | 'inactive';
    steps_count: number;
    processes_count: number;
    creator_name?: string;
}

export interface ProcessTeam {
    id: number | string;
    name: string;
    status: 'active' | 'inactive';
    department_id: number | string | null;
    department_name?: string | null;
    members_count?: number;
}

export interface ProcessDepartment {
    id: number | string;
    name: string;
    status: 'active' | 'inactive';
    manager_name?: string | null;
}

export interface ProcessFilters {
    page?: number;
    limit?: number;
    status?: ProcessStatus | '';
    priority?: ProcessPriority | '';
    teamId?: string;
    templateId?: string;
    search?: string;
}

export interface ProcessPagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface ProcessListResponse {
    success: boolean;
    data: Process[];
    pagination: ProcessPagination;
}

export interface ProcessTemplatesResponse {
    success: boolean;
    data: ProcessTemplate[];
}

export interface ProcessTeamsResponse {
    equipes: ProcessTeam[];
}

export interface ProcessDepartmentsResponse {
    departamentos: ProcessDepartment[];
}

export interface CreateProcessPayload {
    templateId: number | string;
    title: string;
    description?: string | null;
    priority: ProcessPriority;
    departmentId?: number | string | null;
    teamId?: number | string | null;
    demandId?: number | string | null;
    dueAt?: string | null;
}

export interface CreateProcessResponse {
    success: boolean;
    message: string;
    data: {
        id: number | string;
        processNumber: string;
        status: ProcessStatus;
    };
}
