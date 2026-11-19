
import { api } from './api';

import type {
    CreateProcessPayload,
    CreateProcessResponse,
    Process,
    ProcessDepartmentsResponse,
    ProcessFilters,
    ProcessListResponse,
    ProcessTeamsResponse,
    ProcessTemplatesResponse
} from '../types/process';

function buildQuery(filters: ProcessFilters = {}) {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
        if (
            value !== undefined &&
            value !== null &&
            value !== ''
        ) {
            params.set(key, String(value));
        }
    });

    return params.toString();
}

export const processService = {
    async listar(
        filters: ProcessFilters = {}
    ): Promise<ProcessListResponse> {
        const query = buildQuery(filters);

        return api.get<ProcessListResponse>(
            `/processes${query ? `?${query}` : ''}`
        );
    },

    async buscarPorId(id: number | string) {
        return api.get<{
            success: boolean;
            data: Process;
        }>(`/processes/${id}`);
    },

    async listarModelos() {
        return api.get<ProcessTemplatesResponse>(
            '/process-templates?status=active'
        );
    },

    async listarEquipes() {
        return api.get<ProcessTeamsResponse>('/teams');
    },

    async listarDepartamentos() {
        return api.get<ProcessDepartmentsResponse>('/departments');
    },

    async criar(payload: CreateProcessPayload) {
        return api.post<CreateProcessResponse>(
            '/processes',
            payload
        );
    },

    async avancarEtapa(
        id: number | string,
        description?: string
    ) {
        return api.post<{
            success: boolean;
            message: string;
            data: unknown;
        }>(
            `/processes/${id}/advance`,
            { description }
        );
    },

    async pausar(
        id: number | string,
        description?: string
    ) {
        return api.patch<{
            success: boolean;
            message: string;
        }>(
            `/processes/${id}/pause`,
            { description }
        );
    },

    async retomar(
        id: number | string,
        description?: string
    ) {
        return api.patch<{
            success: boolean;
            message: string;
        }>(
            `/processes/${id}/resume`,
            { description }
        );
    },

    async concluir(
        id: number | string,
        description?: string
    ) {
        return api.patch<{
            success: boolean;
            message: string;
        }>(
            `/processes/${id}/complete`,
            { description }
        );
    },

    async cancelar(
        id: number | string,
        description: string
    ) {
        return api.patch<{
            success: boolean;
            message: string;
        }>(
            `/processes/${id}/cancel`,
            { description }
        );
    }
};
