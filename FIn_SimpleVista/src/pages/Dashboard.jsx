import { useState, useEffect } from 'react';
import { DollarSign, TrendingDown, Wallet, BarChart3 } from 'lucide-react';
import Header from '../components/Header';
import KPICard from '../components/KPICard';
import IncomeEvolutionChart from '../components/charts/IncomeEvolutionChart';
import ExpenseBreakdownChart from '../components/charts/ExpenseBreakdownChart';
import CashFlowChart from '../components/charts/CashFlowChart';
import '../components/charts/charts.css';

// Formatting helpers
const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '€ --';
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0
    }).format(amount);
};

export default function Dashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dataSource, setDataSource] = useState('example'); // 'example' or 'uploaded'

    useEffect(() => {
        loadExampleData();
    }, []);

    const loadExampleData = async () => {
        try {
            setLoading(true);
            const response = await fetch('http://localhost:8000/api/examples');
            if (!response.ok) throw new Error('Error al cargar datos de ejemplo');
            const exampleData = await response.json();
            setData(exampleData);
            setDataSource('example');
        } catch (err) {
            console.error('Error loading example data:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Check if user has uploaded data
    useEffect(() => {
        const sessionId = localStorage.getItem('currentSessionId');
        if (sessionId) {
            loadUserData(sessionId);
        }
    }, []);

    const loadUserData = async (sessionId) => {
        try {
            const response = await fetch(`http://localhost:8000/api/analyses/all?session_id=${sessionId}`);
            if (response.ok) {
                const userData = await response.json();
                setData(userData);
                setDataSource('uploaded');
            }
        } catch (err) {
            console.log('No user data found, using examples');
        }
    };

    // Transform data for charts
    const getIncomeEvolutionData = () => {
        if (!data?.monthly_summary?.months) return [];
        return data.monthly_summary.months.map(m => ({
            month: m.month.split('-')[1] + '/' + m.month.split('-')[0].slice(-2),
            income: m.income
        }));
    };

    const getExpenseBreakdownData = () => {
        if (!data?.budget_variance?.by_category) return [];
        return data.budget_variance.by_category.map(c => ({
            category: c.category,
            value: c.actual
        }));
    };

    const getCashFlowData = () => {
        if (!data?.cash_flow?.periods) return [];
        return data.cash_flow.periods.map(p => ({
            period: p.date.split('-')[1] + '/' + p.date.split('-')[0].slice(-2),
            inflow: p.inflow,
            outflow: p.outflow
        }));
    };

    // Calculate KPIs
    const kpis = {
        income: data?.yearly_summary?.total_income ?? data?.monthly_summary?.totals?.income,
        expenses: data?.yearly_summary?.total_expenses ?? data?.monthly_summary?.totals?.expenses,
        netProfit: data?.yearly_summary?.net_result ?? data?.monthly_summary?.totals?.net,
        cashFlow: data?.cash_flow?.final_balance ?? data?.yearly_summary?.net_result
    };

    // Calculate change percentages (mock for now - would need historical data)
    const calculateChange = (value) => {
        if (!value) return null;
        // Mock change calculation - in real app, compare with previous period
        return ((Math.random() - 0.5) * 20).toFixed(1);
    };

    if (loading) {
        return (
            <div className="dashboard-loading">
                <div className="loading-spinner"></div>
                <p>Cargando datos...</p>
            </div>
        );
    }

    return (
        <div className="dashboard">
            <Header
                title="Dashboard Financiero"
                subtitle="Resumen ejecutivo de indicadores clave"
            />

            {dataSource === 'example' && (
                <div className="data-source-banner">
                    <span className="banner-icon">📊</span>
                    <span>Mostrando datos de ejemplo. </span>
                    <a href="/upload">Sube tus propios datos</a>
                </div>
            )}

            {/* KPI Cards */}
            <section>
                <div className="section-header">
                    <span className="section-indicator"></span>
                    <h2>Indicadores Clave</h2>
                </div>

                <div className="kpi-grid">
                    <KPICard
                        title="Ingresos Totales"
                        value={kpis.income}
                        icon={DollarSign}
                        iconColor="green"
                        change={parseFloat(calculateChange(kpis.income))}
                        formatValue={formatCurrency}
                        status="calculated"
                    />

                    <KPICard
                        title="Gastos Totales"
                        value={kpis.expenses}
                        icon={TrendingDown}
                        iconColor="red"
                        change={parseFloat(calculateChange(kpis.expenses))}
                        formatValue={formatCurrency}
                        status="calculated"
                    />

                    <KPICard
                        title="Utilidad Neta"
                        value={kpis.netProfit}
                        icon={Wallet}
                        iconColor="blue"
                        change={parseFloat(calculateChange(kpis.netProfit))}
                        formatValue={formatCurrency}
                        status="calculated"
                    />

                    <KPICard
                        title="Flujo de Caja"
                        value={kpis.cashFlow}
                        icon={BarChart3}
                        iconColor="yellow"
                        change={parseFloat(calculateChange(kpis.cashFlow))}
                        formatValue={formatCurrency}
                        status={data?.cash_flow ? 'calculated' : 'estimated'}
                    />
                </div>
            </section>

            {/* Visualizations */}
            <section>
                <div className="section-header">
                    <span className="section-indicator"></span>
                    <h2>Visualizaciones</h2>
                </div>

                <div className="charts-grid">
                    <IncomeEvolutionChart data={getIncomeEvolutionData()} />
                    <ExpenseBreakdownChart data={getExpenseBreakdownData()} />
                </div>

                <CashFlowChart data={getCashFlowData()} />
            </section>
        </div>
    );
}
