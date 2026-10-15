import { api } from './api';

export async function listWorshipsRequest() {
  const { data } = await api.get('/worships');
  return data.worships;
}
export async function createWorshipRequest(payload) {
  const { data } = await api.post('/worships', payload);
  return data.worship;
}
export async function updateWorshipRequest(id, payload) {
  const { data } = await api.patch(`/worships/${id}`, payload);
  return data.worship;
}
export async function deleteWorshipRequest(id) {
  await api.delete(`/worships/${id}`);
}
export async function saveSermonRequest(worshipId, payload) {
  const { data } = await api.put(`/worships/${worshipId}/sermon`, payload);
  return data.sermon;
}
export async function addWorshipSongRequest(worshipId, payload) {
  const { data } = await api.post(`/worships/${worshipId}/songs`, payload);
  return data.song;
}
export async function removeWorshipSongRequest(id) {
  await api.delete(`/worships/songs/${id}`);
}
export async function assignReceptionRequest(worshipId, payload) {
  const { data } = await api.post(`/worships/${worshipId}/reception`, payload);
  return data.reception;
}
export async function removeReceptionRequest(id) {
  await api.delete(`/worships/reception/${id}`);
}
export async function assignGreetingRequest(worshipId, payload) {
  const { data } = await api.post(`/worships/${worshipId}/greeting`, payload);
  return data.greeting;
}
export async function removeGreetingRequest(id) {
  await api.delete(`/worships/greeting/${id}`);
}
