import { useAuth } from '../../contexts/AuthContext';

import Sidebar from '../../components/Sidebar/Sidebar';

import './CompanyLayout.css';

interface CompanyLayoutProps {
    children: React.ReactNode;
}

function CompanyLayout({ children }: CompanyLayoutProps) {
    const { logout } = useAuth();

    return (
        <div className="company-layout">
            <Sidebar onLogout={logout} />

            <main className="company-main">
                {children}
            </main>
        </div>
    );
}

export default CompanyLayout;