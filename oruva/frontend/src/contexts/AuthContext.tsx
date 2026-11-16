
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
    type ReactNode
} from 'react';

import { api } from '../services/api';
import { ApiError } from '../services/api';

// ==============================
// TIPOS
// ==============================

export interface Usuario {
    id: string;
    name: string;
    email: string;
    avatar_url: string | null;
    system_role: string;
}

export interface Empresa {
    company_member_id: string;
    company_id: string;
    name: string;
    slug: string;
    role: 'admin' | 'manager' | 'agent' | 'collaborator';
}

interface AuthResponse {
    usuario: Usuario;
    empresas: Empresa[];
    empresaSelecionada: string | null;
}

interface LoginResponse extends AuthResponse {
    message: string;
}

interface LoginCredentials {
    email: string;
    password: string;
}

// ==============================
// INTERFACE DO CONTEXTO
// ==============================

interface AuthContextData {
    usuario: Usuario | null;
    empresas: Empresa[];
    empresaSelecionada: string | null;

    autenticado: boolean;
    carregando: boolean;

    login: (credentials: LoginCredentials) => Promise<void>;
    logout: () => Promise<void>;
    recuperarSessao: () => Promise<void>;
}

// ==============================
// CONTEXTO
// ==============================

const AuthContext = createContext<AuthContextData | undefined>(
    undefined
);

// ==============================
// PROVIDER
// ==============================

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {

    const [usuario, setUsuario] = useState<Usuario | null>(null);
    const [empresas, setEmpresas] = useState<Empresa[]>([]);
    const [empresaSelecionada, setEmpresaSelecionada] =
        useState<string | null>(null);

    const [carregando, setCarregando] = useState(true);

    // Limpar dados da autenticação
    const limparAutenticacao = useCallback(() => {
        setUsuario(null);
        setEmpresas([]);
        setEmpresaSelecionada(null);
    }, []);

    // Recuperar sessão existente
    const recuperarSessao = useCallback(async () => {

        try {
            const response = await api.get<AuthResponse>('/auth/me');

            setUsuario(response.usuario);
            setEmpresas(response.empresas);
            setEmpresaSelecionada(response.empresaSelecionada);

        } catch (error) {

            if (error instanceof ApiError && error.status === 401) {
                limparAutenticacao();
                return;
            }

            // Erros de conexão não significam necessariamente
            // que a sessão deixou de existir.
            throw error;

        }

    }, [limparAutenticacao]);

    // Login
    const login = async ({ email, password }: LoginCredentials) => {

        const response = await api.post<LoginResponse>(
            '/auth/login',
            {
                email,
                password
            }
        );

        setUsuario(response.usuario);
        setEmpresas(response.empresas);
        setEmpresaSelecionada(response.empresaSelecionada);
    };

    // Logout
    const logout = async () => {

        await api.post('/auth/logout');

        limparAutenticacao();
    };

    // Verificar sessão ao iniciar a aplicação
    useEffect(() => {

        let ativo = true;

        async function inicializar() {
            try {
                await recuperarSessao();
            } catch (error) {
                console.error('Erro ao recuperar sessão:', error);
            } finally {
                if (ativo) {
                    setCarregando(false);
                }
            }
        }

        inicializar();

        return () => {
            ativo = false;
        };

    }, [recuperarSessao]);

    const value: AuthContextData = {
        usuario,
        empresas,
        empresaSelecionada,

        autenticado: !!usuario,
        carregando,

        login,
        logout,
        recuperarSessao
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

// ==============================
// HOOK
// ==============================

export function useAuth() {

    const context = useContext(AuthContext);

    if (!context) {
        throw new Error(
            'useAuth precisa ser utilizado dentro de AuthProvider.'
        );
    }

    return context;
}
