import { useState } from 'react';
import Header from '../components/layout/Header';
import CSVUpload from '../components/upload/CSVUpload';
import DataPreview from '../components/upload/DataPreview';
import api from '../api';
import { hasAnalysisError } from '../utils/analysisHelpers';
import { transformKPIs, transformRevenueChart, transformExpensesChart, transformCashFlowChart } from '../utils/dataTransformers';
import './styles.css';
import './Reports.css';

const Reports = ({ onDataLoaded }) => {
    const [uploadedData, setUploadedData] = useState(null);
    const [error, setError] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [recentReports, setRecentReports] = useState([]);

    const handleDataLoaded = (data) => {
        setUploadedData(data);
        setError(null);
    };

    const handleError = (errorMessage) => {
        setError(errorMessage);
        setUploadedData(null);
    };

    // Generate unique session ID
    const generateSessionId = () => {
        return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    };

    const handleConfirm = async () => {
        if (!uploadedData || !uploadedData.file) return;

        setIsAnalyzing(true);
        const errors = [];

        try {
            // 1. Generate session ID
            const sessionId = generateSessionId();

            // 2. Upload CSV to server
            const uploadResult = await api.csvs.upload(uploadedData.file, sessionId);
            console.log('CSV uploaded:', uploadResult);

            // 3. Run ALL analyses with a single POST request
            // Backend returns: { yearly_summary, monthly_summary, budget_variance, cash_flow }
            let analysesResult;
            try {
                analysesResult = await api.analyses.runAllAnalyses(sessionId);
                console.log('All analyses result:', analysesResult);
            } catch (err) {
                console.error('Error running all analyses:', err);
                errors.push(`Error al ejecutar análisis: ${err.message}`);
                analysesResult = {};
            }

            // 4. Extract each analysis type from response
            const yearlyData = analysesResult?.yearly_summary || {};
            const monthlyData = analysesResult?.monthly_summary || {};
            const budgetData = analysesResult?.budget_variance || {};
            const cashFlowData = analysesResult?.cash_flow || {};

            // 5. Check for individual analysis errors
            if (!yearlyData || Object.keys(yearlyData).length === 0) {
                errors.push('⚠️ Resumen anual no disponible');
            }
            if (!monthlyData || Object.keys(monthlyData).length === 0) {
                errors.push('⚠️ Resumen mensual no disponible');
            }
            if (!budgetData || Object.keys(budgetData).length === 0) {
                errors.push('⚠️ Variaciones presupuestarias no disponibles');
            }
            if (!cashFlowData || Object.keys(cashFlowData).length === 0) {
                errors.push('⚠️ Flujo de caja no disponible');
            }

            // Log errors if any
            if (errors.length > 0) {
                console.warn('Analysis warnings:', errors);
            }

            // 6. Transform API responses to Dashboard format
            const financialData = {
                sessionId,
                rawData: uploadedData.data,
                analysesRaw: {
                    yearly_summary: yearlyData,
                    monthly_summary: monthlyData,
                    budget_variance: budgetData,
                    cash_flow: cashFlowData
                },
                analysesErrors: errors.length > 0 ? errors : null,
                kpis: transformKPIs(monthlyData, cashFlowData, budgetData, yearlyData),
                charts: {
                    revenue: transformRevenueChart(monthlyData),
                    expenses: transformExpensesChart(budgetData),
                    cashflow: transformCashFlowChart(cashFlowData)
                },
                report: monthlyData?.summary || yearlyData?.summary || null
            };

            // 7. Pass processed data to parent (App.jsx)
            onDataLoaded?.(financialData);

            // 8. Add to recent reports
            const analysesCount = [yearlyData, monthlyData, budgetData, cashFlowData]
                .filter(a => Object.keys(a).length > 0).length;

            const newReport = {
                id: Date.now(),
                fileName: uploadedData.fileName,
                date: new Date().toLocaleDateString('es-ES'),
                rowCount: uploadedData.rowCount,
                status: errors.length > 0 ? 'partial' : 'ready',
                sessionId,
                analysesCount
            };
            setRecentReports(prev => [newReport, ...prev].slice(0, 5));

            // Show warnings if any analyses failed
            if (errors.length > 0 && errors.length < 4) {
                setError(`Análisis completado con advertencias:\n${errors.join('\n')}`);
            }

            // Reset upload state
            setUploadedData(null);
        } catch (err) {
            console.error('Error processing data:', err);
            setError(`Error al procesar los datos: ${err.message}`);
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Transform functions are now imported from utils/dataTransformers
    // hasAnalysisError is imported from utils/analysisHelpers

    const handleCancel = () => {
        setUploadedData(null);
        setError(null);
    };

    return (
        <div className="page">
            <Header
                title="Cargar Datos"
                subtitle="Sube archivos CSV para generar informes y análisis"
            />

            <div className="page-content">
                {/* Upload Section */}
                <section className="upload-section">
                    <div className="section-header">
                        <h2 className="section-title">Subir Archivo CSV</h2>
                        <p className="section-description">
                            Arrastra un archivo CSV con tus datos financieros para generar informes automáticos
                        </p>
                    </div>

                    {error && (
                        <div className="error-message">
                            <span className="error-icon">⚠️</span>
                            <span>{error}</span>
                            <button className="error-dismiss" onClick={() => setError(null)}>✕</button>
                        </div>
                    )}

                    {!uploadedData ? (
                        <CSVUpload
                            onDataLoaded={handleDataLoaded}
                            onError={handleError}
                        />
                    ) : (
                        <DataPreview
                            data={uploadedData.data}
                            fields={uploadedData.fields}
                            rowCount={uploadedData.rowCount}
                            onConfirm={handleConfirm}
                            onCancel={handleCancel}
                        />
                    )}

                    {isAnalyzing && (
                        <div className="analyzing-overlay">
                            <div className="analyzing-content">
                                <div className="analyzing-spinner"></div>
                                <p>Analizando datos con IA...</p>
                            </div>
                        </div>
                    )}
                </section>

                {/* Recent Reports Section */}
                <section className="recent-section">
                    <h2 className="section-title">Informes Recientes</h2>

                    {recentReports.length > 0 ? (
                        <div className="reports-list">
                            {recentReports.map((report) => (
                                <div key={report.id} className="report-item">
                                    <div className="report-item-icon">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                            <polyline points="14,2 14,8 20,8" />
                                        </svg>
                                    </div>
                                    <div className="report-item-info">
                                        <span className="report-item-name">{report.fileName}</span>
                                        <span className="report-item-meta">
                                            {report.date} • {report.rowCount} filas
                                        </span>
                                    </div>
                                    <span className={`report-item-status ${report.status}`}>
                                        {report.status === 'ready' ? '✓ Listo' : 'Procesando...'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-reports">
                            <div className="empty-icon">📄</div>
                            <p>No hay informes recientes</p>
                            <span>Los informes generados aparecerán aquí</span>
                        </div>
                    )}
                </section>

                {/* Instructions Section */}
                <section className="instructions-section">
                    <h2 className="section-title">Formato del CSV</h2>
                    <div className="instructions-grid">
                        <div className="instruction-card">
                            <div className="instruction-icon">📋</div>
                            <h3>Encabezados</h3>
                            <p>La primera fila debe contener los nombres de las columnas</p>
                        </div>
                        <div className="instruction-card">
                            <div className="instruction-icon">📅</div>
                            <h3>Fechas</h3>
                            <p>Usa formato DD/MM/YYYY o YYYY-MM-DD para las fechas</p>
                        </div>
                        <div className="instruction-card">
                            <div className="instruction-icon">💰</div>
                            <h3>Montos</h3>
                            <p>Los valores numéricos sin símbolos de moneda ni separadores de miles</p>
                        </div>
                        <div className="instruction-card">
                            <div className="instruction-icon">📊</div>
                            <h3>Categorías</h3>
                            <p>Incluye columnas de categorización para mejor análisis</p>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default Reports;
