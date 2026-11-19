
import { api } from './api';

import type {
    Department,
    DepartmentMutationResponse,
    DepartmentPayload,
    DepartmentsResponse,
    OrganizationStatus,
    Team,
    TeamMutationResponse,
    TeamPayload,
    TeamsResponse
} from '../types/organization';

export const organizationService = {
    departments: {
        async listar(): Promise<DepartmentsResponse> {
            return api.get<DepartmentsResponse>('/departments');
        },

        async buscarPorId(id: number | string) {
            return api.get<{ departamento: Department }>(
                `/departments/${id}`
            );
        },

        async criar(
            payload: DepartmentPayload
        ): Promise<DepartmentMutationResponse> {
            return api.post<DepartmentMutationResponse>(
                '/departments',
                payload
            );
        },

        async atualizar(
            id: number | string,
            payload: DepartmentPayload
        ): Promise<{ message: string }> {
            return api.put<{ message: string }>(
                `/departments/${id}`,
                payload
            );
        },

        async alterarStatus(
            id: number | string,
            status: OrganizationStatus
        ): Promise<{ message: string }> {
            return api.patch<{ message: string }>(
                `/departments/${id}/status`,
                { status }
            );
        }
    },

    teams: {
        async listar(): Promise<TeamsResponse> {
            return api.get<TeamsResponse>('/teams');
        },

        async buscarPorId(id: number | string) {
            return api.get<{ equipe: Team }>(`/teams/${id}`);
        },

        async criar(
            payload: TeamPayload
        ): Promise<TeamMutationResponse> {
            return api.post<TeamMutationResponse>(
                '/teams',
                payload
            );
        },

        async atualizar(
            id: number | string,
            payload: TeamPayload
        ): Promise<{ message: string }> {
            return api.put<{ message: string }>(
                `/teams/${id}`,
                payload
            );
        },

        async alterarStatus(
            id: number | string,
            status: OrganizationStatus
        ): Promise<{ message: string }> {
            return api.patch<{ message: string }>(
                `/teams/${id}/status`,
                { status }
            );
        },

        async listarMembros(id: number | string) {
            return api.get(
                `/teams/${id}/members`
            );
        },

        async adicionarMembro(
            id: number | string,
            companyMemberId: number | string
        ) {
            return api.post(
                `/teams/${id}/members`,
                { companyMemberId }
            );
        },

        async removerMembro(
            id: number | string,
            memberId: number | string
        ) {
            return api.delete(
                `/teams/${id}/members/${memberId}`
            );
        }
    }
};
