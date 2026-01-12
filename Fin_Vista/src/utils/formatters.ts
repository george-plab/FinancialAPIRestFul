/**
 * Shared formatting utilities for financial data
 */

/**
 * Format a number as currency (EUR)
 */
export const formatCurrency = (value: number | null | undefined): string => {
    if (value == null) return '--';
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR'
    }).format(value);
};

/**
 * Format a number as percentage
 */
export const formatPercent = (value: number | null | undefined): string => {
    if (value == null) return '--';
    return `${value > 0 ? '+' : ''}${(value * 100).toFixed(1)}%`;
};

/**
 * Format a number as ratio (e.g., 1.5x)
 */
export const formatRatio = (value: number | null | undefined): string => {
    if (value == null) return '--';
    return `${value.toFixed(2)}x`;
};
