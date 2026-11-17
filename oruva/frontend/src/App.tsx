
import { Navigate, Outlet, Route, Routes, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from './contexts/AuthContext';

import Login from './pages/Login/Login';
import SolicitarAcesso from './pages/SolicitarAcesso/SolicitarAcesso';
import AceitarConvite from './pages/AceitarConvite/AceitarConvite';

import CompanyLayout from './layouts/CompanyLayout/CompanyLayout';

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

// Impede usuários autenticados de voltar às telas públicas.
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

function CompanyHome() {
    const { usuario } = useAuth();

    return (
        <section className="company-welcome">
            <span className="authenticated-label">
                AMBIENTE DE TRABALHO
            </span>

            <h1>
                Olá, {usuario?.name}.
            </h1>

            <p>
                Bem-vindo ao seu espaço de trabalho no Oruva.
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

            {/* Convite: não exige autenticação */}
            <Route
                path="/convite/aceitar"
                element={<AceitarConvite />}
            />

            {/* Área autenticada da empresa */}
            <Route element={<ProtectedRoute />}>
                <Route path="/app" element={<CompanyHome />} />
            </Route>

            {/* Rota não encontrada */}
            <Route path="*" element={<HomeRedirect />} />
        </Routes>
    );
}

export default App;
