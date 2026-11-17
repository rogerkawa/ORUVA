import { useEffect, useRef, useState } from 'react';

import {
    LayoutDashboard,
    Inbox,
    ClipboardList,
    Users,
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
    { label: 'Visão geral', icon: LayoutDashboard, path: 'dashboard' },
    { label: 'Solicitações', icon: Inbox, path: 'solicitacoes' },
    { label: 'Processos', icon: ClipboardList, path: 'processos' },
    { label: 'Equipe', icon: Users, path: 'equipe' }
];

function Sidebar({ onLogout }: SidebarProps) {
    const [expanded, setExpanded] = useState(true);
    const [activePage, setActivePage] = useState('dashboard');
    const [rotationKey, setRotationKey] = useState(0);

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [appearanceOpen, setAppearanceOpen] = useState(false);

    const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('oruva-theme');

    return savedTheme === 'dark' ? 'dark' : 'light';
});

    const mobileMenuRef = useRef<HTMLDivElement>(null);

    function toggleSidebar() {
        setExpanded((previous) => !previous);
        setRotationKey((previous) => previous + 1);
    }

    function navigate(path: string) {
        setActivePage(path);
        setMobileMenuOpen(false);
        setAppearanceOpen(false);
    }

    function changeTheme(newTheme: Theme) {
        setTheme(newTheme);
    }

    function toggleMobileMenu() {
        setMobileMenuOpen((previous) => !previous);
        setAppearanceOpen(false);
    }

    useEffect(() => {
        document.documentElement.dataset.theme = theme;
        localStorage.setItem('oruva-theme', theme);
    }, [theme]);

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

    return (
        <>
            {/* SIDEBAR DESKTOP */}

            <aside
                className={`sidebar ${
                    expanded ? 'sidebar-expanded' : 'sidebar-collapsed'
                }`}
            >
                <div className="sidebar-header">
                    <button
                        className="sidebar-brand"
                        onClick={toggleSidebar}
                        aria-label={expanded ? 'Recolher menu' : 'Expandir menu'}
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

                        <span className="sidebar-brand-name">Oruva</span>
                    </button>

                    <button
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

                <div className="sidebar-content">
                    <span className="sidebar-section-label">
                        MENU PRINCIPAL
                    </span>

                    <nav className="sidebar-navigation">
                        {navigation.map((item) => {
                            const Icon = item.icon;
                            const active = activePage === item.path;

                            return (
                                <button
                                    key={item.path}
                                    className={`sidebar-link ${
                                        active ? 'active' : ''
                                    }`}
                                    onClick={() => navigate(item.path)}
                                    title={!expanded ? item.label : undefined}
                                >
                                    <Icon size={19} strokeWidth={1.8} />

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

                    <div className="sidebar-bottom-navigation">
                        <span className="sidebar-section-label">
                            PREFERÊNCIAS
                        </span>

                        <button
                            className={`sidebar-link ${
                                activePage === 'perfil' ? 'active' : ''
                            }`}
                            onClick={() => navigate('perfil')}
                            title={!expanded ? 'Meu perfil' : undefined}
                        >
                            <UserRound size={19} strokeWidth={1.8} />
                            <span className="sidebar-link-label">
                                Meu perfil
                            </span>
                        </button>

                        <button
                            className={`sidebar-link ${
                                activePage === 'configuracoes' ? 'active' : ''
                            }`}
                            onClick={() => navigate('configuracoes')}
                            title={!expanded ? 'Configurações' : undefined}
                        >
                            <Settings size={19} strokeWidth={1.8} />
                            <span className="sidebar-link-label">
                                Configurações
                            </span>
                        </button>
                    </div>
                </div>

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

            <div className="mobile-account-menu" ref={mobileMenuRef}>
                <button
                    className={`mobile-account-trigger ${
                        mobileMenuOpen ? 'is-open' : ''
                    }`}
                    onClick={toggleMobileMenu}
                    aria-label="Abrir menu da conta"
                    aria-expanded={mobileMenuOpen}
                    aria-haspopup="true"
                >
                    <img src="/logo-oruva.png" alt="" />
                    <ChevronDown size={15} />
                </button>

                {mobileMenuOpen && (
                    <div className="mobile-account-dropdown">
                        <div className="mobile-account-heading">
                            <span>CONTA E PREFERÊNCIAS</span>
                            <strong>Seu espaço no Oruva</strong>
                        </div>

                        <button
                            className="mobile-account-option"
                            onClick={() => navigate('perfil')}
                        >
                            <UserRound size={18} />
                            <span>Meu perfil</span>
                        </button>

                        <button
                            className="mobile-account-option"
                            onClick={() => navigate('configuracoes')}
                        >
                            <Settings size={18} />
                            <span>Configurações</span>
                        </button>

                        <div className="mobile-account-divider" />

                        <button
                            className={`mobile-account-option ${
                                appearanceOpen ? 'selected' : ''
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
                                className={`mobile-appearance-chevron ${
                                    appearanceOpen ? 'rotated' : ''
                                }`}
                            />
                        </button>

                        {appearanceOpen && (
                            <div className="mobile-theme-options">
                                <button
                                    className={`mobile-theme-option ${
                                        theme === 'light' ? 'active' : ''
                                    }`}
                                    onClick={() => changeTheme('light')}
                                >
                                    <Sun size={17} />
                                    <span>Claro</span>
                                    {theme === 'light' && (
                                        <span className="mobile-theme-check">✓</span>
                                    )}
                                </button>

                                <button
                                    className={`mobile-theme-option ${
                                        theme === 'dark' ? 'active' : ''
                                    }`}
                                    onClick={() => changeTheme('dark')}
                                >
                                    <Moon size={17} />
                                    <span>Escuro</span>
                                    {theme === 'dark' && (
                                        <span className="mobile-theme-check">✓</span>
                                    )}
                                </button>
                            </div>
                        )}

                        <div className="mobile-account-divider" />

                        <button
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

            <nav className="mobile-navigation">
                {navigation.map((item) => {
                    const Icon = item.icon;
                    const active = activePage === item.path;

                    return (
                        <button
                            key={item.path}
                            className={`mobile-navigation-item ${
                                active ? 'active' : ''
                            }`}
                            onClick={() => navigate(item.path)}
                            aria-label={item.label}
                        >
                            <Icon size={21} strokeWidth={1.8} />
                            <span>{item.label}</span>
                        </button>
                    );
                })}
            </nav>
        </>
    );
}

export default Sidebar;