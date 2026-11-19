
import {
    Navigate,
    Outlet,
    Route,
    Routes,
    useNavigate
} from 'react-router-dom';

import type { ReactNode } from 'react';
import { useAuth } from './contexts/AuthContext';

import Login from './pages/Login/Login';
import SolicitarAcesso from './pages/SolicitarAcesso/SolicitarAcesso';
import AceitarConvite from './pages/AceitarConvite/AceitarConvite';
import Dashboard from './pages/Dashboard/Dashboard';
import CompanyLayout from './layouts/CompanyLayout/CompanyLayout';
import Solicitacoes from './pages/Solicitacoes/Solicitacoes';
import Processos from './pages/Processos/Processos';
import Estrutura from './pages/Estrutura/Estrutura';
import Categorias from './pages/Categorias/Categorias';



function LoadingScreen() {
    return (
        <div className="app-loading">
            <div className="app-loading-spinner" />
            <span>Preparando seu ambiente...</span>
        </div>
    );
}


// Impede usuários não autenticados de acessar a área interna.
function ProtectedRoute() {
    const { autenticado, carregando } = useAuth();

    if (carregando) {
        return <LoadingScreen />;
    }

    if (!autenticado) {
        return <Navigate to="/login" replace />;
    }

    return (
        <CompanyLayout>
            <Outlet />
        </CompanyLayout>
    );
}

// Impede usuários autenticados de acessar telas públicas.
function PublicRoute({ children }: { children: ReactNode }) {
    const { autenticado, carregando } = useAuth();

    if (carregando) {
        return <LoadingScreen />;
    }

    if (autenticado) {
        return <Navigate to="/app" replace />;
    }

    return <>{children}</>;
}


function LoginPage() {
    const navigate = useNavigate();

    return (
        <Login
            onSolicitarAcesso={() => navigate('/solicitar-acesso')}
        />
    );
}

function SolicitarAcessoPage() {
    const navigate = useNavigate();

    return (
        <SolicitarAcesso
            onVoltarLogin={() => navigate('/login')}
        />
    );
}


function HomeRedirect() {
    const { autenticado, carregando } = useAuth();

    if (carregando) {
        return <LoadingScreen />;
    }

    return (
        <Navigate
            to={autenticado ? '/app' : '/login'}
            replace
        />
    );
}


function ComingSoon({ title }: { title: string }) {
    return (
        <section className="company-placeholder">
            <span>ORUVA · ÁREA DE TRABALHO</span>
            <h1>{title}</h1>
            <p>
                Esta área está sendo preparada e estará disponível em breve.
            </p>
        </section>
    );
}


function App() {
    return (
        <Routes>
            {/* Redirecionamento inicial */}
            <Route path="/" element={<HomeRedirect />} />

            {/* Rotas públicas */}
            <Route
                path="/login"
                element={
                    <PublicRoute>
                        <LoginPage />
                    </PublicRoute>
                }
            />

            <Route
                path="/solicitar-acesso"
                element={
                    <PublicRoute>
                        <SolicitarAcessoPage />
                    </PublicRoute>
                }
            />

            {/* Aceitação de convite não exige autenticação */}
            <Route
                path="/convite/aceitar"
                element={<AceitarConvite />}
            />

            {/* Área autenticada */}
            <Route element={<ProtectedRoute />}>
                {/* Visão geral */}
                <Route
                    path="/app"
                    element={<Dashboard />}
                />

                {/* Solicitações */}
                <Route
                    path="/app/solicitacoes"
                    element={<Solicitacoes />}
                />

                {/* Processos */}
                <Route
                    path="/app/processos"
                    element={<Processos />}
                />
                {/* Estrutura */}
                <Route
                    path="/app/estrutura"
                    element={<Estrutura />}
                />

                {/* Equipe */}
                <Route
                    path="/app/equipe"
                    element={<Navigate to="/app/estrutura" replace />}
                />
                {/* Categorias */}
                <Route
                    path="/app/categorias"
                    element={<Categorias />}
                />

                {/* Perfil */}
                <Route
                    path="/app/perfil"
                    element={<ComingSoon title="Meu perfil" />}
                />

                {/* Configurações */}
                <Route
                    path="/app/configuracoes"
                    element={<ComingSoon title="Configurações" />}
                />
            </Route>

            {/* Rota não encontrada */}
            <Route
                path="*"
                element={<HomeRedirect />}
            />
        </Routes>
    );
}

export default App;
