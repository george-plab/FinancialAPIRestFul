import { Calendar, Bell, Settings } from 'lucide-react';
import './Header.css';

export default function Header({ title, subtitle }) {
    const today = new Date().toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    // Capitalize first letter
    const formattedDate = today.charAt(0).toUpperCase() + today.slice(1);

    return (
        <header className="header">
            <div className="header-left">
                <h1 className="header-title">{title}</h1>
                {subtitle && <p className="header-subtitle">{subtitle}</p>}
            </div>

            <div className="header-right">
                <div className="header-date">
                    <Calendar size={16} />
                    <span>{formattedDate}</span>
                </div>

                <button className="header-btn">
                    <Bell size={20} />
                    <span className="notification-dot"></span>
                </button>

                <button className="header-btn">
                    <Settings size={20} />
                </button>
            </div>
        </header>
    );
}
