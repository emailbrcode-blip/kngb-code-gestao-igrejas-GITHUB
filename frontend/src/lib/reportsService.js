import { api } from './api';

export async function getMembersReportRequest() {
  const { data } = await api.get('/reports/members');
  return data.report;
}
export async function getBirthdaysReportRequest(month) {
  const { data } = await api.get('/reports/birthdays', { params: { month } });
  return data.report;
}
export async function getWorkerParticipationReportRequest(params = {}) {
  const { data } = await api.get('/reports/worker-participation', { params });
  return data.report;
}
export async function getFinancialReportRequest(params = {}) {
  const { data } = await api.get('/reports/financial', { params });
  return data.report;
}
export async function getDonationsReportRequest(params = {}) {
  const { data } = await api.get('/reports/donations', { params });
  return data.report;
}
export async function getSchedulesReportRequest(params = {}) {
  const { data } = await api.get('/reports/schedules', { params });
  return data.report;
}

// PDF: baixa via axios (pra carregar o token de auth no header) e
// dispara o download no navegador a partir do blob recebido.
export async function downloadPdf(path, filename) {
  const { data } = await api.get(path, { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
