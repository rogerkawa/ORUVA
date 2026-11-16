
import { useState } from 'react';

import { useAuth } from './contexts/AuthContext';

import Login from './pages/Login/Login';
import SolicitarAcesso from './pages/SolicitarAcesso/SolicitarAcesso';

type Pagina = 'login' | 'solicitacao';

function App() {
    const {
        autenticado,
        carregando,
        usuario,
        logout
    } = useAuth();

    const [pagina, setPagina] = useState<Pagina>('login');

    if (carregando) {
        return (
            <div className="app-loading">
                <div className="app-loading-spinner" />
                <span>Preparando seu ambiente...</span>
            </div>
        );
    }

    if (!autenticado) {
        if (pagina === 'solicitacao') {
            return (
                <SolicitarAcesso
                    onVoltarLogin={() => setPagina('login')}
                />
            );
        }

        return (
            <Login
                onSolicitarAcesso={() => setPagina('solicitacao')}
            />
        );
    }

    return (
        <main className="authenticated-placeholder">
            <div className="authenticated-card">
                <span className="authenticated-label">
                    AUTENTICAÇÃO CONCLUÍDA
                </span>

                <h1>Olá, {usuario?.name}.</h1>

                <p>
                    Sua sessão no Oruva está ativa.
                    Em breve, seu ambiente de trabalho estará aqui.
                </p>

                <button onClick={logout}>
                    Sair da plataforma
                </button>
            </div>
        </main>
    );
}

export default App;
