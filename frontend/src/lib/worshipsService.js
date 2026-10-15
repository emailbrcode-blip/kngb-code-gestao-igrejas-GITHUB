import { api } from './api';

export async function listWorshipsRequest() {
  const { data } = await api.get('/worships');
  return data.worships;
}
export async function getWorshipRequest(id) {
  const { data } = await api.get(`/worships/${id}`);
  return data.worship;
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
export async function addSongRequest(worshipId, payload) {
  const { data } = await api.post(`/worships/${worshipId}/songs`, payload);
  return data.song;
}
export async function removeSongRequest(worshipId, songId) {
  await api.delete(`/worships/${worshipId}/songs/${songId}`);
}

// Palavra — histórico de pregações com filtros
export async function listSermonsRequest(params = {}) {
  const { data } = await api.get('/worships/sermons', { params });
  return data.sermons;
}

// Recepção / Saudação / qualquer função — não é módulo novo, é uma
// leitura agrupada das designações (ScheduleAssignment) daquela função.
export async function getTeamByFunctionRequest(functionSlug, params = {}) {
  const { data } = await api.get(`/worships/team/${functionSlug}`, { params });
  return data; // { function, schedules }
}
