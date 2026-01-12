/**
 * Data transformation utilities for API responses
 * Extracted from Reports.jsx to enable reusability
 */

import { hasAnalysisError } from './analysisHelpers';

/**
 * Transform API analyses to KPI format
 */
export const transformKPIs = (monthly: any, cashflow: any, budget: any, yearly: any = {}) => {
    // Handle partial errors - skip analyses with errors
    const monthlyOk = monthly && !hasAnalysisError(monthly);
    const yearlyOk = yearly && !hasAnalysisError(yearly);
    const cashflowOk = cashflow && !hasAnalysisError(cashflow);
    const budgetOk = budget && !hasAnalysisError(budget);

    // Ingresos: monthly_summary.totals.income OR yearly_summary.total_income
    const totalIngresos =
        (monthlyOk ? monthly?.totals?.income : null) ||
        (yearlyOk ? yearly?.total_income : null) ||
        null;

    // Gastos: monthly_summary.totals.expenses OR yearly_summary.total_expenses
    const totalGastos =
        (monthlyOk ? monthly?.totals?.expenses : null) ||
        (yearlyOk ? yearly?.total_expenses : null) ||
        null;

    // Beneficio Neto: monthly_summary.totals.net OR yearly_summary.net_result
    const beneficioNeto =
        (monthlyOk ? monthly?.totals?.net : null) ||
        (yearlyOk ? yearly?.net_result : null) ||
        (totalIngresos && totalGastos ? totalIngresos - totalGastos : null);

    // Flujo de Caja: cash_flow.final_balance
    const flujoCaja = cashflowOk ? cashflow?.final_balance : null;

    // Calculate percentage changes if we have budget variance data
    let revenueChange = null;
    let expensesChange = null;
    if (budgetOk && budget?.by_category) {
        // Sum up variance percentages (simplified)
        const totalVariance = budget.total_variance || 0;
        revenueChange = totalVariance;
    }

    return {
        revenue: totalIngresos,
        revenueChange: revenueChange,
        expenses: totalGastos,
        expensesChange: expensesChange,
        profit: beneficioNeto,
        profitChange: null,
        cashflow: flujoCaja,
        cashflowChange: null
    };
};

/**
 * Transform monthly summary to revenue chart data
 */
export const transformRevenueChart = (monthly: any) => {
    // Transform monthly summary to revenue chart data
    // Uses: monthly_summary.months[].income
    if (hasAnalysisError(monthly) || !monthly?.months) {
        return { labels: [], values: [] };
    }

    // Filter out entries with invalid (negative, null, undefined) income values
    const validData = monthly.months.filter((m: any) => {
        const income = m.income;
        return income !== null && income !== undefined && income >= 0 && !isNaN(income);
    });

    return {
        labels: validData.map((m: any) => m.month || ''),
        values: validData.map((m: any) => m.income)
    };
};

/**
 * Transform budget variance to expenses chart data
 */
export const transformExpensesChart = (budget: any) => {
    // Transform budget variance to expenses chart data
    // Uses: budget_variance.by_category[].actual
    if (hasAnalysisError(budget) || !budget?.by_category) {
        return { labels: [], values: [] };
    }
    return {
        labels: budget.by_category.map((c: any) => c.category || ''),
        values: budget.by_category.map((c: any) => c.actual || 0)
    };
};

/**
 * Transform cash flow data for doughnut chart
 */
export const transformCashFlowChart = (cashflow: any) => {
    // Transform cash flow data for doughnut chart
    // Uses: cash_flow.periods[].inflow and outflow
    if (hasAnalysisError(cashflow) || !cashflow?.periods) {
        return { labels: ['Ingresos', 'Gastos'], values: [0, 0] };
    }

    // Sum all inflows and outflows
    const totalInflow = cashflow.periods.reduce((sum: number, p: any) => sum + (p.inflow || 0), 0);
    const totalOutflow = cashflow.periods.reduce((sum: number, p: any) => sum + (p.outflow || 0), 0);

    return {
        labels: ['Ingresos', 'Gastos'],
        values: [totalInflow, totalOutflow]
    };
};
