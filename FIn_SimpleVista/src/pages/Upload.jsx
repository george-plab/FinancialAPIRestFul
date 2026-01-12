import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Info, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import Header from '../components/Header';
import './Upload.css';

// Financial data detection heuristics
const FINANCIAL_COLUMNS = {
    amount: ['importe', 'monto', 'amount', 'valor', 'total', 'precio', 'debe', 'haber', 'ingresos', 'gastos'],
    date: ['fecha', 'date', 'periodo', 'mes', 'año', 'year', 'month'],
    category: ['categoria', 'category', 'concepto', 'descripcion', 'tipo', 'nombre'],
    yearPattern: /^a?\d{4}$/ // matches "2024", "a2024", etc.
};

export default function UploadData() {
    const navigate = useNavigate();
    const [dragOver, setDragOver] = useState(false);
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [error, setError] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [formatInfo, setFormatInfo] = useState(null);
    const [validationResult, setValidationResult] = useState(null);
    const [recentUploads, setRecentUploads] = useState([]);

    // Load format info from /api/tools
    useEffect(() => {
        loadFormatInfo();
        loadRecentUploads();
    }, []);

    const loadFormatInfo = async () => {
        try {
            const response = await fetch('http://localhost:8000/api/tools');
            if (response.ok) {
                const tools = await response.json();
                setFormatInfo(tools);
            }
        } catch (err) {
            console.log('Could not load format info');
        }
    };

    const loadRecentUploads = async () => {
        try {
            const response = await fetch('http://localhost:8000/api/csvs');
            if (response.ok) {
                const uploads = await response.json();
                setRecentUploads(Array.isArray(uploads) ? uploads : []);
            }
        } catch (err) {
            console.log('Could not load recent uploads');
        }
    };

    // Validate if data is financial
    const validateFinancialData = (data, headers) => {
        const results = {
            isFinancial: false,
            confidence: 0,
            warnings: [],
            suggestions: [],
            detectedFormat: null
        };

        const lowerHeaders = headers.map(h => h.toLowerCase().trim());

        // Check for amount columns
        const hasAmountColumn = FINANCIAL_COLUMNS.amount.some(col =>
            lowerHeaders.some(h => h.includes(col))
        );

        // Check for date columns
        const hasDateColumn = FINANCIAL_COLUMNS.date.some(col =>
            lowerHeaders.some(h => h.includes(col))
        );

        // Check for category columns
        const hasCategoryColumn = FINANCIAL_COLUMNS.category.some(col =>
            lowerHeaders.some(h => h.includes(col))
        );

        // Check for year columns (wide format like a2024, a2023)
        const yearColumns = headers.filter(h => FINANCIAL_COLUMNS.yearPattern.test(h.trim()));
        const hasYearColumns = yearColumns.length >= 2;

        // Check for numeric content
        let numericCount = 0;
        if (data.length > 0) {
            const firstRow = data[0];
            Object.values(firstRow).forEach(val => {
                const numVal = parseFloat(String(val).replace(/[,\s€$]/g, ''));
                if (!isNaN(numVal)) numericCount++;
            });
        }
        const hasNumbers = numericCount >= 2;

        // Calculate confidence
        let confidence = 0;
        if (hasAmountColumn) confidence += 30;
        if (hasDateColumn) confidence += 20;
        if (hasCategoryColumn) confidence += 15;
        if (hasYearColumns) confidence += 25;
        if (hasNumbers) confidence += 10;

        results.confidence = Math.min(100, confidence);
        results.isFinancial = confidence >= 40;

        // Detect format type
        if (hasYearColumns) {
            results.detectedFormat = 'wide';
            results.suggestions.push({
                type: 'unpivot',
                message: 'Formato ancho detectado (años en columnas). Se convertirá a formato largo.',
                yearColumns
            });
        } else if (hasDateColumn && hasAmountColumn) {
            results.detectedFormat = 'transactional';
        } else if (hasCategoryColumn && hasAmountColumn) {
            results.detectedFormat = 'budget';
        }

        // Check for debe/haber pattern
        const hasDebeHaber = lowerHeaders.some(h => h.includes('debe')) &&
            lowerHeaders.some(h => h.includes('haber'));
        if (hasDebeHaber && !hasAmountColumn) {
            results.suggestions.push({
                type: 'calculate_amount',
                message: 'Se detectó debe/haber. Se calculará el monto como: debe - haber'
            });
        }

        // Warnings
        if (!results.isFinancial) {
            results.warnings.push('No se detectaron columnas financieras típicas');
        }
        if (!hasNumbers) {
            results.warnings.push('No se detectaron suficientes valores numéricos');
        }

        return results;
    };

    // Convert Excel to CSV
    const excelToCSV = async (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const workbook = XLSX.read(e.target.result, { type: 'binary' });
                    const sheetName = workbook.SheetNames[0];
                    const sheet = workbook.Sheets[sheetName];
                    const csv = XLSX.utils.sheet_to_csv(sheet);

                    // Also get JSON for preview
                    const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                    const headers = json[0] || [];
                    const data = json.slice(1).map(row => {
                        const obj = {};
                        headers.forEach((h, i) => obj[h] = row[i]);
                        return obj;
                    });

                    resolve({ csv, headers, data });
                } catch (err) {
                    reject(new Error('Error al procesar el archivo Excel'));
                }
            };
            reader.onerror = () => reject(new Error('Error al leer el archivo'));
            reader.readAsBinaryString(file);
        });
    };

    // Parse CSV
    const parseCSV = async (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const text = e.target.result;
                    const lines = text.split('\n').filter(l => l.trim());
                    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
                    const data = lines.slice(1).map(line => {
                        const values = line.split(',');
                        const obj = {};
                        headers.forEach((h, i) => obj[h] = values[i]?.trim().replace(/^"|"$/g, '') || '');
                        return obj;
                    });
                    resolve({ csv: text, headers, data });
                } catch (err) {
                    reject(new Error('Error al procesar el archivo CSV'));
                }
            };
            reader.onerror = () => reject(new Error('Error al leer el archivo'));
            reader.readAsText(file);
        });
    };

    // Handle file processing
    const processFile = async (selectedFile) => {
        setError(null);
        setPreview(null);
        setValidationResult(null);

        const ext = selectedFile.name.split('.').pop().toLowerCase();

        // Validate file type
        if (!['csv', 'xlsx', 'xls'].includes(ext)) {
            setError({
                type: 'invalid_format',
                message: 'Formato no soportado. Solo se aceptan archivos .csv, .xlsx o .xls'
            });
            return;
        }

        try {
            let result;
            if (ext === 'csv') {
                result = await parseCSV(selectedFile);
            } else {
                result = await excelToCSV(selectedFile);
            }

            // Validate financial content
            const validation = validateFinancialData(result.data, result.headers);
            setValidationResult(validation);

            if (!validation.isFinancial && validation.confidence < 30) {
                setError({
                    type: 'not_financial',
                    message: 'Este archivo no parece contener datos financieros.',
                    details: validation.warnings
                });
                return;
            }

            setFile(selectedFile);
            setPreview({
                filename: selectedFile.name,
                headers: result.headers,
                rows: result.data.slice(0, 5),
                totalRows: result.data.length,
                csvData: result.csv
            });

        } catch (err) {
            setError({
                type: 'processing_error',
                message: err.message
            });
        }
    };

    // Drag and drop handlers
    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        setDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        setDragOver(false);
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setDragOver(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) {
            processFile(droppedFile);
        }
    }, []);

    const handleFileSelect = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            processFile(selectedFile);
        }
    };

    // Upload to backend
    const handleUpload = async () => {
        if (!preview) return;

        setUploading(true);
        setError(null);

        try {
            const sessionId = `session_${Date.now()}`;

            // Create FormData with CSV
            const formData = new FormData();
            const csvBlob = new Blob([preview.csvData], { type: 'text/csv' });
            formData.append('file', csvBlob, file?.name?.replace(/\.(xlsx|xls)$/, '.csv') || 'data.csv');

            // Upload CSV
            const uploadResponse = await fetch(`http://localhost:8000/api/csvs?session_id=${sessionId}`, {
                method: 'POST',
                body: formData
            });

            if (!uploadResponse.ok) {
                throw new Error('Error al subir el archivo');
            }

            // Run all analyses
            const analysisResponse = await fetch(`http://localhost:8000/api/analyses?session_id=${sessionId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ analysis_type: 'all' })
            });

            if (!analysisResponse.ok) {
                console.warn('Analysis may not have completed fully');
            }

            // Store session ID for Dashboard to use
            localStorage.setItem('currentSessionId', sessionId);

            // Navigate to dashboard
            navigate('/');

        } catch (err) {
            setError({
                type: 'upload_error',
                message: err.message
            });
        } finally {
            setUploading(false);
        }
    };

    const clearFile = () => {
        setFile(null);
        setPreview(null);
        setError(null);
        setValidationResult(null);
    };

    return (
        <div className="upload-page">
            <Header
                title="Cargar Datos"
                subtitle="Sube archivos CSV para generar informes y análisis"
            />

            {/* Upload Zone */}
            <div
                className={`upload-zone ${dragOver ? 'dragover' : ''} ${preview ? 'has-file' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !preview && document.getElementById('file-input').click()}
            >
                <input
                    id="file-input"
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                />

                {!preview ? (
                    <>
                        <Upload size={48} className="upload-icon" />
                        <h3>Arrastra tu archivo CSV aquí</h3>
                        <p>o haz clic para seleccionar</p>
                        <div className="format-hint">
                            <CheckCircle size={14} />
                            Formatos soportados: CSV con encabezados
                        </div>
                    </>
                ) : (
                    <div className="file-preview">
                        <div className="file-header">
                            <FileSpreadsheet size={24} />
                            <div className="file-info">
                                <span className="file-name">{preview.filename}</span>
                                <span className="file-meta">{preview.totalRows} filas • {preview.headers.length} columnas</span>
                            </div>
                            <button className="clear-btn" onClick={clearFile}>
                                <X size={20} />
                            </button>
                        </div>

                        {validationResult && (
                            <div className={`validation-result ${validationResult.isFinancial ? 'valid' : 'warning'}`}>
                                <div className="validation-header">
                                    {validationResult.isFinancial ? (
                                        <CheckCircle size={16} />
                                    ) : (
                                        <AlertCircle size={16} />
                                    )}
                                    <span>
                                        Confianza: {validationResult.confidence}% -
                                        {validationResult.detectedFormat === 'wide' ? ' Formato ancho (años en columnas)' :
                                            validationResult.detectedFormat === 'transactional' ? ' Formato transaccional' :
                                                validationResult.detectedFormat === 'budget' ? ' Formato presupuesto' : ' Formato detectado'}
                                    </span>
                                </div>
                                {validationResult.suggestions.map((s, i) => (
                                    <div key={i} className="suggestion">
                                        <Info size={14} />
                                        {s.message}
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="preview-table-wrapper">
                            <table className="preview-table">
                                <thead>
                                    <tr>
                                        {preview.headers.slice(0, 6).map((h, i) => (
                                            <th key={i}>{h}</th>
                                        ))}
                                        {preview.headers.length > 6 && <th>...</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {preview.rows.slice(0, 3).map((row, i) => (
                                        <tr key={i}>
                                            {preview.headers.slice(0, 6).map((h, j) => (
                                                <td key={j}>{row[h] || '-'}</td>
                                            ))}
                                            {preview.headers.length > 6 && <td>...</td>}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <button
                            className="btn btn-primary upload-btn"
                            onClick={handleUpload}
                            disabled={uploading}
                        >
                            {uploading ? 'Subiendo...' : 'Subir y Analizar'}
                        </button>
                    </div>
                )}
            </div>

            {/* Error Display */}
            {error && (
                <div className="error-banner">
                    <AlertCircle size={20} />
                    <div className="error-content">
                        <strong>{error.message}</strong>
                        {error.details && (
                            <ul>
                                {error.details.map((d, i) => <li key={i}>{d}</li>)}
                            </ul>
                        )}
                    </div>
                    <button onClick={() => setError(null)}>
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Format Info */}
            {formatInfo && (
                <section className="format-info-section">
                    <div className="section-header">
                        <span className="section-indicator"></span>
                        <h2>Formatos Aceptados</h2>
                    </div>

                    <div className="format-cards">
                        {formatInfo.tools?.map((tool, i) => (
                            <div key={i} className="format-card">
                                <h4>{tool.name.replace('_', ' ')}</h4>
                                <p>{tool.description}</p>
                                <div className="required-columns">
                                    <span className="label">Columnas requeridas:</span>
                                    <div className="columns-list">
                                        {tool.required_columns.map((col, j) => (
                                            <span key={j} className="column-tag">{col}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Recent Uploads */}
            <section>
                <div className="section-header">
                    <span className="section-indicator"></span>
                    <h2>Informes Recientes</h2>
                </div>

                {recentUploads.length === 0 ? (
                    <div className="empty-state">
                        <FileSpreadsheet size={48} />
                        <h3>No hay informes recientes</h3>
                        <p>Los informes generados aparecerán aquí</p>
                    </div>
                ) : (
                    <div className="recent-list">
                        {recentUploads.map((upload, i) => (
                            <div key={i} className="recent-item">
                                <FileSpreadsheet size={20} />
                                <span>{upload.filename || upload.session_id}</span>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
