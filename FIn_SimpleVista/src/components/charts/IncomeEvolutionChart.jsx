import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Area,
    AreaChart
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="chart-tooltip">
                <p className="tooltip-label">{label}</p>
                <p className="tooltip-value">
                    €{payload[0].value.toLocaleString('es-ES')}
                </p>
            </div>
        );
    }
    return null;
};

export default function IncomeEvolutionChart({ data, period = 'Últimos 6 meses' }) {
    if (!data || data.length === 0) {
        return (
            <div className="chart-card">
                <div className="card-header">
                    <h3 className="card-title">Evolución de Ingresos</h3>
                    <span className="period-label">{period}</span>
                </div>
                <div className="chart-placeholder">
                    Carga un archivo CSV para ver los datos
                </div>
            </div>
        );
    }

    return (
        <div className="chart-card">
            <div className="card-header">
                <h3 className="card-title">Evolución de Ingresos</h3>
                <span className="period-label">{period}</span>
            </div>
            <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer>
                    <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2d2d2d" />
                        <XAxis
                            dataKey="month"
                            stroke="#71717a"
                            tick={{ fill: '#a1a1aa', fontSize: 12 }}
                            axisLine={{ stroke: '#2d2d2d' }}
                        />
                        <YAxis
                            stroke="#71717a"
                            tick={{ fill: '#a1a1aa', fontSize: 12 }}
                            axisLine={{ stroke: '#2d2d2d' }}
                            tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                            type="monotone"
                            dataKey="income"
                            stroke="#10b981"
                            strokeWidth={2}
                            fill="url(#incomeGradient)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
