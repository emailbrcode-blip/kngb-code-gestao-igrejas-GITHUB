import { api } from './api';
export async function listGreetingsRequest(worshipId) { const { data } = await api.get('/greetings', { params: worshipId ? { worshipId } : {} }); return data.greetings; }
export async function createGreetingRequest(payload) { const { data } = await api.post('/greetings', payload); return data.greeting; }
export async function updateGreetingRequest(id, payload) { const { data } = await api.patch(`/greetings/${id}`, payload); return data.greeting; }
export async function deleteGreetingRequest(id) { await api.delete(`/greetings/${id}`); }
