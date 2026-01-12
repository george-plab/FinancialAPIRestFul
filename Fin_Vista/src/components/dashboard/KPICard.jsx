import './KPICard.css';

const KPICard = ({
    title,
    value,
    change,
    changeType = 'neutral', // 'positive', 'negative', 'neutral'
    icon,
    prefix = '',
    suffix = ''
}) => {
    const formatValue = (val) => {
        if (typeof val === 'number') {
            return val.toLocaleString('es-ES');
        }
        return val || '--';
    };

    const getChangeIcon = () => {
        if (changeType === 'positive') {
            return (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="23,6 13.5,15.5 8.5,10.5 1,18" />
                    <polyline points="17,6 23,6 23,12" />
                </svg>
            );
        } else if (changeType === 'negative') {
            return (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="23,18 13.5,8.5 8.5,13.5 1,6" />
                    <polyline points="17,18 23,18 23,12" />
                </svg>
            );
        }
        return null;
    };

    return (
        <div className={`kpi-card ${changeType}`}>
            <div className="kpi-header">
                <span className="kpi-title">{title}</span>
                {icon && <span className="kpi-icon">{icon}</span>}
            </div>

            <div className="kpi-value">
                {prefix && <span className="kpi-prefix">{prefix}</span>}
                <span className="kpi-number">{formatValue(value)}</span>
                {suffix && <span className="kpi-suffix">{suffix}</span>}
            </div>

            {change !== undefined && (
                <div className={`kpi-change ${changeType}`}>
                    <span className="change-icon">{getChangeIcon()}</span>
                    <span className="change-value">
                        {changeType === 'positive' && '+'}
                        {change}%
                    </span>
                    <span className="change-label">vs mes anterior</span>
                </div>
            )}
        </div>
    );
};

export default KPICard;
