import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle, HelpCircle, XCircle } from 'lucide-react';
import Header from '../components/Header';
import './Analysis.css';

// KPI Calculator functions
const calculateGrossMargin = (income, directCosts) => {
    if (!income || income <= 0) return null;
    return ((income - directCosts) / income) * 100;
};

const calculateROI = (netResult, expenses) => {
    if (!expenses || expenses <= 0) return null;
    return (netResult / expenses) * 100;
};

const calculateLiquidityProxy = (currentCash, avgMonthlyExpenses) => {
    if (!avgMonthlyExpenses || avgMonthlyExpenses <= 0) return null;
    return currentCash / avgMonthlyExpenses;
};

export default function Analysis() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            // First try user data
            const sessionId = localStorage.getItem('currentSessionId');
            if (sessionId) {
                const response = await fetch(`http://localhost:8000/api/analyses/all?session_id=${sessionId}`);
                if (response.ok) {
                    setData(await response.json());
                    setLoading(false);
                    return;
                }
            }
            // Fallback to examples
            const exampleResponse = await fetch('http://localhost:8000/api/examples');
            if (exampleResponse.ok) {
                setData(await exampleResponse.json());
            }
        } catch (err) {
            console.error('Error loading data');
        } finally {
            setLoading(false);
        }
    };

    // Calculate KPIs
    const income = data?.yearly_summary?.total_income ?? data?.monthly_summary?.totals?.income ?? 0;
    const expenses = data?.yearly_summary?.total_expenses ?? data?.monthly_summary?.totals?.expenses ?? 0;
    const netResult = data?.yearly_summary?.net_result ?? data?.monthly_summary?.totals?.net ?? 0;
    const cashBalance = data?.cash_flow?.final_balance ?? netResult;

    // Assume 40% of expenses are direct costs for margin calculation (approximation)
    const estimatedDirectCosts = expenses * 0.4;

    // Calculate avg monthly expenses
    const months = data?.monthly_summary?.months || [];
    const avgMonthlyExpenses = months.length > 0
        ? months.reduce((sum, m) => sum + (m.expenses || 0), 0) / months.length
        : expenses / 12;

    const kpis = [
        {
            name: 'Margen Bruto',
            value: calculateGrossMargin(income, estimatedDirectCosts),
            format: (v) => `${v.toFixed(1)}%`,
            icon: income > estimatedDirectCosts ? TrendingUp : TrendingDown,
            status: data?.budget_variance ? 'estimated' : 'pending',
            statusLabel: data?.budget_variance ? '🟡 Estimado' : '⏳ Pendiente de categorías',
            description: 'Requiere distinguir costes directos vs indirectos. Actualmente estimado como 40% de gastos.',
            formula: '(Ingresos - Costes Directos) / Ingresos'
        },
        {
            name: 'ROI Estimado',
            value: calculateROI(netResult, expenses),
            format: (v) => `${v.toFixed(1)}%`,
            icon: netResult > 0 ? TrendingUp : TrendingDown,
            status: 'estimated',
            statusLabel: '🟡 Estimado',
            description: 'No existe inversión inicial explícita. Se usa: beneficio neto / gastos totales.',
            formula: 'Beneficio Neto / Gastos Totales'
        },
        {
            name: 'Ratio de Liquidez',
            value: calculateLiquidityProxy(cashBalance, avgMonthlyExpenses),
            format: (v) => `${v.toFixed(1)} meses`,
            icon: CheckCircle,
            status: 'estimated',
            statusLabel: '🟡 Aproximado',
            description: 'Meses que la empresa puede operar con la caja actual. Proxy útil para MVP.',
            formula: 'Caja Actual / Gastos Mensuales Promedio'
        },
        {
            name: 'Rotación de Activos',
            value: null,
            format: () => 'N/A',
            icon: XCircle,
            status: 'unavailable',
            statusLabel: '❌ No disponible',
            description: 'Requiere datos de activos totales que no están en el CSV de ingresos/gastos.',
            formula: 'Ingresos / Activos Totales'
        }
    ];

    if (loading) {
        return (
            <div className="analysis-page loading">
                <div className="loading-spinner"></div>
                <p>Calculando KPIs...</p>
            </div>
        );
    }

    return (
        <div className="analysis-page">
            <Header
                title="Análisis"
                subtitle="KPIs financieros calculados a partir de tus datos"
            />

            {/* KPI Status Legend */}
            <div className="kpi-legend">
                <div className="legend-item">
                    <CheckCircle size={14} className="green" />
                    <span>Calculado directamente</span>
                </div>
                <div className="legend-item">
                    <AlertCircle size={14} className="yellow" />
                    <span>Estimado/Aproximado</span>
                </div>
                <div className="legend-item">
                    <HelpCircle size={14} className="blue" />
                    <span>Pendiente de datos</span>
                </div>
                <div className="legend-item">
                    <XCircle size={14} className="gray" />
                    <span>No disponible</span>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="analysis-grid">
                {kpis.map((kpi, index) => {
                    const Icon = kpi.icon;
                    const isPositive = kpi.value && kpi.value > 0;

                    return (
                        <div key={index} className={`analysis-card ${kpi.status}`}>
                            <div className="card-header">
                                <h3>{kpi.name}</h3>
                                <span className={`status-badge ${kpi.status}`}>
                                    {kpi.statusLabel}
                                </span>
                            </div>

                            <div className="kpi-value-large">
                                {kpi.value !== null ? (
                                    <>
                                        <Icon
                                            size={24}
                                            className={isPositive ? 'positive' : 'negative'}
                                        />
                                        <span>{kpi.format(kpi.value)}</span>
                                    </>
                                ) : (
                                    <span className="unavailable">No disponible</span>
                                )}
                            </div>

                            <div className="kpi-formula">
                                <code>{kpi.formula}</code>
                            </div>

                            <p className="kpi-description">{kpi.description}</p>
                        </div>
                    );
                })}
            </div>

            {/* Raw Data Preview */}
            {data && (
                <section className="data-preview-section">
                    <div className="section-header">
                        <span className="section-indicator"></span>
                        <h2>Datos Base</h2>
                    </div>

                    <div className="data-cards">
                        <div className="data-card">
                            <h4>Resumen Anual</h4>
                            <div className="data-row">
                                <span>Ingresos:</span>
                                <span className="value">€{income.toLocaleString('es-ES')}</span>
                            </div>
                            <div className="data-row">
                                <span>Gastos:</span>
                                <span className="value">€{expenses.toLocaleString('es-ES')}</span>
                            </div>
                            <div className="data-row highlight">
                                <span>Neto:</span>
                                <span className="value">€{netResult.toLocaleString('es-ES')}</span>
                            </div>
                        </div>

                        <div className="data-card">
                            <h4>Flujo de Caja</h4>
                            <div className="data-row">
                                <span>Saldo Final:</span>
                                <span className="value">€{cashBalance.toLocaleString('es-ES')}</span>
                            </div>
                            <div className="data-row">
                                <span>Gasto Mensual Promedio:</span>
                                <span className="value">€{avgMonthlyExpenses.toLocaleString('es-ES', { maximumFractionDigits: 0 })}</span>
                            </div>
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
}
