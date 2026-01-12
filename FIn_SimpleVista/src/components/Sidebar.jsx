import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    FileText,
    BarChart3,
    Upload,
    User,
    ChevronRight
} from 'lucide-react';
import './Sidebar.css';

const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Informes', href: '/reports', icon: FileText },
    { name: 'Análisis', href: '/analysis', icon: BarChart3 },
    { name: 'Cargar Datos', href: '/upload', icon: Upload },
];

export default function Sidebar() {
    const location = useLocation();

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <div className="logo">
                    <div className="logo-icon">
                        <BarChart3 size={24} />
                    </div>
                    <span className="logo-text">FinanceAI</span>
                </div>
            </div>

            <nav className="sidebar-nav">
                {navigation.map((item) => {
                    const isActive = location.pathname === item.href;
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.name}
                            to={item.href}
                            className={`nav-item ${isActive ? 'active' : ''}`}
                        >
                            <Icon size={20} />
                            <span>{item.name}</span>
                            {isActive && <ChevronRight size={16} className="nav-arrow" />}
                        </Link>
                    );
                })}
            </nav>

            <div className="sidebar-footer">
                <div className="user-info">
                    <div className="user-avatar">
                        <User size={20} />
                    </div>
                    <div className="user-details">
                        <span className="user-name">Usuario</span>
                        <span className="user-role">Administrador</span>
                    </div>
                </div>
            </div>
        </aside>
    );
}
