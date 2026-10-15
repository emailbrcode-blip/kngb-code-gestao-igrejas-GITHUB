import { api } from './api';

// Dashboard Financeiro — todas as chamadas usam a mesma permissão do módulo
// (finance.view), verificada no backend.
export async function getFinanceDashboard(params, signal) {
  return (await api.get('/finance/dashboard', { params, signal })).data;
}
export async function getFinanceTrend(params, signal) {
  return (await api.get('/finance/dashboard/trend', { params, signal })).data;
}
export async function getFinanceMovements(params, signal) {
  return (await api.get('/finance/dashboard/movements', { params, signal })).data;
}
export async function getFinanceReportPreview(params, signal) {
  return (await api.get('/finance/dashboard/report', { params, signal })).data.report;
}
// PDF: baixa via axios (leva o token) e devolve o Blob.
export async function getFinanceReportPdf(params) {
  const { data } = await api.get('/finance/dashboard/report/pdf', { params, responseType: 'blob' });
  return new Blob([data], { type: 'application/pdf' });
}
export function apiErrorMessage(err, fallback = 'Não foi possível carregar os dados.') {
  return err?.response?.data?.error?.message || fallback;
}
