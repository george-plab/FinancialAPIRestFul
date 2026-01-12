import { useState, useRef } from 'react';
import Papa from 'papaparse';
import './CSVUpload.css';

const CSVUpload = ({ onDataLoaded, onError }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [fileName, setFileName] = useState(null);
    const fileInputRef = useRef(null);

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            processFile(files[0]);
        }
    };

    const handleFileSelect = (e) => {
        const files = e.target.files;
        if (files.length > 0) {
            processFile(files[0]);
        }
    };

    const processFile = (file) => {
        // Validate file type
        if (!file.name.endsWith('.csv')) {
            onError?.('Por favor, selecciona un archivo CSV válido');
            return;
        }

        setIsProcessing(true);
        setFileName(file.name);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                setIsProcessing(false);

                if (results.errors.length > 0) {
                    console.warn('CSV parsing warnings:', results.errors);
                }

                if (results.data && results.data.length > 0) {
                    onDataLoaded?.({
                        file: file,
                        data: results.data,
                        fields: results.meta.fields,
                        fileName: file.name,
                        rowCount: results.data.length
                    });
                } else {
                    onError?.('El archivo CSV está vacío o no tiene datos válidos');
                }
            },
            error: (error) => {
                setIsProcessing(false);
                onError?.(`Error al procesar el archivo: ${error.message}`);
            }
        });
    };

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    const handleRemove = () => {
        setFileName(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="csv-upload">
            <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="file-input-hidden"
            />

            {!fileName ? (
                <div
                    className={`upload-zone ${isDragging ? 'dragging' : ''} ${isProcessing ? 'processing' : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={handleClick}
                >
                    <div className="upload-icon">
                        {isProcessing ? (
                            <div className="spinner"></div>
                        ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="17,8 12,3 7,8" />
                                <line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                        )}
                    </div>

                    <div className="upload-text">
                        <p className="upload-title">
                            {isProcessing ? 'Procesando archivo...' : 'Arrastra tu archivo CSV aquí'}
                        </p>
                        <p className="upload-subtitle">
                            {isProcessing ? 'Por favor espera' : 'o haz clic para seleccionar'}
                        </p>
                    </div>

                    <div className="upload-hint">
                        <span className="hint-icon">ℹ️</span>
                        <span>Formatos soportados: CSV con encabezados</span>
                    </div>
                </div>
            ) : (
                <div className="file-loaded">
                    <div className="file-info">
                        <div className="file-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14,2 14,8 20,8" />
                            </svg>
                        </div>
                        <div className="file-details">
                            <span className="file-name">{fileName}</span>
                            <span className="file-status">✓ Archivo cargado correctamente</span>
                        </div>
                    </div>
                    <button className="remove-btn" onClick={handleRemove} title="Eliminar archivo">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>
            )}
        </div>
    );
};

export default CSVUpload;
