/**
 * Reusable Error State Component
 */
const ErrorState = ({ error, hint }) => {
    return (
        <div className="error-state">
            <p>⚠️ {error}</p>
            {hint && <p className="error-hint">{hint}</p>}
        </div>
    );
};

export default ErrorState;
