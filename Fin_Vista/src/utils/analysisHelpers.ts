/**
 * Shared helper functions for analysis operations
 */

/**
 * Check if an analysis object has an error
 */
export const hasAnalysisError = (analysis: any): boolean => {
    return analysis?.error !== undefined;
};

/**
 * Get status badge configuration for a given status
 */
export const getStatusBadge = (status: string): { icon: string; text: string; class: string } => {
    switch (status) {
        case 'calculated':
            return { icon: '✅', text: 'Calculado', class: 'status-calculated' };
        case 'estimated':
            return { icon: '🟡', text: 'Estimado', class: 'status-estimated' };
        case 'pending':
            return { icon: '⏳', text: 'Pendiente', class: 'status-pending' };
        default:
            return { icon: '❌', text: 'No disponible', class: 'status-unavailable' };
    }
};
