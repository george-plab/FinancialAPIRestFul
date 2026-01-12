import './DataPreview.css';

const DataPreview = ({ data, fields, rowCount, onConfirm, onCancel }) => {
    // Show only first 10 rows for preview
    const previewData = data?.slice(0, 10) || [];
    const displayFields = fields?.slice(0, 8) || []; // Limit visible columns

    return (
        <div className="data-preview">
            <div className="preview-header">
                <div className="preview-info">
                    <h3 className="preview-title">Vista Previa de Datos</h3>
                    <span className="preview-count">
                        {rowCount} filas • {fields?.length} columnas
                    </span>
                </div>
                <div className="preview-actions">
                    <button className="btn-cancel" onClick={onCancel}>
                        Cancelar
                    </button>
                    <button className="btn-confirm" onClick={onConfirm}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20,6 9,17 4,12" />
                        </svg>
                        Confirmar y Analizar
                    </button>
                </div>
            </div>

            <div className="table-container">
                <table className="preview-table">
                    <thead>
                        <tr>
                            <th className="row-number">#</th>
                            {displayFields.map((field, index) => (
                                <th key={index}>{field}</th>
                            ))}
                            {fields?.length > 8 && <th className="more-cols">+{fields.length - 8}</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {previewData.map((row, rowIndex) => (
                            <tr key={rowIndex}>
                                <td className="row-number">{rowIndex + 1}</td>
                                {displayFields.map((field, colIndex) => (
                                    <td key={colIndex} title={row[field]}>
                                        {formatCellValue(row[field])}
                                    </td>
                                ))}
                                {fields?.length > 8 && <td className="more-cols">...</td>}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {rowCount > 10 && (
                <div className="preview-footer">
                    <span className="footer-note">
                        Mostrando 10 de {rowCount} filas
                    </span>
                </div>
            )}
        </div>
    );
};

// Helper function to format cell values
const formatCellValue = (value) => {
    if (value === null || value === undefined || value === '') {
        return <span className="empty-cell">—</span>;
    }

    // Check if it's a number
    const num = parseFloat(value);
    if (!isNaN(num) && isFinite(num)) {
        // Format as currency if it looks like money
        if (Math.abs(num) >= 1000) {
            return num.toLocaleString('es-ES', { maximumFractionDigits: 2 });
        }
        return num.toLocaleString('es-ES');
    }

    // Truncate long strings
    const strValue = String(value);
    if (strValue.length > 30) {
        return strValue.substring(0, 30) + '...';
    }

    return strValue;
};

export default DataPreview;
