
import { api } from './api';

import type {
    CategoriesResponse,
    Category,
    CategoryMutationResponse,
    CategoryPayload,
    CategoryStatus
} from '../types/category';

export const categoryService = {
    async listar(): Promise<CategoriesResponse> {
        return api.get<CategoriesResponse>('/categories');
    },

    async buscarPorId(
        id: number | string
    ): Promise<{ categoria: Category }> {
        return api.get<{ categoria: Category }>(
            `/categories/${id}`
        );
    },

    async criar(
        payload: CategoryPayload
    ): Promise<CategoryMutationResponse> {
        return api.post<CategoryMutationResponse>(
            '/categories',
            payload
        );
    },

    async atualizar(
        id: number | string,
        payload: CategoryPayload
    ): Promise<{ message: string }> {
        return api.put<{ message: string }>(
            `/categories/${id}`,
            payload
        );
    },

    async alterarStatus(
        id: number | string,
        status: CategoryStatus
    ): Promise<{ message: string }> {
        return api.patch<{ message: string }>(
            `/categories/${id}/status`,
            { status }
        );
    }
};
