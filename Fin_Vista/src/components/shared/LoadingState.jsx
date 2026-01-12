/**
 * Reusable Loading State Component
 */
const LoadingState = ({ message = 'Cargando datos...' }) => {
    return (
        <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>{message}</p>
        </div>
    );
};

export default LoadingState;
