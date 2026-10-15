import { api } from './api';

export async function listWorkersRequest(params = {}) {
  const { data } = await api.get('/workers', { params });
  return data.workers;
}
export async function listWorkerLinkableUsersRequest() {
  const { data } = await api.get('/workers/linkable-users');
  return data.users;
}
export async function getWorkerRequest(id) {
  const { data } = await api.get(`/workers/${id}`);
  return data.worker;
}
export async function createWorkerRequest(payload) {
  const { data } = await api.post('/workers', payload);
  return data.worker;
}
export async function updateWorkerRequest(id, payload) {
  const { data } = await api.patch(`/workers/${id}`, payload);
  return data.worker;
}
export async function deactivateWorkerRequest(id) {
  const { data } = await api.delete(`/workers/${id}`);
  return data.worker;
}
export async function archiveWorkerRequest(id) { const { data } = await api.post(`/workers/${id}/archive`); return data.worker; }
export async function deleteWorkerPermanentlyRequest(id) { await api.delete(`/workers/${id}/permanent`); }
export async function listWorkerFunctionsRequest() {
  const { data } = await api.get('/workers/functions');
  return data.functions;
}
export async function createWorkerFunctionRequest(payload) {
  const { data } = await api.post('/workers/functions', payload);
  return data.function;
}
export async function deleteWorkerFunctionRequest(id) {
  await api.delete(`/workers/functions/${id}`);
}

export async function getWorkerCardPdf(id) {
  return api.get(`/pdf/workers/${id}/card`, { responseType: 'blob' });
}
