import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
    Legend
} from 'recharts';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        return (
            <div className="chart-tooltip">
                <p className="tooltip-label">{payload[0].name}</p>
                <p className="tooltip-value">
                    €{payload[0].value.toLocaleString('es-ES')}
                </p>
            </div>
        );
    }
    return null;
};

const CustomLegend = ({ payload }) => {
    return (
        <ul className="custom-legend">
            {payload.map((entry, index) => (
                <li key={index} className="legend-item">
                    <span
                        className="legend-color"
                        style={{ backgroundColor: entry.color }}
                    />
                    <span className="legend-label">{entry.value}</span>
                </li>
            ))}
        </ul>
    );
};

export default function ExpenseBreakdownChart({ data, period = 'Mes actual' }) {
    if (!data || data.length === 0) {
        return (
            <div className="chart-card">
                <div className="card-header">
                    <h3 className="card-title">Desglose de Gastos</h3>
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
                <h3 className="card-title">Desglose de Gastos</h3>
                <span className="period-label">{period}</span>
            </div>
            <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer>
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={2}
                            dataKey="value"
                            nameKey="category"
                        >
                            {data.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={COLORS[index % COLORS.length]}
                                    stroke="transparent"
                                />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend content={<CustomLegend />} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
