
export type OrganizationStatus = 'active' | 'inactive';

export interface Department {
    id: number | string;
    company_id: number | string;
    manager_member_id: number | string | null;
    name: string;
    description: string | null;
    status: OrganizationStatus;
    manager_name: string | null;
    manager_email: string | null;
    created_at: string;
    updated_at: string;
}

export interface Team {
    id: number | string;
    company_id: number | string;
    department_id: number | string | null;
    name: string;
    description: string | null;
    status: OrganizationStatus;
    department_name: string | null;
    members_count: number;
    created_at: string;
    updated_at: string;
}

export interface DepartmentPayload {
    name: string;
    description: string | null;
    managerMemberId: number | string | null;
}

export interface TeamPayload {
    name: string;
    description: string | null;
    departmentId: number | string | null;
}

export interface DepartmentsResponse {
    departamentos: Department[];
}

export interface DepartmentResponse {
    departamento: Department;
}

export interface DepartmentMutationResponse {
    message: string;
    departmentId?: number | string;
}

export interface TeamsResponse {
    equipes: Team[];
}

export interface TeamResponse {
    equipe: Team;
}

export interface TeamMutationResponse {
    message: string;
    teamId?: number | string;
}
