import { api } from './api';

export async function listUsersRequest(params = {}) {
  const { data } = await api.get('/users', { params });
  return data.users;
}

export async function createUserRequest(payload) {
  const { data } = await api.post('/users', payload);
  return data.user;
}

export async function updateUserRequest(id, payload) {
  const { data } = await api.patch(`/users/${id}`, payload);
  return data.user;
}

export async function deactivateUserRequest(id) {
  const { data } = await api.delete(`/users/${id}`);
  return data.user;
}
export async function archiveUserRequest(id) { const { data } = await api.post(`/users/${id}/archive`); return data.user; }
export async function deleteUserPermanentlyRequest(id) { await api.delete(`/users/${id}/permanent`); }

export async function listRolesRequest() {
  const { data } = await api.get('/roles');
  return data.roles;
}
