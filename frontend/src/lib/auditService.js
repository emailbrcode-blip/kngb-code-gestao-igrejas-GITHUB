import { api } from './api';
export async function listAuditLogsRequest(params = {}) { const { data } = await api.get('/audit', { params }); return data; }
