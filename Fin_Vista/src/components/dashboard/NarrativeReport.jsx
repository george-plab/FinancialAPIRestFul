import { useState } from 'react';
import './NarrativeReport.css';

const NarrativeReport = ({ report, isLoading = false }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    // Placeholder content when no report is available
    const placeholderReport = {
        title: 'Estado de Resultados Narrado',
        date: new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
        sections: [
            {
                title: '📊 Resumen Ejecutivo',
                content: 'Cargue un archivo CSV con datos financieros para generar automáticamente un informe narrativo con análisis de tendencias, variaciones y recomendaciones.'
            },
            {
                title: '💡 Características del Informe',
                content: 'El informe incluirá: explicación de variaciones de ventas, identificación de gastos inusuales, análisis de indicadores clave (KPIs), y recomendaciones basadas en los datos.',
                highlights: [
                    'Análisis de ingresos y variaciones',
                    'Desglose de gastos por categoría',
                    'Flujo de caja y liquidez',
                    'Tendencias y proyecciones'
                ]
            }
        ]
    };

    const displayReport = report || placeholderReport;

    return (
        <div className={`narrative-report ${isLoading ? 'loading' : ''}`}>
            <div className="report-header">
                <div className="report-header-left">
                    <div className="report-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14,2 14,8 20,8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                            <polyline points="10,9 9,9 8,9" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="report-title">{displayReport.title}</h3>
                        <span className="report-date">{displayReport.date}</span>
                    </div>
                </div>
                <div className="report-actions">
                    {report && (
                        <>
                            <button className="report-btn" title="Descargar PDF">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="7,10 12,15 17,10" />
                                    <line x1="12" y1="15" x2="12" y2="3" />
                                </svg>
                            </button>
                            <button className="report-btn" title="Compartir">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="18" cy="5" r="3" />
                                    <circle cx="6" cy="12" r="3" />
                                    <circle cx="18" cy="19" r="3" />
                                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                                </svg>
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className={`report-content ${isExpanded ? 'expanded' : ''}`}>
                {isLoading ? (
                    <div className="report-loading">
                        <div className="loading-spinner"></div>
                        <p>Generando informe con IA...</p>
                    </div>
                ) : (
                    displayReport.sections?.map((section, index) => (
                        <div key={index} className="report-section">
                            <h4 className="section-title">{section.title}</h4>
                            <p className="section-content">{section.content}</p>

                            {section.highlights && (
                                <ul className="section-highlights">
                                    {section.highlights.map((highlight, i) => (
                                        <li key={i}>
                                            <span className="highlight-dot"></span>
                                            {highlight}
                                        </li>
                                    ))}
                                </ul>
                            )}

                            {section.insight && (
                                <div className={`section-insight ${section.insightType || 'info'}`}>
                                    <span className="insight-icon">
                                        {section.insightType === 'positive' ? '✅' :
                                            section.insightType === 'negative' ? '⚠️' : 'ℹ️'}
                                    </span>
                                    <span>{section.insight}</span>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {!isLoading && displayReport.sections?.length > 2 && (
                <button
                    className="report-toggle"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    {isExpanded ? 'Ver menos' : 'Ver más'}
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        style={{ transform: isExpanded ? 'rotate(180deg)' : 'none' }}
                    >
                        <polyline points="6,9 12,15 18,9" />
                    </svg>
                </button>
            )}

            {!report && (
                <div className="report-cta">
                    <span className="cta-icon">📁</span>
                    <p>Sube un archivo CSV desde la sección "Cargar Datos" para generar tu primer informe</p>
                </div>
            )}
        </div>
    );
};

export default NarrativeReport;
