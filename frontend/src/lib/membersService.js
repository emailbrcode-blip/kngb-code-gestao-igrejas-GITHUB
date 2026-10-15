import { api } from './api';

export async function listMembersRequest() {
  const { data } = await api.get('/members');
  return data.members;
}
export async function listMemberLinkableUsersRequest() {
  const { data } = await api.get('/members/linkable-users');
  return data.users;
}
export async function getMemberRequest(id) {
  const { data } = await api.get(`/members/${id}`);
  return data.member;
}
export async function createMemberRequest(payload) {
  const { data } = await api.post('/members', payload);
  return data.member;
}
export async function updateMemberRequest(id, payload) {
  const { data } = await api.patch(`/members/${id}`, payload);
  return data.member;
}
export async function deactivateMemberRequest(id) {
  const { data } = await api.delete(`/members/${id}`);
  return data.member;
}
export async function deleteMemberPermanentlyRequest(id) { await api.delete(`/members/${id}/permanent`); }
export async function getMemberCardPdf(id) {
  return api.get(`/pdf/members/${id}/card`, { responseType: 'blob' });
}
export async function getMemberPdf(id) {
  return api.get(`/pdf/members/${id}`, { responseType: 'blob' });
}
