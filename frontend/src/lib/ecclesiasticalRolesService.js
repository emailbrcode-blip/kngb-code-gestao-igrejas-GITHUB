import { api } from './api';

export async function listEcclesiasticalRolesRequest() {
  const { data } = await api.get('/ecclesiastical-roles');
  return data.roles;
}
export async function createEcclesiasticalRoleRequest(payload) {
  const { data } = await api.post('/ecclesiastical-roles', payload);
  return data.role;
}
export async function setEcclesiasticalRoleStatusRequest(id, status) {
  const { data } = await api.patch(`/ecclesiastical-roles/${id}/status`, { status });
  return data.role;
}
export async function deleteEcclesiasticalRoleRequest(id) { await api.delete(`/ecclesiastical-roles/${id}`); }

export async function getMemberEcclesiasticalHistoryRequest(memberId) {
  const { data } = await api.get(`/members/${memberId}/ecclesiastical-roles`);
  return data.history;
}
export async function assignEcclesiasticalRoleToMemberRequest(memberId, payload) {
  const { data } = await api.post(`/members/${memberId}/ecclesiastical-roles`, payload);
  return data.entry;
}
