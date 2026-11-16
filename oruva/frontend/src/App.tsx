
import { useState } from 'react';

import { useAuth } from './contexts/AuthContext';

import Login from './pages/Login/Login';
import SolicitarAcesso from './pages/SolicitarAcesso/SolicitarAcesso';

import CompanyLayout from './layouts/CompanyLayout/CompanyLayout';

type Pagina = 'login' | 'solicitacao';

function App() {
    const {
        autenticado,
        carregando,
        usuario
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
        <CompanyLayout>
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
        </CompanyLayout>
    );
}

export default App;
