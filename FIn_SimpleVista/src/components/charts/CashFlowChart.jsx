import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    ReferenceLine
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="chart-tooltip">
                <p className="tooltip-label">{label}</p>
                {payload.map((entry, index) => (
                    <p key={index} className="tooltip-value" style={{ color: entry.color }}>
                        {entry.name}: €{entry.value.toLocaleString('es-ES')}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

export default function CashFlowChart({ data, title = 'Flujo de Caja', period = 'Balance mensual' }) {
    if (!data || data.length === 0) {
        return (
            <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                <div className="card-header">
                    <h3 className="card-title">{title}</h3>
                    <span className="period-label">{period}</span>
                </div>
                <div className="chart-placeholder">
                    Carga un archivo CSV para ver los datos
                </div>
            </div>
        );
    }

    return (
        <div className="chart-card" style={{ gridColumn: 'span 2' }}>
            <div className="card-header">
                <h3 className="card-title">{title}</h3>
                <span className="period-label">{period}</span>
            </div>
            <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer>
                    <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2d2d2d" />
                        <XAxis
                            dataKey="period"
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
                        <Legend
                            wrapperStyle={{ paddingTop: '10px' }}
                            formatter={(value) => <span style={{ color: '#a1a1aa' }}>{value}</span>}
                        />
                        <ReferenceLine y={0} stroke="#71717a" />
                        <Bar dataKey="inflow" name="Entradas" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="outflow" name="Salidas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
