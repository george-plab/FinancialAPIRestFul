import { useEffect, useRef } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import './ChartSection.css';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

// eToro-inspired chart configurations
const chartColors = {
    primary: '#00c853',
    primaryLight: 'rgba(0, 200, 83, 0.2)',
    secondary: '#667eea',
    secondaryLight: 'rgba(102, 126, 234, 0.2)',
    danger: '#ff5252',
    dangerLight: 'rgba(255, 82, 82, 0.2)',
    warning: '#ffc107',
    text: '#8b949e',
    grid: 'rgba(48, 54, 61, 0.5)'
};

const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            display: false
        },
        tooltip: {
            backgroundColor: '#21262d',
            titleColor: '#f0f6fc',
            bodyColor: '#8b949e',
            borderColor: '#30363d',
            borderWidth: 1,
            padding: 12,
            cornerRadius: 8,
            displayColors: false
        }
    },
    scales: {
        x: {
            grid: {
                display: false
            },
            ticks: {
                color: chartColors.text,
                font: {
                    size: 11
                }
            }
        },
        y: {
            grid: {
                color: chartColors.grid
            },
            ticks: {
                color: chartColors.text,
                font: {
                    size: 11
                }
            }
        }
    }
};

// Revenue Line Chart Component
export const RevenueChart = ({ data }) => {
    const labels = data?.labels || ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];
    const values = data?.values || [];

    const chartData = {
        labels,
        datasets: [
            {
                label: 'Ingresos',
                data: values,
                borderColor: chartColors.primary,
                backgroundColor: chartColors.primaryLight,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: chartColors.primary,
                pointBorderColor: '#0d1117',
                pointBorderWidth: 2,
                pointHoverRadius: 6
            }
        ]
    };

    const options = {
        ...defaultOptions,
        plugins: {
            ...defaultOptions.plugins,
            tooltip: {
                ...defaultOptions.plugins.tooltip,
                callbacks: {
                    label: (context) => `€${context.parsed.y?.toLocaleString('es-ES') || 0}`
                }
            }
        },
        scales: {
            ...defaultOptions.scales,
            y: {
                ...defaultOptions.scales.y,
                beginAtZero: true,  // Force scale to start at 0
                min: 0,  // Explicit minimum at 0
                // Calculate max from valid positive numbers only
                max: (() => {
                    const validValues = values.filter(v => typeof v === 'number' && v > 0 && isFinite(v));
                    if (validValues.length === 0) return 100;
                    const maxValue = Math.max(...validValues);
                    return Math.ceil(maxValue * 1.2);  // Add 20% padding
                })(),
                ticks: {
                    ...defaultOptions.scales.y.ticks,
                    callback: (value) => `€${(value / 1000).toFixed(0)}K`
                }
            }
        }
    };

    return (
        <div className="chart-container">
            <div className="chart-header">
                <h3 className="chart-title">Evolución de Ingresos</h3>
                <span className="chart-period">Últimos 6 meses</span>
            </div>
            <div className="chart-wrapper">
                {values.length > 0 ? (
                    <Line data={chartData} options={options} />
                ) : (
                    <div className="chart-empty">
                        <p>Carga un archivo CSV para ver los datos</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// Expenses Bar Chart Component
export const ExpensesChart = ({ data }) => {
    const labels = data?.labels || ['Nóminas', 'Marketing', 'Operaciones', 'IT', 'Otros'];
    const values = data?.values || [];

    const chartData = {
        labels,
        datasets: [
            {
                label: 'Gastos',
                data: values,
                backgroundColor: [
                    chartColors.secondary,
                    chartColors.primary,
                    chartColors.warning,
                    chartColors.danger,
                    '#9c27b0'
                ],
                borderRadius: 8,
                barThickness: 40
            }
        ]
    };

    const options = {
        ...defaultOptions,
        indexAxis: 'y',
        plugins: {
            ...defaultOptions.plugins,
            tooltip: {
                ...defaultOptions.plugins.tooltip,
                callbacks: {
                    label: (context) => `€${context.parsed.x?.toLocaleString('es-ES') || 0}`
                }
            }
        },
        scales: {
            x: {
                grid: {
                    color: chartColors.grid
                },
                ticks: {
                    color: chartColors.text,
                    callback: (value) => `€${(value / 1000).toFixed(0)}K`
                }
            },
            y: {
                grid: {
                    display: false
                },
                ticks: {
                    color: chartColors.text
                }
            }
        }
    };

    return (
        <div className="chart-container">
            <div className="chart-header">
                <h3 className="chart-title">Desglose de Gastos</h3>
                <span className="chart-period">Mes actual</span>
            </div>
            <div className="chart-wrapper">
                {values.length > 0 ? (
                    <Bar data={chartData} options={options} />
                ) : (
                    <div className="chart-empty">
                        <p>Carga un archivo CSV para ver los datos</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// Cash Flow Doughnut Chart Component
export const CashFlowChart = ({ data }) => {
    const values = data?.values || [];
    const labels = data?.labels || ['Ingresos', 'Gastos'];

    const chartData = {
        labels,
        datasets: [
            {
                data: values,
                backgroundColor: [chartColors.primary, chartColors.danger],
                borderColor: '#1c2128',
                borderWidth: 4,
                hoverOffset: 8
            }
        ]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    color: chartColors.text,
                    padding: 20,
                    usePointStyle: true,
                    pointStyle: 'circle'
                }
            },
            tooltip: {
                ...defaultOptions.plugins.tooltip,
                callbacks: {
                    label: (context) => `€${context.parsed?.toLocaleString('es-ES') || 0}`
                }
            }
        }
    };

    const total = values.reduce((a, b) => a + b, 0);
    const balance = values.length >= 2 ? values[0] - values[1] : 0;

    return (
        <div className="chart-container">
            <div className="chart-header">
                <h3 className="chart-title">Flujo de Caja</h3>
                <span className="chart-period">Balance mensual</span>
            </div>
            <div className="chart-wrapper doughnut-wrapper">
                {values.length > 0 ? (
                    <>
                        <Doughnut data={chartData} options={options} />
                        <div className="doughnut-center">
                            <span className="doughnut-label">Balance</span>
                            <span className={`doughnut-value ${balance >= 0 ? 'positive' : 'negative'}`}>
                                €{balance.toLocaleString('es-ES')}
                            </span>
                        </div>
                    </>
                ) : (
                    <div className="chart-empty">
                        <p>Carga un archivo CSV para ver los datos</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default { RevenueChart, ExpensesChart, CashFlowChart };
