
import { useState, type FormEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ApiError } from '../../services/api';

import './Login.css';

interface LoginProps {
    onSolicitarAcesso: () => void;
}

function EyeIcon({ visible }: { visible: boolean }) {
    return visible ? (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                d="M3 3L21 21M10.6 10.6a2 2 0 002.8 2.8"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
            />
            <path
                d="M9.9 5.2A10.8 10.8 0 0112 5c5.2 0 8.5 5.5 8.5 7s-1.1 3.1-3 4.8M6.2 6.2C3.9 7.7 2.5 10.4 2.5 12c0 1.5 3.3 7 9.5 7 1 0 2-.2 2.9-.5"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
            />
        </svg>
    ) : (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                d="M2.5 12S5.8 5 12 5s9.5 7 9.5 7-3.3 7-9.5 7-9.5-7-9.5-7Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
            />
            <circle
                cx="12"
                cy="12"
                r="3"
                stroke="currentColor"
                strokeWidth="1.7"
            />
        </svg>
    );
}

function ArrowIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                d="M5 12h14m-6-6 6 6-6 6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

export default function Login({ onSolicitarAcesso }: LoginProps) {
    const { login } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const [mostrarSenha, setMostrarSenha] = useState(false);
    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState('');

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        setErro('');
        setCarregando(true);

        try {
            await login({
                email: email.trim(),
                password
            });
        } catch (error) {
            if (error instanceof ApiError) {
                const data = error.data as { code?: string } | null;

                if (data?.code === 'MFA_REQUIRED') {
                    setErro(
                        'Sua conta exige autenticação de dois fatores. O acesso MFA ainda precisa ser integrado à tela de login.'
                    );
                } else {
                    setErro(error.message);
                }
            } else {
                setErro(
                    'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.'
                );
            }
        } finally {
            setCarregando(false);
        }
    }

    return (
        <main className="login-page">

            {/* Painel institucional */}
            <section className="login-showcase">

                <div className="showcase-top">

                    <div className="brand">
                        <div className="brand-logo">
                            <img
                                src="/logo-oruva.png"
                                alt="Logo Oruva"
                                onError={(event) => {
                                    event.currentTarget.style.display = 'none';
                                }}
                            />
                        </div>

                        <span className="brand-name">oruva</span>
                    </div>

                    <span className="showcase-label">
                        GESTÃO INTELIGENTE
                    </span>

                </div>

                <div className="showcase-content">

                    <div className="showcase-eyebrow">
                        <span className="eyebrow-line" />
                        ORGANIZE. CONECTE. EVOLUA.
                    </div>

                    <h1>
                        Processos claros.
                        <br />
                        <span>Resultados melhores.</span>
                    </h1>

                    <p>
                        Um novo jeito de organizar demandas,
                        conectar equipes e acompanhar cada etapa
                        do trabalho.
                    </p>

                </div>

                <div className="showcase-bottom">
                    <span>ORUVA · PLATAFORMA DE PROCESSOS</span>
                </div>

            </section>

            {/* Área de autenticação */}
            <section className="login-content">

                <div className="login-content-inner">

                    <div className="login-mobile-brand">
                        <div className="brand-logo">
                            <img
                                src="/logo-oruva.png"
                                alt="Logo Oruva"
                                onError={(event) => {
                                    event.currentTarget.style.display = 'none';
                                }}
                            />
                        </div>

                        <span className="brand-name">oruva</span>
                    </div>

                    <div className="login-heading">
                        <span className="login-overline">
                            ACESSO À PLATAFORMA
                        </span>

                        <h2>Bem-vindo de volta.</h2>

                        <p>
                            Entre com suas credenciais para continuar
                            de onde parou.
                        </p>
                    </div>

                    <form
                        className="login-form"
                        onSubmit={handleSubmit}
                    >

                        <div className="form-group">
                            <label htmlFor="email">
                                E-mail
                            </label>

                            <input
                                id="email"
                                type="email"
                                placeholder="seu@email.com"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                autoComplete="email"
                                required
                                disabled={carregando}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="password">
                                Senha
                            </label>

                            <div className="password-input-wrapper">
                                <input
                                    id="password"
                                    type={mostrarSenha ? 'text' : 'password'}
                                    placeholder="Digite sua senha"
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    autoComplete="current-password"
                                    required
                                    disabled={carregando}
                                />

                                <button
                                    type="button"
                                    className="toggle-password"
                                    onClick={() => setMostrarSenha(!mostrarSenha)}
                                    aria-label={
                                        mostrarSenha
                                            ? 'Ocultar senha'
                                            : 'Mostrar senha'
                                    }
                                >
                                    <EyeIcon visible={mostrarSenha} />
                                </button>
                            </div>
                        </div>

                        {erro && (
                            <div className="login-error" role="alert">
                                <span className="error-indicator" />
                                {erro}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="login-submit"
                            disabled={carregando}
                        >
                            <span>
                                {carregando
                                    ? 'Entrando...'
                                    : 'Entrar na plataforma'}
                            </span>

                            {!carregando && <ArrowIcon />}

                            {carregando && (
                                <span className="login-spinner" />
                            )}
                        </button>

                    </form>

                    {/* Solicitação de acesso */}
                    <div className="login-access-request">
                        <span>Ainda não possui acesso?</span>

                        <button
                            type="button"
                            onClick={onSolicitarAcesso}
                        >
                            Solicitar acesso à plataforma
                            <ArrowIcon />
                        </button>
                    </div>

                    <div className="login-security">
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path
                                d="M12 3 19 6v5c0 4.5-2.9 8.1-7 10-4.1-1.9-7-5.5-7-10V6l7-3Z"
                                stroke="currentColor"
                                strokeWidth="1.6"
                                strokeLinejoin="round"
                            />
                            <path
                                d="m9 12 2 2 4-4"
                                stroke="currentColor"
                                strokeWidth="1.6"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>

                        <span>
                            Sua conexão é protegida e criptografada.
                        </span>
                    </div>

                </div>

                <footer className="login-footer">
                    <span>© {new Date().getFullYear()} Oruva</span>
                    <span>Todos os direitos reservados.</span>
                </footer>

            </section>

        </main>
    );
}
