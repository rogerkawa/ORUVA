
const API_URL = import.meta.env.VITE_API_URL?.replace(/\/+$/, '');
console.log('API configurada:', API_URL);
export class ApiError extends Error {
    status: number;
    data: unknown;

    constructor(message: string, status: number, data: unknown) {
        super(message);

        this.name = 'ApiError';
        this.status = status;
        this.data = data;
    }
}

type ApiOptions = Omit<RequestInit, 'body'> & {
    body?: unknown;
};

async function apiRequest<T>(
    endpoint: string,
    options: ApiOptions = {}
): Promise<T> {

    if (!API_URL) {
        throw new Error('VITE_API_URL não foi configurada.');
    }

    const {
        body,
        headers: customHeaders,
        ...rest
    } = options;

    const headers = new Headers(customHeaders);

    headers.set('Accept', 'application/json');

    let requestBody: BodyInit | undefined;

    if (body instanceof FormData) {
        // O navegador configura o Content-Type automaticamente
        requestBody = body;
    } else if (body !== undefined && body !== null) {
        headers.set('Content-Type', 'application/json');
        requestBody = JSON.stringify(body);
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...rest,
        headers,
        body: requestBody,
        credentials: 'include'
    });

    if (response.status === 204) {
        return undefined as T;
    }

    const contentType = response.headers.get('content-type') || '';

    const data = contentType.includes('application/json')
        ? await response.json()
        : await response.text();

    if (!response.ok) {
        const message =
            typeof data === 'object' && data !== null && 'message' in data
                ? String(data.message)
                : 'Ocorreu um erro ao comunicar com o servidor.';

        throw new ApiError(message, response.status, data);
    }

    return data as T;
}

export const api = {
    get: <T>(endpoint: string, options?: Omit<ApiOptions, 'method' | 'body'>) =>
        apiRequest<T>(endpoint, {
            ...options,
            method: 'GET'
        }),

    post: <T>(endpoint: string, body?: unknown, options?: Omit<ApiOptions, 'method' | 'body'>) =>
        apiRequest<T>(endpoint, {
            ...options,
            method: 'POST',
            body
        }),

    put: <T>(endpoint: string, body?: unknown, options?: Omit<ApiOptions, 'method' | 'body'>) =>
        apiRequest<T>(endpoint, {
            ...options,
            method: 'PUT',
            body
        }),

    patch: <T>(endpoint: string, body?: unknown, options?: Omit<ApiOptions, 'method' | 'body'>) =>
        apiRequest<T>(endpoint, {
            ...options,
            method: 'PATCH',
            body
        }),

    delete: <T>(endpoint: string, options?: Omit<ApiOptions, 'method' | 'body'>) =>
        apiRequest<T>(endpoint, {
            ...options,
            method: 'DELETE'
        })
};
