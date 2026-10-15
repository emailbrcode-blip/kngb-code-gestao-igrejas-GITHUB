import { api } from './api';

export async function getMyAvailabilityRequest() {
  const { data } = await api.get('/availability/me');
  return data.availability;
}
export async function setMyAvailabilityRequest(entries) {
  const { data } = await api.put('/availability/me', { entries });
  return data.availability;
}
export async function getWorkerAvailabilityRequest(workerId) {
  const { data } = await api.get(`/availability/${workerId}`);
  return data.availability;
}
export async function setWorkerAvailabilityRequest(workerId, entries) {
  const { data } = await api.put(`/availability/${workerId}`, { entries });
  return data.availability;
}
export async function getAvailabilityOverviewRequest({ date, startTime, endTime }) {
  const { data } = await api.get('/availability/check', { params: { date, startTime, endTime } });
  return data.availability;
}
export async function getMyAvailabilityExceptionsRequest() {
  const { data } = await api.get('/availability/exceptions/me'); return data.exceptions;
}
export async function createMyAvailabilityExceptionRequest(payload) {
  const { data } = await api.post('/availability/exceptions/me', payload); return data.exception;
}
export async function deactivateMyAvailabilityExceptionRequest(id) {
  const { data } = await api.delete(`/availability/exceptions/me/${id}`); return data.exception;
}
