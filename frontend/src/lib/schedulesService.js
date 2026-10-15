import { api } from './api';

export async function listSchedulesRequest() {
  const { data } = await api.get('/schedules');
  return data.schedules;
}
export async function getScheduleRequest(id) {
  const { data } = await api.get(`/schedules/${id}`);
  return data.schedule;
}
export async function createScheduleRequest(payload) {
  const { data } = await api.post('/schedules', payload);
  return data.schedule;
}
export async function updateScheduleRequest(id, payload) {
  const { data } = await api.patch(`/schedules/${id}`, payload);
  return data.schedule;
}
export async function deleteScheduleRequest(id) {
  await api.delete(`/schedules/${id}`);
}
export async function addAssignmentRequest(scheduleId, payload) {
  const { data } = await api.post(`/schedules/${scheduleId}/assignments`, payload);
  return data.assignment;
}
export async function removeAssignmentRequest(scheduleId, assignmentId) {
  await api.delete(`/schedules/${scheduleId}/assignments/${assignmentId}`);
}
export async function updateAssignmentStatusRequest(scheduleId, assignmentId, payload) {
  const { data } = await api.patch(`/schedules/${scheduleId}/assignments/${assignmentId}`, payload);
  return data.assignment;
}
export async function confirmAssignmentRequest(scheduleId, assignmentId, status) {
  const { data } = await api.patch(`/schedules/${scheduleId}/assignments/${assignmentId}/confirm`, { status });
  return data.assignment;
}
