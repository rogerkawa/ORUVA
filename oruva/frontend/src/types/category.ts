
export type CategoryStatus = 'active' | 'inactive';

export type DemandType =
    | 'ticket'
    | 'service_request'
    | 'both';

export interface Category {
    id: number | string;
    company_id: number | string;
    department_id: number | string | null;
    default_team_id: number | string | null;
    name: string;
    description: string | null;
    form_schema: Record<string, unknown> | unknown[] | null;
    icon: string | null;
    color: string | null;
    demand_type: DemandType;
    requires_approval: boolean;
    status: CategoryStatus;
    department_name: string | null;
    default_team_name: string | null;
    created_at: string;
    updated_at: string;
}

export interface CategoryPayload {
    name: string;
    description: string | null;
    departmentId: number | string | null;
    defaultTeamId: number | string | null;
    formSchema: Record<string, unknown> | unknown[] | null;
    icon: string | null;
    color: string | null;
    demandType: DemandType;
    requiresApproval: boolean;
}

export interface CategoriesResponse {
    categorias: Category[];
}

export interface CategoryResponse {
    categoria: Category;
}

export interface CategoryMutationResponse {
    message: string;
    categoryId?: number | string;
}
