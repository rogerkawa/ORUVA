
import { useState, type FormEvent } from 'react';
import { api, ApiError } from '../../services/api';

import './SolicitarAcesso.css';

interface SolicitarAcessoProps {
    onVoltarLogin: () => void;
}

interface SolicitacaoPayload {
    companyName: string;
    tradeName: string;
    document: string;
    contactName: string;
    email: string;
    phone: string;
    message: string;
}

// CNPJ: aceita letras e números nas 12 primeiras posições.

function formatarCNPJ(valor: string): string {
    const caracteres = valor
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '');

    const base = caracteres
        .slice(0, 12)
        .replace(/[^A-Z0-9]/g, '');

    const verificadores = caracteres
        .slice(12, 14)
        .replace(/\D/g, '');

    const cnpj = base + verificadores;

    let formatado = cnpj.slice(0, 2);

    if (cnpj.length > 2) {
        formatado += `.${cnpj.slice(2, 5)}`;
    }

    if (cnpj.length > 5) {
        formatado += `.${cnpj.slice(5, 8)}`;
    }

    if (cnpj.length > 8) {
        formatado += `/${cnpj.slice(8, 12)}`;
    }

    if (cnpj.length > 12) {
        formatado += `-${cnpj.slice(12, 14)}`;
    }

    return formatado;
}


// Telefone: suporta celular e telefone fixo.
function formatarTelefone(valor: string): string {
    const numeros = valor.replace(/\D/g, '').slice(0, 11);

    if (!numeros.length) return '';

    if (numeros.length <= 2) {
        return `(${numeros}`;
    }

    const ddd = numeros.slice(0, 2);
    const restante = numeros.slice(2);

    if (numeros.length <= 6) {
        return `(${ddd}) ${restante}`;
    }

    if (numeros.length <= 10) {
        return `(${ddd}) ${restante.slice(0, 4)}-${restante.slice(4)}`;
    }

    return `(${ddd}) ${restante.slice(0, 5)}-${restante.slice(5)}`;
}

export default function SolicitarAcesso({
    onVoltarLogin
}: SolicitarAcessoProps) {

    const [form, setForm] = useState<SolicitacaoPayload>({
        companyName: '',
        tradeName: '',
        document: '',
        contactName: '',
        email: '',
        phone: '',
        message: ''
    });

    const [carregando, setCarregando] = useState(false);
    const [enviado, setEnviado] = useState(false);
    const [erro, setErro] = useState('');

    function atualizarCampo(
        campo: keyof SolicitacaoPayload,
        valor: string
    ) {
        let valorFormatado = valor;

        if (campo === 'document') {
            valorFormatado = formatarCNPJ(valor);
        }

        if (campo === 'phone') {
            valorFormatado = formatarTelefone(valor);
        }

        setForm((anterior) => ({
            ...anterior,
            [campo]: valorFormatado
        }));
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        setErro('');
        setCarregando(true);

        try {
            await api.post('/company-requests', {
                companyName: form.companyName.trim(),
                tradeName: form.tradeName.trim(),
                document: form.document.trim(),
                contactName: form.contactName.trim(),
                email: form.email.trim().toLowerCase(),
                phone: form.phone.trim(),
                message: form.message.trim()
            });

            setEnviado(true);

        } catch (error) {
            if (error instanceof ApiError) {
                setErro(error.message);
            } else {
                setErro(
                    'Não foi possível enviar sua solicitação. Verifique sua conexão e tente novamente.'
                );
            }
        } finally {
            setCarregando(false);
        }
    }

    return (
        <main className="request-page">

            <header className="request-header">
                <button
                    className="request-brand"
                    type="button"
                    onClick={onVoltarLogin}
                    aria-label="Oruva — voltar ao login"
                >
                    <img src="/logo-oruva.png" alt="" />
                    <span>oruva</span>
                </button>

                <button
                    className="request-back"
                    type="button"
                    onClick={onVoltarLogin}
                >
                    Voltar ao login
                </button>
            </header>

            <section className="request-main">

                {!enviado ? (
                    <>
                        <div className="request-heading">
                            <span className="request-eyebrow">
                                ACESSO À PLATAFORMA
                            </span>

                            <h1>
                                Vamos começar
                                <br />
                                <span>uma nova parceria.</span>
                            </h1>

                            <p>
                                Conte um pouco sobre sua empresa.
                                Nossa equipe analisará sua solicitação
                                para liberar o acesso ao Oruva.
                            </p>
                        </div>

                        <form
                            className="request-form"
                            onSubmit={handleSubmit}
                        >

                            <div className="request-section-title">
                                <span>01</span>
                                <h2>Dados da empresa</h2>
                            </div>

                            <div className="request-field">
                                <label htmlFor="companyName">
                                    Razão social *
                                </label>

                                <input
                                    id="companyName"
                                    value={form.companyName}
                                    onChange={(e) =>
                                        atualizarCampo('companyName', e.target.value)
                                    }
                                    placeholder="Nome oficial da empresa"
                                    maxLength={150}
                                    required
                                    disabled={carregando}
                                />
                            </div>

                            <div className="request-fields-grid">

                                <div className="request-field">
                                    <label htmlFor="tradeName">
                                        Nome fantasia
                                    </label>

                                    <input
                                        id="tradeName"
                                        value={form.tradeName}
                                        onChange={(e) =>
                                            atualizarCampo('tradeName', e.target.value)
                                        }
                                        placeholder="Nome comercial"
                                        disabled={carregando}
                                    />
                                </div>

                                <div className="request-field">
                                    <label htmlFor="document">
                                        CNPJ / Documento
                                    </label>

                                    <input
                                        id="document"
                                        type="text"
                                        inputMode="text"
                                        autoCapitalize="characters"
                                        spellCheck={false}
                                        value={form.document}
                                        onChange={(e) =>
                                            atualizarCampo('document', e.target.value)
                                        }
                                        placeholder="00.000.000/0000-00"
                                        maxLength={18}
                                        disabled={carregando}
                                    />
                                </div>

                            </div>

                            <div className="request-section-title request-second-section">
                                <span>02</span>
                                <h2>Responsável pelo contato</h2>
                            </div>

                            <div className="request-field">
                                <label htmlFor="contactName">
                                    Nome completo *
                                </label>

                                <input
                                    id="contactName"
                                    value={form.contactName}
                                    onChange={(e) =>
                                        atualizarCampo('contactName', e.target.value)
                                    }
                                    placeholder="Nome de quem está solicitando"
                                    maxLength={150}
                                    required
                                    disabled={carregando}
                                />
                            </div>

                            <div className="request-fields-grid">

                                <div className="request-field">
                                    <label htmlFor="email">
                                        E-mail corporativo *
                                    </label>

                                    <input
                                        id="email"
                                        type="email"
                                        value={form.email}
                                        onChange={(e) =>
                                            atualizarCampo('email', e.target.value)
                                        }
                                        placeholder="nome@empresa.com"
                                        required
                                        disabled={carregando}
                                    />
                                </div>

                                <div className="request-field">
                                    <label htmlFor="phone">
                                        Telefone
                                    </label>

                                    <input
                                        id="phone"
                                        type="tel"
                                        inputMode="numeric"
                                        autoComplete="tel"
                                        value={form.phone}
                                        onChange={(e) =>
                                            atualizarCampo('phone', e.target.value)
                                        }
                                        placeholder="(00) 00000-0000"
                                        maxLength={15}
                                        disabled={carregando}
                                    />
                                </div>

                            </div>

                            <div className="request-field">
                                <label htmlFor="message">
                                    Como pretende utilizar o Oruva?
                                </label>

                                <textarea
                                    id="message"
                                    value={form.message}
                                    onChange={(e) =>
                                        atualizarCampo('message', e.target.value)
                                    }
                                    placeholder="Conte brevemente sobre sua empresa e suas necessidades..."
                                    rows={4}
                                    disabled={carregando}
                                />
                            </div>

                            {erro && (
                                <div className="request-error" role="alert">
                                    {erro}
                                </div>
                            )}

                            <button
                                type="submit"
                                className="request-submit"
                                disabled={carregando}
                            >
                                {carregando
                                    ? 'Enviando solicitação...'
                                    : 'Enviar solicitação'}

                                {!carregando && (
                                    <span aria-hidden="true">→</span>
                                )}

                                {carregando && (
                                    <span className="request-spinner" />
                                )}
                            </button>

                            <p className="request-disclaimer">
                                Ao enviar, você autoriza nossa equipe a
                                entrar em contato sobre sua solicitação.
                            </p>

                        </form>
                    </>
                ) : (
                    <div className="request-success">

                        <div className="request-success-icon">
                            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                <path
                                    d="m5 12 4.5 4.5L19 7"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </div>

                        <span className="request-eyebrow">
                            SOLICITAÇÃO RECEBIDA
                        </span>

                        <h1>
                            Tudo certo.
                            <br />
                            <span>Recebemos seus dados.</span>
                        </h1>

                        <p>
                            Sua solicitação foi enviada com sucesso.
                            Nossa equipe irá analisar as informações
                            e entrar em contato pelo e-mail informado.
                        </p>

                        <button
                            type="button"
                            className="request-submit"
                            onClick={onVoltarLogin}
                        >
                            Voltar ao login
                            <span aria-hidden="true">→</span>
                        </button>

                    </div>
                )}

            </section>

            <footer className="request-footer">
                <span>© {new Date().getFullYear()} Oruva</span>
                <span>Todos os direitos reservados.</span>
            </footer>

        </main>
    );
}
