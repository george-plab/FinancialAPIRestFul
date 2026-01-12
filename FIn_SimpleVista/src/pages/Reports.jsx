import { useState, useEffect } from 'react';
import { FileText, Download, Calendar } from 'lucide-react';
import Header from '../components/Header';

export default function Reports() {
    const [sessionId, setSessionId] = useState(null);
    const [analyses, setAnalyses] = useState(null);

    useEffect(() => {
        const storedSessionId = localStorage.getItem('currentSessionId');
        if (storedSessionId) {
            setSessionId(storedSessionId);
            loadAnalyses(storedSessionId);
        }
    }, []);

    const loadAnalyses = async (sid) => {
        try {
            const response = await fetch(`http://localhost:8000/api/analyses/all?session_id=${sid}`);
            if (response.ok) {
                const data = await response.json();
                setAnalyses(data);
            }
        } catch (err) {
            console.error('Error loading analyses');
        }
    };

    return (
        <div className="reports-page">
            <Header
                title="Informes"
                subtitle="Informes narrativos generados a partir de tus datos"
            />

            {/* AI Narrative Report */}
            <section className="report-section">
                <div className="section-header">
                    <span className="section-indicator" style={{ background: '#f59e0b' }}></span>
                    <h2>Informe Narrativo IA</h2>
                </div>

                <div className="report-card narrative">
                    <div className="report-header">
                        <FileText size={24} />
                        <div>
                            <h3>Estado de Resultados Narrado</h3>
                            <span className="report-date">
                                <Calendar size={14} />
                                {new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                            </span>
                        </div>
                    </div>

                    <div className="report-content">
                        <h4>📊 Resumen Ejecutivo</h4>
                        <p>
                            Cargue un archivo CSV con datos financieros para generar automáticamente un informe
                            narrativo con análisis de tendencias, variaciones y recomendaciones basadas en los datos.
                        </p>

                        <h4>✨ Características del Informe</h4>
                        <p>El informe incluirá: explicación de variaciones de ventas, identificación de gastos
                            inusuales, análisis de indicadores clave (KPIs), y recomendaciones basadas en los datos.</p>

                        <ul>
                            <li>Análisis de ingresos y variaciones</li>
                            <li>Desglose de gastos por categoría</li>
                            <li>Flujo de caja y liquidez</li>
                            <li>Tendencias y proyecciones</li>
                        </ul>
                    </div>

                    {!sessionId && (
                        <div className="report-cta">
                            <span className="cta-icon">📁</span>
                            <span>Sube un archivo CSV desde la sección "Cargar Datos" para generar tu primer informe.</span>
                        </div>
                    )}
                </div>
            </section>

            {/* Generated Reports - Show if we have data */}
            {analyses && (
                <section className="report-section">
                    <div className="section-header">
                        <span className="section-indicator"></span>
                        <h2>Informes Generados</h2>
                    </div>

                    <div className="reports-grid">
                        {analyses.yearly_summary && (
                            <div className="report-card mini">
                                <div className="report-icon">📈</div>
                                <h4>Resumen Anual {analyses.yearly_summary.year}</h4>
                                <p>Ingresos: €{analyses.yearly_summary.total_income?.toLocaleString()}</p>
                                <p>Gastos: €{analyses.yearly_summary.total_expenses?.toLocaleString()}</p>
                                <p className="highlight">Neto: €{analyses.yearly_summary.net_result?.toLocaleString()}</p>
                            </div>
                        )}

                        {analyses.cash_flow && (
                            <div className="report-card mini">
                                <div className="report-icon">💰</div>
                                <h4>Flujo de Caja</h4>
                                <p>Saldo Inicial: €{analyses.cash_flow.initial_balance?.toLocaleString()}</p>
                                <p>Saldo Final: €{analyses.cash_flow.final_balance?.toLocaleString()}</p>
                                <p className="highlight">
                                    {analyses.cash_flow.final_balance > analyses.cash_flow.initial_balance
                                        ? '↑ Positivo' : '↓ Negativo'}
                                </p>
                            </div>
                        )}
                    </div>
                </section>
            )}
        </div>
    );
}
