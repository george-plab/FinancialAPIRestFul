import { useState, useEffect } from 'react';
import Header from '../components/layout/Header';
import LoadingState from '../components/shared/LoadingState';
import ErrorState from '../components/shared/ErrorState';
import { getAllAnalyses } from '../api';
import { formatCurrency, formatPercent, formatRatio } from '../utils/formatters';
import { getStatusBadge, hasAnalysisError } from '../utils/analysisHelpers';
import './styles.css';
import './Analysis.css';

/**
 * Analysis Component - KPIs Financieros según Guía de Producto
 * 
 * KPIs:
 * - Margen bruto: 🟡 Calculado si hay categorías claras, sino ⏳ Pendiente
 * - ROI: 🟡 Estimado como neto/gastos
 * - Ratio de liquidez: 🟡 Aproximado como caja_actual/gastos_mensuales_promedio
 * - Rotación de activos: ❌ No disponible (requiere balance de activos)
 * 
 * Estados: ✅ Calculado | 🟡 Estimado | ⏳ Pendiente | ❌ No disponible
 */

const Analysis = ({ financialData }) => {
    const [analyses, setAnalyses] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const hasData = financialData && Object.keys(financialData).length > 0;
    const sessionId = financialData?.sessionId;

    // hasAnalysisError is now imported from utils/analysisHelpers

    // Load analyses
    useEffect(() => {
        const loadAnalyses = async () => {
            if (!sessionId) return;

            setLoading(true);
            try {
                if (financialData?.analysesRaw) {
                    setAnalyses(financialData.analysesRaw);
                    console.log('Using cached analyses:', financialData.analysesRaw);
                } else {
                    const result = await getAllAnalyses(sessionId);
                    console.log('All analyses from API:', result);
                    setAnalyses(result || {});
                }
                setError(null);
            } catch (err) {
                console.error('Error loading analyses:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (hasData) {
            loadAnalyses();
        }
    }, [sessionId, hasData, financialData]);

    // Format helpers are now imported from utils/formatters

    /**
     * Calculate KPIs according to Product Guide
     */
    const calculateKPIs = () => {
        const monthly = analyses.monthly_summary;
        const yearly = analyses.yearly_summary;
        const cashflow = analyses.cash_flow;
        const budget = analyses.budget_variance;

        const monthlyOk = monthly && !hasAnalysisError(monthly);
        const yearlyOk = yearly && !hasAnalysisError(yearly);
        const cashflowOk = cashflow && !hasAnalysisError(cashflow);
        const budgetOk = budget && !hasAnalysisError(budget);

        // Get base values
        const income = (monthlyOk ? monthly?.totals?.income : null) ||
            (yearlyOk ? yearly?.total_income : null);
        const expenses = (monthlyOk ? monthly?.totals?.expenses : null) ||
            (yearlyOk ? yearly?.total_expenses : null);
        const netResult = (monthlyOk ? monthly?.totals?.net : null) ||
            (yearlyOk ? yearly?.net_result : null);
        const finalBalance = cashflowOk ? cashflow?.final_balance : null;

        // Average monthly expenses for liquidity ratio
        let avgMonthlyExpenses = null;
        if (monthlyOk && monthly?.months?.length > 0) {
            avgMonthlyExpenses = monthly.months.reduce((sum, m) => sum + (m.expenses || 0), 0) / monthly.months.length;
        }

        // ========================================
        // 1. MARGEN BRUTO
        // Fórmula: (ingresos - costes_directos) / ingresos
        // Estado: 🟡 si hay categorías, ⏳ si no hay costes directos
        // ========================================
        let grossMargin = null;
        let grossMarginStatus = 'pending';
        let grossMarginNote = 'Requiere identificar costes directos en el CSV';

        // Try to calculate if we have budget categories (could identify direct costs)
        if (budgetOk && budget?.by_category && income > 0) {
            // For MVP: estimate using total actual expenses as "costs"
            const totalActual = budget.by_category.reduce((sum, c) => sum + (c.actual || 0), 0);
            if (totalActual > 0) {
                grossMargin = (income - totalActual) / income;
                grossMarginStatus = 'estimated';
                grossMarginNote = 'Estimado usando gastos por categoría como costes';
            }
        } else if (income > 0 && expenses > 0) {
            // Fallback to simple margin
            grossMargin = (income - expenses) / income;
            grossMarginStatus = 'estimated';
            grossMarginNote = 'Estimado sin distinguir costes directos';
        }

        // ========================================
        // 2. ROI (Retorno de Inversión)
        // Fórmula clásica: beneficio_neto / inversión
        // MVP: neto / gastos (ROI estimado)
        // Estado: 🟡 Estimado
        // ========================================
        let roi = null;
        let roiStatus = 'unavailable';
        let roiNote = 'Requiere datos de inversión inicial';

        if (netResult !== null && expenses > 0) {
            roi = netResult / expenses;
            roiStatus = 'estimated';
            roiNote = 'ROI estimado: beneficio neto / gastos totales';
        }

        // ========================================
        // 3. RATIO DE LIQUIDEZ
        // Fórmula contable: activos_corrientes / pasivos_corrientes
        // MVP: caja_actual / gastos_mensuales_promedio
        // Interpretación: Meses que puede operar con la caja actual
        // Estado: 🟡 Aproximado
        // ========================================
        let liquidityRatio = null;
        let liquidityStatus = 'unavailable';
        let liquidityNote = 'Requiere datos de gastos mensuales';

        const currentCash = finalBalance || netResult;
        if (currentCash !== null && avgMonthlyExpenses > 0) {
            liquidityRatio = currentCash / avgMonthlyExpenses;
            liquidityStatus = 'estimated';
            liquidityNote = `${liquidityRatio.toFixed(1)} meses de operación con caja actual`;
        }

        // ========================================
        // 4. ROTACIÓN DE ACTIVOS
        // Fórmula: ingresos / activos
        // Estado: ❌ No disponible (no hay datos de activos)
        // ========================================
        const assetTurnover = null;
        const assetTurnoverStatus = 'unavailable';
        const assetTurnoverNote = 'No disponible: requiere balance de activos';

        return {
            grossMargin: { value: grossMargin, status: grossMarginStatus, note: grossMarginNote },
            roi: { value: roi, status: roiStatus, note: roiNote },
            liquidityRatio: { value: liquidityRatio, status: liquidityStatus, note: liquidityNote },
            assetTurnover: { value: assetTurnover, status: assetTurnoverStatus, note: assetTurnoverNote }
        };
    };

    const kpis = hasData ? calculateKPIs() : null;

    // getStatusBadge is now imported from utils/analysisHelpers

    // Render KPI metric card
    const renderKPICard = (title, kpi, formatFn) => {
        const status = getStatusBadge(kpi?.status || 'unavailable');
        return (
            <div className={`kpi-metric-card ${status.class}`}>
                <div className="kpi-metric-header">
                    <h3>{title}</h3>
                    <span className="kpi-status" title={status.text}>{status.icon}</span>
                </div>
                <div className="kpi-metric-value">
                    {kpi?.value !== null ? formatFn(kpi.value) : '--'}
                </div>
                <p className="kpi-metric-note">{kpi?.note || ''}</p>
            </div>
        );
    };

    // Render analysis card
    const renderAnalysisCard = (type, title, icon) => {
        const data = analyses[type] || null;
        const hasError = hasAnalysisError(data);

        if (!data || (Object.keys(data).length === 0 && !hasError)) {
            return (
                <div className="analysis-card empty" key={type}>
                    <div className="analysis-card-header">
                        <span className="analysis-icon">{icon}</span>
                        <h3>{title}</h3>
                        <span className="status-badge" title="No disponible">❌</span>
                    </div>
                    <p className="analysis-empty">No hay datos disponibles</p>
                </div>
            );
        }

        if (hasError) {
            return (
                <div className="analysis-card error" key={type}>
                    <div className="analysis-card-header">
                        <span className="analysis-icon">{icon}</span>
                        <h3>{title}</h3>
                        <span className="status-badge" title="Error">⚠️</span>
                    </div>
                    <p className="analysis-error">{data.error}</p>
                </div>
            );
        }

        return (
            <div className="analysis-card" key={type}>
                <div className="analysis-card-header">
                    <span className="analysis-icon">{icon}</span>
                    <h3>{title}</h3>
                    <span className="status-badge" title="Calculado">✅</span>
                </div>

                {/* YEARLY SUMMARY */}
                {type === 'yearly_summary' && (
                    <div className="analysis-metrics">
                        <div className="metric-item">
                            <span className="metric-label">Año</span>
                            <span className="metric-value">{data.year}</span>
                        </div>
                        <div className="metric-item">
                            <span className="metric-label">Ingresos</span>
                            <span className="metric-value positive">{formatCurrency(data.total_income)}</span>
                        </div>
                        <div className="metric-item">
                            <span className="metric-label">Gastos</span>
                            <span className="metric-value negative">{formatCurrency(data.total_expenses)}</span>
                        </div>
                        <div className="metric-item">
                            <span className="metric-label">Resultado</span>
                            <span className={`metric-value ${data.net_result >= 0 ? 'positive' : 'negative'}`}>
                                {formatCurrency(data.net_result)}
                            </span>
                        </div>
                    </div>
                )}

                {/* MONTHLY SUMMARY */}
                {type === 'monthly_summary' && (
                    <>
                        {data.totals && (
                            <div className="analysis-metrics">
                                <div className="metric-item">
                                    <span className="metric-label">Ingresos</span>
                                    <span className="metric-value positive">{formatCurrency(data.totals.income)}</span>
                                </div>
                                <div className="metric-item">
                                    <span className="metric-label">Gastos</span>
                                    <span className="metric-value negative">{formatCurrency(data.totals.expenses)}</span>
                                </div>
                                <div className="metric-item">
                                    <span className="metric-label">Neto</span>
                                    <span className={`metric-value ${data.totals.net >= 0 ? 'positive' : 'negative'}`}>
                                        {formatCurrency(data.totals.net)}
                                    </span>
                                </div>
                            </div>
                        )}
                        {data.months && data.months.length > 0 && (
                            <div className="analysis-table-container">
                                <table className="analysis-table">
                                    <thead>
                                        <tr>
                                            <th>Mes</th>
                                            <th>Ingresos</th>
                                            <th>Gastos</th>
                                            <th>Neto</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.months.slice(0, 6).map((m, idx) => (
                                            <tr key={idx}>
                                                <td>{m.month}</td>
                                                <td className="positive">{formatCurrency(m.income)}</td>
                                                <td className="negative">{formatCurrency(m.expenses)}</td>
                                                <td className={m.net >= 0 ? 'positive' : 'negative'}>
                                                    {formatCurrency(m.net)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {data.months.length > 6 && (
                                    <p className="table-more">...y {data.months.length - 6} meses más</p>
                                )}
                            </div>
                        )}
                    </>
                )}

                {/* CASH FLOW */}
                {type === 'cash_flow' && (
                    <>
                        <div className="analysis-metrics">
                            <div className="metric-item">
                                <span className="metric-label">Saldo Inicial</span>
                                <span className="metric-value">{formatCurrency(data.initial_balance)}</span>
                            </div>
                            <div className="metric-item">
                                <span className="metric-label">Saldo Final</span>
                                <span className={`metric-value ${data.final_balance >= 0 ? 'positive' : 'negative'}`}>
                                    {formatCurrency(data.final_balance)}
                                </span>
                            </div>
                        </div>
                        {data.periods && data.periods.length > 0 && (
                            <div className="analysis-table-container">
                                <table className="analysis-table">
                                    <thead>
                                        <tr>
                                            <th>Fecha</th>
                                            <th>Entradas</th>
                                            <th>Salidas</th>
                                            <th>Saldo</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.periods.slice(0, 6).map((p, idx) => (
                                            <tr key={idx}>
                                                <td>{p.date}</td>
                                                <td className="positive">{formatCurrency(p.inflow)}</td>
                                                <td className="negative">{formatCurrency(p.outflow)}</td>
                                                <td className={p.ending_balance >= 0 ? 'positive' : 'negative'}>
                                                    {formatCurrency(p.ending_balance)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}

                {/* BUDGET VARIANCE */}
                {type === 'budget_variance' && (
                    <>
                        {data.total_variance !== undefined && (
                            <div className="analysis-metrics">
                                <div className="metric-item">
                                    <span className="metric-label">Variación Total</span>
                                    <span className={`metric-value ${data.total_variance <= 0 ? 'positive' : 'negative'}`}>
                                        {formatCurrency(data.total_variance)}
                                    </span>
                                </div>
                            </div>
                        )}
                        {data.by_category && data.by_category.length > 0 && (
                            <div className="analysis-table-container">
                                <table className="analysis-table">
                                    <thead>
                                        <tr>
                                            <th>Categoría</th>
                                            <th>Presupuesto</th>
                                            <th>Real</th>
                                            <th>Variación</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.by_category.map((c, idx) => (
                                            <tr key={idx}>
                                                <td>{c.category}</td>
                                                <td>{formatCurrency(c.budgeted)}</td>
                                                <td>{formatCurrency(c.actual)}</td>
                                                <td className={c.variance <= 0 ? 'positive' : 'negative'}>
                                                    {formatCurrency(c.variance)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}
            </div>
        );
    };

    return (
        <div className="page">
            <Header
                title="Análisis Financiero"
                subtitle="Métricas avanzadas y tendencias"
            />

            <div className="page-content">
                {loading ? (
                    <LoadingState message="Cargando análisis..." />
                ) : error ? (
                    <ErrorState error={`Error al cargar análisis: ${error}`} />
                ) : hasData ? (
                    <>
                        {/* Session Info */}
                        <div className="session-info">
                            <span className="session-label">Sesión:</span>
                            <span className="session-id">{sessionId}</span>
                        </div>

                        {/* KPIs Section */}
                        <section className="kpis-section">
                            <h2 className="section-title">KPIs Financieros</h2>
                            <p className="section-subtitle">
                                Estados: ✅ Calculado | 🟡 Estimado | ⏳ Pendiente | ❌ No disponible
                            </p>
                            <div className="kpis-grid">
                                {renderKPICard('Margen Bruto', kpis?.grossMargin, formatPercent)}
                                {renderKPICard('ROI', kpis?.roi, formatPercent)}
                                {renderKPICard('Ratio de Liquidez', kpis?.liquidityRatio, formatRatio)}
                                {renderKPICard('Rotación de Activos', kpis?.assetTurnover, formatRatio)}
                            </div>
                        </section>

                        {/* Analyses Grid */}
                        <section className="analyses-section">
                            <h2 className="section-title">Resultados de Análisis</h2>
                            <div className="analyses-grid">
                                {renderAnalysisCard('monthly_summary', 'Resumen Mensual', '📅')}
                                {renderAnalysisCard('yearly_summary', 'Resumen Anual', '📊')}
                                {renderAnalysisCard('cash_flow', 'Flujo de Caja', '💰')}
                                {renderAnalysisCard('budget_variance', 'Variaciones Presupuestarias', '📈')}
                            </div>
                        </section>
                    </>
                ) : (
                    <div className="empty-analysis">
                        <div className="empty-illustration">
                            <div className="empty-chart">
                                <div className="bar bar-1"></div>
                                <div className="bar bar-2"></div>
                                <div className="bar bar-3"></div>
                                <div className="bar bar-4"></div>
                            </div>
                        </div>
                        <h3>Sin datos para analizar</h3>
                        <p>Carga un archivo CSV desde "Cargar Datos" para ver el análisis</p>
                        <div className="empty-features">
                            <div className="feature"><span>📅</span> Resumen Mensual</div>
                            <div className="feature"><span>📊</span> Resumen Anual</div>
                            <div className="feature"><span>💰</span> Flujo de Caja</div>
                            <div className="feature"><span>📈</span> Variaciones</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Analysis;
