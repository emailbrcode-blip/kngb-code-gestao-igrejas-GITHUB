import { api } from './api';
export async function listReceptionsRequest(worshipId) { const { data } = await api.get('/receptions', { params: worshipId ? { worshipId } : {} }); return data.receptions; }
export async function createReceptionRequest(payload) { const { data } = await api.post('/receptions', payload); return data.reception; }
export async function updateReceptionRequest(id, payload) { const { data } = await api.patch(`/receptions/${id}`, payload); return data.reception; }
export async function deleteReceptionRequest(id) { await api.delete(`/receptions/${id}`); }
