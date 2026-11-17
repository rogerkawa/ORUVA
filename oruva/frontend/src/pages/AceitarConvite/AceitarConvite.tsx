
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
    ArrowLeft,
    ArrowRight,
    Building2,
    Check,
    Eye,
    EyeOff,
    LockKeyhole,
    Mail,
    ShieldCheck
} from 'lucide-react';

import { api, ApiError } from '../../services/api';

import './AceitarConvite.css';

interface Convite {
    companyName: string;
    email: string;
    role: string;
    expiresAt: string;
}

interface ConviteResponse {
    convite: Convite;
}

interface AceitarConviteResponse {
    message: string;
}

export default function AceitarConvite() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const token = searchParams.get('token');

    const [convite, setConvite] = useState<Convite | null>(null);
    const [carregando, setCarregando] = useState(true);
    const [erroConvite, setErroConvite] = useState('');

    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [mostrarSenha, setMostrarSenha] = useState(false);
    const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false);

    const [erro, setErro] = useState('');
    const [carregandoEnvio, setCarregandoEnvio] = useState(false);
    const [sucesso, setSucesso] = useState(false);

    useEffect(() => {
        let ativo = true;

        async function consultarConvite() {
            if (!token) {
                setErroConvite('O link de convite não possui um token válido.');
                setCarregando(false);
                return;
            }

            try {
                const response = await api.get<ConviteResponse>(
                    `/invitations/${encodeURIComponent(token)}`
                );

                if (ativo) {
                    setConvite(response.convite);
                }
            } catch (error) {
                if (!ativo) return;

                setErroConvite(
                    error instanceof ApiError
                        ? error.message
                        : 'Não foi possível consultar o convite. Verifique sua conexão.'
                );
            } finally {
                if (ativo) {
                    setCarregando(false);
                }
            }
        }

        consultarConvite();

        return () => {
            ativo = false;
        };
    }, [token]);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setErro('');

        if (name.trim().length < 2) {
            setErro('Informe seu nome completo.');
            return;
        }

        if (password.length < 8) {
            setErro('Sua senha precisa ter pelo menos 8 caracteres.');
            return;
        }

        if (password !== confirmPassword) {
            setErro('As senhas não coincidem. Confira os campos.');
            return;
        }

        if (!token || !convite) return;

        setCarregandoEnvio(true);

        try {
            await api.post<AceitarConviteResponse>(
                '/invitations/accept',
                {
                    token,
                    name: name.trim(),
                    email: convite.email,
                    password
                }
            );

            setSucesso(true);
        } catch (error) {
            if (error instanceof ApiError) {
                const data = error.data as { code?: string } | null;

                if (data?.code === 'USUARIO_JA_EXISTE') {
                    setErro(
                        'Já existe uma conta com este e-mail. Entre na sua conta para aceitar o convite.'
                    );
                } else {
                    setErro(error.message);
                }
            } else {
                setErro(
                    'Não foi possível concluir seu cadastro. Tente novamente.'
                );
            }
        } finally {
            setCarregandoEnvio(false);
        }
    }

    function formatarData(data: string) {
        const dataFormatada = new Date(data);

        if (Number.isNaN(dataFormatada.getTime())) {
            return 'Consulte a validade do convite';
        }

        return dataFormatada.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    }

    return (
        <main className="invite-page">
            <div className="invite-background-glow" />

            <header className="invite-header">
                <Link to="/login" className="invite-brand">
                    <img src="/logo-oruva.png" alt="" />
                    <span>oruva</span>
                </Link>

                <span className="invite-header-label">
                    ACESSO À PLATAFORMA
                </span>
            </header>

            <section className="invite-content">
                <div className="invite-card">
                    {carregando ? (
                        <div className="invite-state">
                            <span className="invite-loader" />
                            <h1>Verificando seu convite</h1>
                            <p>
                                Estamos validando o link enviado para seu e-mail.
                            </p>
                        </div>
                    ) : erroConvite ? (
                        <div className="invite-state">
                            <div className="invite-state-icon invite-state-icon-error">
                                <LockKeyhole size={25} />
                            </div>

                            <span className="invite-eyebrow">
                                CONVITE INDISPONÍVEL
                            </span>

                            <h1>Não foi possível continuar.</h1>

                            <p>{erroConvite}</p>

                            <Link to="/login" className="invite-primary-button">
                                Voltar ao login
                                <ArrowRight size={17} />
                            </Link>
                        </div>
                    ) : sucesso ? (
                        <div className="invite-state invite-success">
                            <div className="invite-state-icon invite-state-icon-success">
                                <Check size={27} />
                            </div>

                            <span className="invite-eyebrow">
                                CONTA CRIADA
                            </span>

                            <h1>Bem-vindo ao Oruva.</h1>

                            <p>
                                Sua conta foi criada e seu acesso à empresa
                                <strong> {convite?.companyName}</strong> foi
                                ativado com sucesso.
                            </p>

                            <button
                                type="button"
                                className="invite-primary-button"
                                onClick={() => navigate('/login')}
                            >
                                Ir para o login
                                <ArrowRight size={17} />
                            </button>
                        </div>
                    ) : convite ? (
                        <>
                            <div className="invite-heading">
                                <span className="invite-eyebrow">
                                    VOCÊ FOI CONVIDADO
                                </span>

                                <h1>
                                    Seu espaço de trabalho
                                    <br />
                                    <span>começa aqui.</span>
                                </h1>

                                <p>
                                    Complete seu cadastro para acessar a
                                    plataforma e colaborar com sua equipe.
                                </p>
                            </div>

                            <div className="invite-company">
                                <div className="invite-company-icon">
                                    <Building2 size={21} />
                                </div>

                                <div className="invite-company-info">
                                    <span>VOCÊ FOI CONVIDADO PARA</span>
                                    <strong>{convite.companyName}</strong>
                                </div>

                                <ShieldCheck
                                    className="invite-company-check"
                                    size={20}
                                />
                            </div>

                            <div className="invite-email">
                                <Mail size={17} />
                                <div>
                                    <span>E-mail vinculado ao convite</span>
                                    <strong>{convite.email}</strong>
                                </div>
                            </div>

                            <form
                                className="invite-form"
                                onSubmit={handleSubmit}
                            >
                                <div className="invite-field">
                                    <label htmlFor="invite-name">
                                        Nome completo
                                    </label>

                                    <input
                                        id="invite-name"
                                        type="text"
                                        placeholder="Como podemos chamar você?"
                                        value={name}
                                        onChange={(event) =>
                                            setName(event.target.value)
                                        }
                                        autoComplete="name"
                                        maxLength={150}
                                        required
                                        disabled={carregandoEnvio}
                                    />
                                </div>

                                <div className="invite-field">
                                    <label htmlFor="invite-password">
                                        Crie uma senha
                                    </label>

                                    <div className="invite-password-wrapper">
                                        <input
                                            id="invite-password"
                                            type={mostrarSenha ? 'text' : 'password'}
                                            placeholder="Mínimo de 8 caracteres"
                                            value={password}
                                            onChange={(event) =>
                                                setPassword(event.target.value)
                                            }
                                            autoComplete="new-password"
                                            minLength={8}
                                            required
                                            disabled={carregandoEnvio}
                                        />

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setMostrarSenha(!mostrarSenha)
                                            }
                                            aria-label={
                                                mostrarSenha
                                                    ? 'Ocultar senha'
                                                    : 'Mostrar senha'
                                            }
                                        >
                                            {mostrarSenha
                                                ? <EyeOff size={18} />
                                                : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="invite-field">
                                    <label htmlFor="invite-confirm-password">
                                        Confirme sua senha
                                    </label>

                                    <div className="invite-password-wrapper">
                                        <input
                                            id="invite-confirm-password"
                                            type={mostrarConfirmacao ? 'text' : 'password'}
                                            placeholder="Digite sua senha novamente"
                                            value={confirmPassword}
                                            onChange={(event) =>
                                                setConfirmPassword(event.target.value)
                                            }
                                            autoComplete="new-password"
                                            required
                                            disabled={carregandoEnvio}
                                        />

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setMostrarConfirmacao(!mostrarConfirmacao)
                                            }
                                            aria-label={
                                                mostrarConfirmacao
                                                    ? 'Ocultar confirmação'
                                                    : 'Mostrar confirmação'
                                            }
                                        >
                                            {mostrarConfirmacao
                                                ? <EyeOff size={18} />
                                                : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                {erro && (
                                    <div className="invite-error" role="alert">
                                        {erro}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    className="invite-primary-button"
                                    disabled={carregandoEnvio}
                                >
                                    {carregandoEnvio
                                        ? 'Criando sua conta...'
                                        : 'Criar minha conta'}

                                    {!carregandoEnvio && <ArrowRight size={17} />}
                                    {carregandoEnvio && (
                                        <span className="invite-button-loader" />
                                    )}
                                </button>

                                <p className="invite-terms">
                                    Ao continuar, você confirma que este
                                    convite foi destinado a você.
                                </p>
                            </form>

                            <div className="invite-expiration">
                                <LockKeyhole size={14} />
                                Convite válido até {formatarData(convite.expiresAt)}
                            </div>
                        </>
                    ) : null}
                </div>

                <Link to="/login" className="invite-back-link">
                    <ArrowLeft size={15} />
                    Já possui uma conta? Acesse o login
                </Link>
            </section>

            <footer className="invite-footer">
                <span>© {new Date().getFullYear()} Oruva</span>
                <span>GESTÃO INTELIGENTE DE PROCESSOS</span>
            </footer>
        </main>
    );
}
