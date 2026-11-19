
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import {
    LayoutDashboard,
    Inbox,
    ClipboardList,
    Building2,
    Tag,
    Settings,
    UserRound,
    ChevronLeft,
    LogOut,
    Sun,
    Moon,
    Palette,
    ChevronDown
} from 'lucide-react';

import './Sidebar.css';

interface SidebarProps {
    onLogout: () => void;
}

type Theme = 'light' | 'dark';

const navigation = [
    {
        label: 'Visão geral',
        icon: LayoutDashboard,
        path: '/app'
    },
    {
        label: 'Solicitações',
        icon: Inbox,
        path: '/app/solicitacoes'
    },
    {
        label: 'Categorias',
        icon: Tag,
        path: '/app/categorias'
    },
    {
        label: 'Processos',
        icon: ClipboardList,
        path: '/app/processos'
    },
    {
        label: 'Estrutura',
        icon: Building2,
        path: '/app/estrutura'
    }
];

function Sidebar({ onLogout }: SidebarProps) {
    const navigate = useNavigate();
    const location = useLocation();

    const [expanded, setExpanded] = useState(true);
    const [rotationKey, setRotationKey] = useState(0);

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [appearanceOpen, setAppearanceOpen] = useState(false);

    const [theme, setTheme] = useState<Theme>(() => {
        const savedTheme = localStorage.getItem('oruva-theme');

        return savedTheme === 'dark' ? 'dark' : 'light';
    });

    const mobileMenuRef = useRef<HTMLDivElement>(null);

    // Verifica se uma rota está ativa.
    function isActive(path: string) {
        if (path === '/app') {
            return location.pathname === '/app' ||
                location.pathname === '/app/';
        }

        return location.pathname === path ||
            location.pathname.startsWith(`${path}/`);
    }

    // Alterna o estado da sidebar.
    function toggleSidebar() {
        setExpanded((previous) => !previous);
        setRotationKey((previous) => previous + 1);
    }

    // Navegação principal.
    function handleNavigate(path: string) {
        navigate(path);

        setMobileMenuOpen(false);
        setAppearanceOpen(false);
    }

    // Navegação para perfil e configurações.
    function handleAccountNavigate(path: string) {
        handleNavigate(path);
    }

    // Alterna o menu mobile.
    function toggleMobileMenu() {
        setMobileMenuOpen((previous) => !previous);
        setAppearanceOpen(false);
    }

    // Altera o tema.
    function changeTheme(newTheme: Theme) {
        setTheme(newTheme);
    }

    // Aplica e salva o tema.
    useEffect(() => {
        document.documentElement.dataset.theme = theme;
        localStorage.setItem('oruva-theme', theme);
    }, [theme]);

    // Fecha menus ao clicar fora ou pressionar Escape.
    useEffect(() => {
        function handleOutsideClick(event: MouseEvent) {
            if (
                mobileMenuRef.current &&
                !mobileMenuRef.current.contains(event.target as Node)
            ) {
                setMobileMenuOpen(false);
                setAppearanceOpen(false);
            }
        }

        function handleEscape(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setMobileMenuOpen(false);
                setAppearanceOpen(false);
            }
        }

        document.addEventListener('mousedown', handleOutsideClick);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleOutsideClick);
            document.removeEventListener('keydown', handleEscape);
        };
    }, []);

    // Fecha o menu mobile ao mudar de rota.
    useEffect(() => {
        setMobileMenuOpen(false);
        setAppearanceOpen(false);
    }, [location.pathname]);

    return (
        <>
            {/* SIDEBAR DESKTOP */}
            <aside
                className={`sidebar ${expanded ? 'sidebar-expanded' : 'sidebar-collapsed'
                    }`}
            >
                {/* CABEÇALHO */}
                <div className="sidebar-header">
                    <button
                        type="button"
                        className="sidebar-brand"
                        onClick={toggleSidebar}
                        aria-label={
                            expanded ? 'Recolher menu' : 'Expandir menu'
                        }
                        title="Alternar menu"
                    >
                        <span className="sidebar-logo-wrapper">
                            <img
                                key={rotationKey}
                                src="/logo-oruva.png"
                                alt="Oruva"
                                className="sidebar-logo"
                            />
                        </span>

                        <span className="sidebar-brand-name">
                            Oruva
                        </span>
                    </button>

                    <button
                        type="button"
                        className="sidebar-toggle"
                        onClick={toggleSidebar}
                        aria-label="Alternar menu"
                    >
                        <ChevronLeft
                            size={17}
                            className="sidebar-toggle-icon"
                        />
                    </button>
                </div>

                {/* CONTEÚDO */}
                <div className="sidebar-content">
                    <span className="sidebar-section-label">
                        MENU PRINCIPAL
                    </span>

                    <nav className="sidebar-navigation">
                        {navigation.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.path);

                            return (
                                <button
                                    key={item.path}
                                    type="button"
                                    className={`sidebar-link ${active ? 'active' : ''
                                        }`}
                                    onClick={() => handleNavigate(item.path)}
                                    title={!expanded ? item.label : undefined}
                                    aria-current={active ? 'page' : undefined}
                                >
                                    <Icon
                                        size={19}
                                        strokeWidth={1.8}
                                    />

                                    <span className="sidebar-link-label">
                                        {item.label}
                                    </span>

                                    {active && (
                                        <span className="sidebar-active-indicator" />
                                    )}
                                </button>
                            );
                        })}
                    </nav>

                    {/* PREFERÊNCIAS */}
                    <div className="sidebar-bottom-navigation">
                        <span className="sidebar-section-label">
                            PREFERÊNCIAS
                        </span>

                        <button
                            type="button"
                            className={`sidebar-link ${isActive('/app/perfil') ? 'active' : ''
                                }`}
                            onClick={() =>
                                handleAccountNavigate('/app/perfil')
                            }
                            title={!expanded ? 'Meu perfil' : undefined}
                        >
                            <UserRound size={19} strokeWidth={1.8} />

                            <span className="sidebar-link-label">
                                Meu perfil
                            </span>
                        </button>

                        <button
                            type="button"
                            className={`sidebar-link ${isActive('/app/configuracoes') ? 'active' : ''
                                }`}
                            onClick={() =>
                                handleAccountNavigate('/app/configuracoes')
                            }
                            title={!expanded ? 'Configurações' : undefined}
                        >
                            <Settings size={19} strokeWidth={1.8} />

                            <span className="sidebar-link-label">
                                Configurações
                            </span>
                        </button>
                    </div>
                </div>

                {/* RODAPÉ */}
                <div className="sidebar-footer">
                    <div className="sidebar-user">
                        <div className="sidebar-avatar">
                            <UserRound size={18} />
                        </div>

                        <div className="sidebar-user-info">
                            <strong>Minha conta</strong>
                            <span>Área da empresa</span>
                        </div>
                    </div>

                    <button
                        type="button"
                        className="sidebar-logout"
                        onClick={onLogout}
                        title={!expanded ? 'Sair da plataforma' : undefined}
                    >
                        <LogOut size={18} />

                        <span className="sidebar-link-label">
                            Sair da plataforma
                        </span>
                    </button>
                </div>
            </aside>

            {/* MENU DE CONTA MOBILE */}
            <div
                className="mobile-account-menu"
                ref={mobileMenuRef}
            >
                <button
                    type="button"
                    className={`mobile-account-trigger ${mobileMenuOpen ? 'is-open' : ''
                        }`}
                    onClick={toggleMobileMenu}
                    aria-label="Abrir menu da conta"
                    aria-expanded={mobileMenuOpen}
                    aria-haspopup="true"
                >
                    <img src="/logo-oruva.png" alt="Oruva" />

                    <ChevronDown size={15} />
                </button>

                {mobileMenuOpen && (
                    <div className="mobile-account-dropdown">
                        <div className="mobile-account-heading">
                            <span>CONTA E PREFERÊNCIAS</span>
                            <strong>Seu espaço no Oruva</strong>
                        </div>

                        <button
                            type="button"
                            className={`mobile-account-option ${isActive('/app/perfil') ? 'selected' : ''
                                }`}
                            onClick={() =>
                                handleAccountNavigate('/app/perfil')
                            }
                        >
                            <UserRound size={18} />
                            <span>Meu perfil</span>
                        </button>

                        <button
                            type="button"
                            className={`mobile-account-option ${isActive('/app/configuracoes') ? 'selected' : ''
                                }`}
                            onClick={() =>
                                handleAccountNavigate('/app/configuracoes')
                            }
                        >
                            <Settings size={18} />
                            <span>Configurações</span>
                        </button>

                        <div className="mobile-account-divider" />

                        {/* APARÊNCIA */}
                        <button
                            type="button"
                            className={`mobile-account-option ${appearanceOpen ? 'selected' : ''
                                }`}
                            onClick={() =>
                                setAppearanceOpen((previous) => !previous)
                            }
                            aria-expanded={appearanceOpen}
                        >
                            <Palette size={18} />

                            <span>Aparência</span>

                            <ChevronDown
                                size={15}
                                className={`mobile-appearance-chevron ${appearanceOpen ? 'rotated' : ''
                                    }`}
                            />
                        </button>

                        {appearanceOpen && (
                            <div className="mobile-theme-options">
                                <button
                                    type="button"
                                    className={`mobile-theme-option ${theme === 'light' ? 'active' : ''
                                        }`}
                                    onClick={() => changeTheme('light')}
                                >
                                    <Sun size={17} />
                                    <span>Claro</span>

                                    {theme === 'light' && (
                                        <span className="mobile-theme-check">
                                            ✓
                                        </span>
                                    )}
                                </button>

                                <button
                                    type="button"
                                    className={`mobile-theme-option ${theme === 'dark' ? 'active' : ''
                                        }`}
                                    onClick={() => changeTheme('dark')}
                                >
                                    <Moon size={17} />
                                    <span>Escuro</span>

                                    {theme === 'dark' && (
                                        <span className="mobile-theme-check">
                                            ✓
                                        </span>
                                    )}
                                </button>
                            </div>
                        )}

                        <div className="mobile-account-divider" />

                        {/* SAIR */}
                        <button
                            type="button"
                            className="mobile-account-option mobile-account-logout"
                            onClick={onLogout}
                        >
                            <LogOut size={18} />
                            <span>Sair da plataforma</span>
                        </button>
                    </div>
                )}
            </div>

            {/* NAVEGAÇÃO INFERIOR MOBILE */}
            <nav
                className="mobile-navigation"
                aria-label="Navegação principal"
            >
                {navigation.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);

                    return (
                        <button
                            key={item.path}
                            type="button"
                            className={`mobile-navigation-item ${active ? 'active' : ''
                                }`}
                            onClick={() => handleNavigate(item.path)}
                            aria-label={item.label}
                            aria-current={active ? 'page' : undefined}
                        >
                            <Icon
                                size={21}
                                strokeWidth={1.8}
                            />

                            <span>{item.label}</span>
                        </button>
                    );
                })}
            </nav>
        </>
    );
}

export default Sidebar;
