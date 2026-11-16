
import { useState } from 'react';

import {
    LayoutDashboard,
    Inbox,
    ClipboardList,
    Users,
    Settings,
    UserRound,
    ChevronLeft,
    LogOut
} from 'lucide-react';

import './Sidebar.css';

interface SidebarProps {
    onLogout: () => void;
}

const navigation = [
    {
        label: 'Visão geral',
        icon: LayoutDashboard,
        path: 'dashboard'
    },
    {
        label: 'Solicitações',
        icon: Inbox,
        path: 'solicitacoes'
    },
    {
        label: 'Processos',
        icon: ClipboardList,
        path: 'processos'
    },
    {
        label: 'Equipe',
        icon: Users,
        path: 'equipe'
    }
];

function Sidebar({ onLogout }: SidebarProps) {
    const [expanded, setExpanded] = useState(true);
    const [activePage, setActivePage] = useState('dashboard');
    const [rotationKey, setRotationKey] = useState(0);

    function toggleSidebar() {
        setExpanded((previous) => !previous);
        setRotationKey((previous) => previous + 1);
    }

    function navigate(path: string) {
        setActivePage(path);
    }

    return (
        <>
            {/* Sidebar desktop */}
            <aside
                className={`sidebar ${expanded ? 'sidebar-expanded' : 'sidebar-collapsed'}`}
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

                        <span className="sidebar-brand-name">
                            Oruva
                        </span>
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
                                    className={`sidebar-link ${active ? 'active' : ''}`}
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
                            className={`sidebar-link ${activePage === 'perfil' ? 'active' : ''}`}
                            onClick={() => navigate('perfil')}
                            title={!expanded ? 'Meu perfil' : undefined}
                        >
                            <UserRound size={19} strokeWidth={1.8} />
                            <span className="sidebar-link-label">
                                Meu perfil
                            </span>
                        </button>

                        <button
                            className={`sidebar-link ${activePage === 'configuracoes' ? 'active' : ''}`}
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

            {/* Navegação mobile e tablet */}
            <nav className="mobile-navigation">

                {navigation.slice(0, 4).map((item) => {
                    const Icon = item.icon;
                    const active = activePage === item.path;

                    return (
                        <button
                            key={item.path}
                            className={`mobile-navigation-item ${active ? 'active' : ''}`}
                            onClick={() => navigate(item.path)}
                            aria-label={item.label}
                        >
                            <Icon size={21} strokeWidth={1.8} />
                            <span>{item.label}</span>
                        </button>
                    );
                })}

                <button
                    className={`mobile-navigation-item ${activePage === 'perfil' ? 'active' : ''}`}
                    onClick={() => navigate('perfil')}
                    aria-label="Meu perfil"
                >
                    <UserRound size={21} strokeWidth={1.8} />
                    <span>Perfil</span>
                </button>

            </nav>
        </>
    );
}

export default Sidebar;
