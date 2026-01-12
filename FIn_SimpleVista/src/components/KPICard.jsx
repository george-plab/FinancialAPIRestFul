import { TrendingUp, TrendingDown } from 'lucide-react';

/**
 * KPI Card Component
 * Displays a key performance indicator with value, change, and status
 * 
 * Status types:
 * - calculated: ✅ Value calculated directly from data
 * - estimated: 🟡 Value estimated/approximated
 * - pending: ⏳ Awaiting data
 * - unavailable: ❌ Cannot be calculated with current data
 */
export default function KPICard({
    title,
    value,
    icon: Icon,
    iconColor = 'green',
    change,
    changeLabel = 'vs mes anterior',
    status = 'calculated',
    formatValue = (v) => v
}) {
    const statusLabels = {
        calculated: '✅ Calculado',
        estimated: '🟡 Estimado',
        pending: '⏳ Pendiente',
        unavailable: '❌ No disponible'
    };

    const isPositiveChange = change > 0;
    const isNegativeChange = change < 0;

    return (
        <div className="kpi-card">
            <div className="kpi-card-header">
                <div className={`icon ${iconColor}`}>
                    <Icon size={20} />
                </div>
                {status !== 'calculated' && (
                    <span className={`status-badge ${status}`}>
                        {statusLabels[status]}
                    </span>
                )}
            </div>

            <div className="kpi-label">{title}</div>

            <div className="kpi-value">
                {value !== null && value !== undefined ? formatValue(value) : '€ --'}
            </div>

            {change !== undefined && change !== null && (
                <div className={`kpi-change ${isPositiveChange ? 'positive' : ''} ${isNegativeChange ? 'negative' : ''}`}>
                    {isPositiveChange ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    <span>{isPositiveChange ? '+' : ''}{change.toFixed(1)}%</span>
                    <span className="change-label">{changeLabel}</span>
                </div>
            )}
        </div>
    );
}
