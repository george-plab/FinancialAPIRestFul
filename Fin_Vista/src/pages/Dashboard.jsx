import { useState, useEffect } from 'react';
import Header from '../components/layout/Header';
import KPICard from '../components/dashboard/KPICard';
import { RevenueChart, ExpensesChart, CashFlowChart } from '../components/dashboard/ChartSection';
import NarrativeReport from '../components/dashboard/NarrativeReport';
import LoadingState from '../components/shared/LoadingState';
import ErrorState from '../components/shared/ErrorState';
import { getExamples } from '../api';
import { getStatusBadge, hasAnalysisError } from '../utils/analysisHelpers';
import mockDataComponents from '../mockdata_components.json';
import './styles.css';
import './Dashboard.css';

/**
 * Dashboard Component - Según Guía de Producto
 * 
 * Panel (Dashboard):
 * - Ingresos: ✅ monthly_summary.totals.income o yearly_summary.total_income
 * - Gastos: ✅ monthly_summary.totals.expenses o yearly_summary.total_expenses  
 * - Beneficio neto: ✅ monthly_summary.totals.net o yearly_summary.net_result
 * - Flujo de caja: 🟡 cash_flow.final_balance (fallback: net_result)
 * - Evolución ingresos: ✅ monthly_summary.months[].income (gráfico líneas)
 * - Desglose gastos: ✅ budget_variance.by_category[].actual
 * - Flujo mensual: ✅ cash_flow.periods[].inflow/outflow (pie/donut)
 */

const Dashboard = ({ financialData }) => {
    const [exampleData, setExampleData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // hasAnalysisError is now imported from utils/analysisHelpers

    // Load example data from API on mount
    useEffect(() => {
        const loadExamples = async () => {
            try {
                setLoading(true);
                const examples = await getExamples();
                console.log('Examples loaded:', examples);
                setExampleData(examples);
                setError(null);
            } catch (err) {
                console.warn('API not available, using mock data:', err.message);
                // Fallback to mock data when server is not connected
                console.log('Using mock data from mockdata_components.json');
                setExampleData(mockDataComponents);
                setError(null); // Clear error since we have fallback data
            } finally {
                setLoading(false);
            }
        };

        if (!financialData) {
            loadExamples();
        } else {
            setLoading(false);
        }
    }, [financialData]);

    /**
     * Calculate KPIs from analyses data - SEGÚN GUÍA DE PRODUCTO
     */
    const calculateKPIs = (data) => {
        if (!data) return null;

        const monthly = data.monthly_summary;
        const yearly = data.yearly_summary;
        const cashflow = data.cash_flow;

        const monthlyOk = monthly && !hasAnalysisError(monthly);
        const yearlyOk = yearly && !hasAnalysisError(yearly);
        const cashflowOk = cashflow && !hasAnalysisError(cashflow);

        // ✅ Ingresos: monthly_summary.totals.income OR yearly_summary.total_income
        const revenue =
            (monthlyOk ? monthly?.totals?.income : null) ||
            (yearlyOk ? yearly?.total_income : null) ||
            null;

        // ✅ Gastos: monthly_summary.totals.expenses OR yearly_summary.total_expenses
        const expenses =
            (monthlyOk ? monthly?.totals?.expenses : null) ||
            (yearlyOk ? yearly?.total_expenses : null) ||
            null;

        // ✅ Beneficio neto: monthly_summary.totals.net OR yearly_summary.net_result
        const profit =
            (monthlyOk ? monthly?.totals?.net : null) ||
            (yearlyOk ? yearly?.net_result : null) ||
            (revenue && expenses ? revenue - expenses : null);

        // 🟡 Flujo de caja: cash_flow.final_balance (fallback: net_result para MVP)
        const cashflowValue = cashflowOk
            ? cashflow?.final_balance
            : profit; // Fallback a beneficio neto

        const cashflowIsApproximate = !cashflowOk && profit !== null;

        return {
            revenue,
            revenueStatus: revenue !== null ? 'calculated' : 'unavailable',
            expenses,
            expensesStatus: expenses !== null ? 'calculated' : 'unavailable',
            profit,
            profitStatus: profit !== null ? 'calculated' : 'unavailable',
            cashflow: cashflowValue,
            cashflowStatus: cashflowOk ? 'calculated' : (cashflowIsApproximate ? 'estimated' : 'unavailable'),
            cashflowNote: cashflowIsApproximate ? 'Aproximado usando beneficio neto' : null
        };
    };

    /**
     * Calculate chart data - SEGÚN GUÍA DE PRODUCTO
     */
    const calculateCharts = (data) => {
        if (!data) return null;

        const monthly = data.monthly_summary;
        const budget = data.budget_variance;
        const cashflow = data.cash_flow;

        // ✅ Evolución de ingresos: monthly_summary.months[].income (gráfico líneas)
        let revenueChart = { labels: [], values: [], status: 'unavailable' };
        if (monthly && !hasAnalysisError(monthly) && monthly.months && monthly.months.length > 0) {
            // Filter out entries with invalid (negative, null, undefined) income values
            const validData = monthly.months.filter(m => {
                const income = m.income;
                return income !== null && income !== undefined && income >= 0 && !isNaN(income);
            });

            revenueChart = {
                labels: validData.map(m => m.month || ''),
                values: validData.map(m => m.income),
                status: 'calculated'
            };
        }

        // ✅ Desglose gastos: budget_variance.by_category[].actual
        let expensesChart = { labels: [], values: [], status: 'unavailable' };
        if (budget && !hasAnalysisError(budget) && budget.by_category && budget.by_category.length > 0) {
            expensesChart = {
                labels: budget.by_category.map(c => c.category || ''),
                values: budget.by_category.map(c => c.actual || 0),
                status: 'calculated'
            };
        }

        // ✅ Flujo de caja mensual: cash_flow.periods[].inflow/outflow (pie/donut)
        let cashflowChart = { labels: ['Entradas', 'Salidas'], values: [0, 0], status: 'unavailable' };
        if (cashflow && !hasAnalysisError(cashflow) && cashflow.periods && cashflow.periods.length > 0) {
            const totalInflow = cashflow.periods.reduce((sum, p) => sum + (p.inflow || 0), 0);
            const totalOutflow = cashflow.periods.reduce((sum, p) => sum + (p.outflow || 0), 0);
            cashflowChart = {
                labels: ['Entradas', 'Salidas'],
                values: [totalInflow, totalOutflow],
                status: 'calculated'
            };
        }

        return {
            revenue: revenueChart,
            expenses: expensesChart,
            cashflow: cashflowChart
        };
    };

    // Get analysis errors for display
    const getAnalysisErrors = (data) => {
        if (!data) return [];
        const errors = [];
        if (hasAnalysisError(data.yearly_summary)) {
            errors.push(`Resumen Anual: ${data.yearly_summary.error}`);
        }
        if (hasAnalysisError(data.monthly_summary)) {
            errors.push(`Resumen Mensual: ${data.monthly_summary.error}`);
        }
        if (hasAnalysisError(data.cash_flow)) {
            errors.push(`Flujo de Caja: ${data.cash_flow.error}`);
        }
        if (hasAnalysisError(data.budget_variance)) {
            errors.push(`Variaciones: ${data.budget_variance.error}`);
        }
        return errors;
    };

    // Determine data source
    const dataSource = financialData?.analysesRaw || exampleData;
    const isRealData = !!financialData?.analysesRaw;
    const isExampleData = !financialData && !!exampleData;

    // Calculate KPIs and charts
    const kpiData = calculateKPIs(dataSource) || {
        revenue: null, revenueStatus: 'unavailable',
        expenses: null, expensesStatus: 'unavailable',
        profit: null, profitStatus: 'unavailable',
        cashflow: null, cashflowStatus: 'unavailable'
    };

    const chartData = calculateCharts(dataSource) || {
        revenue: { labels: [], values: [], status: 'unavailable' },
        expenses: { labels: [], values: [], status: 'unavailable' },
        cashflow: { labels: ['Entradas', 'Salidas'], values: [0, 0], status: 'unavailable' }
    };

    const analysisErrors = getAnalysisErrors(dataSource);
    const narrativeReport = financialData?.report || null;

    // getStatusBadge is now imported from utils/analysisHelpers

    return (
        <div className="page">
            <Header
                title="Dashboard Financiero"
                subtitle="Resumen ejecutivo de indicadores clave"
            />

            <div className="page-content">
                {loading ? (
                    <LoadingState message="Cargando datos..." />
                ) : error ? (
                    <ErrorState
                        error={`Error al cargar datos: ${error}`}
                        hint="Verifica que el servidor esté activo en http://localhost:8000"
                    />
                ) : (
                    <>
                        {/* Data Source Indicator */}
                        {isExampleData && (
                            <div className="demo-banner">
                                📊 Mostrando datos de ejemplo desde /api/examples
                            </div>
                        )}

                        {isRealData && (
                            <div className="data-banner">
                                ✅ Datos del análisis - Sesión: {financialData.sessionId}
                            </div>
                        )}

                        {/* Analysis errors/warnings */}
                        {analysisErrors.length > 0 && (
                            <div className="warning-banner">
                                ⚠️ Algunos análisis no disponibles:
                                <ul>
                                    {analysisErrors.map((err, idx) => (
                                        <li key={idx}>{err}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* KPI Cards Grid */}
                        <section className="kpi-section">
                            <h2 className="section-title">Indicadores Clave</h2>
                            <div className="kpi-grid">
                                <KPICard
                                    title="Ingresos Totales"
                                    value={kpiData.revenue}
                                    prefix="€"
                                    icon="💰"
                                    status={getStatusBadge(kpiData.revenueStatus)}
                                />
                                <KPICard
                                    title="Gastos Totales"
                                    value={kpiData.expenses}
                                    prefix="€"
                                    icon="📊"
                                    status={getStatusBadge(kpiData.expensesStatus)}
                                />
                                <KPICard
                                    title="Beneficio Neto"
                                    value={kpiData.profit}
                                    prefix="€"
                                    icon="📈"
                                    status={getStatusBadge(kpiData.profitStatus)}
                                />
                                <KPICard
                                    title="Flujo de Caja"
                                    value={kpiData.cashflow}
                                    prefix="€"
                                    icon="💵"
                                    status={getStatusBadge(kpiData.cashflowStatus)}
                                    note={kpiData.cashflowNote}
                                />
                            </div>
                        </section>

                        {/* Charts Section */}
                        <section className="charts-section">
                            <h2 className="section-title">Visualizaciones</h2>
                            <div className="charts-grid">
                                <div className="chart-wrapper">
                                    <div className="chart-status">
                                        {getStatusBadge(chartData.revenue.status).icon} Evolución de Ingresos
                                    </div>
                                    <RevenueChart data={chartData.revenue} />
                                </div>
                                <div className="chart-wrapper">
                                    <div className="chart-status">
                                        {getStatusBadge(chartData.expenses.status).icon} Desglose de Gastos
                                    </div>
                                    <ExpensesChart data={chartData.expenses} />
                                </div>
                                <div className="chart-wrapper">
                                    <div className="chart-status">
                                        {getStatusBadge(chartData.cashflow.status).icon} Flujo de Caja
                                    </div>
                                    <CashFlowChart data={chartData.cashflow} />
                                </div>
                            </div>
                        </section>

                        {/* Narrative Report Section */}
                        <section className="report-section">
                            <h2 className="section-title">Informe Narrativo IA</h2>
                            <NarrativeReport report={narrativeReport} />
                        </section>
                    </>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
