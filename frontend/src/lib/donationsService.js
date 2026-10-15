import { api } from './api';

export async function listCampaignsRequest() {
  const { data } = await api.get('/donations/campaigns');
  return data.campaigns;
}
export async function createCampaignRequest(payload) {
  const { data } = await api.post('/donations/campaigns', payload);
  return data.campaign;
}
export async function updateCampaignRequest(id, payload) {
  const { data } = await api.patch(`/donations/campaigns/${id}`, payload);
  return data.campaign;
}
export async function deleteCampaignRequest(id) { await api.delete(`/donations/campaigns/${id}`); }
export async function createCampaignItemRequest(campaignId, payload) {
  const { data } = await api.post(`/donations/campaigns/${campaignId}/items`, payload);
  return data.item;
}
export async function listCampaignItemsRequest(campaignId) {
  const { data } = await api.get(`/donations/campaigns/${campaignId}/items`);
  return data.items;
}
export async function listMyDonationsRequest() {
  const { data } = await api.get('/donations/mine');
  return data.donations;
}

export async function listDonationsRequest(params = {}) {
  const { data } = await api.get('/donations', { params });
  return data.donations;
}
export async function listDonationDonorsRequest() {
  const { data } = await api.get('/donations/donors');
  return data.users;
}
export async function createDonationRequest(payload) {
  const { data } = await api.post('/donations', payload);
  return data.donation;
}
export async function updateDonationStatusRequest(id, status) {
  const { data } = await api.patch(`/donations/${id}/status`, { status });
  return data.donation;
}
export async function deleteDonationRequest(id) { await api.delete(`/donations/${id}`); }
export async function sendDonationReminderRequest(id) {
  const { data } = await api.post(`/donations/${id}/remind`);
  return data;
}
export async function listCampaignExpensesRequest(campaignId) { const { data } = await api.get(`/donations/campaigns/${campaignId}/expenses`); return data.expenses; }
export async function createCampaignExpenseRequest(campaignId, payload) { const { data } = await api.post(`/donations/campaigns/${campaignId}/expenses`, payload); return data.expense; }
export async function transferCampaignToFinanceRequest(campaignId, payload) { const { data } = await api.post(`/donations/campaigns/${campaignId}/finance-transfer`, payload); return data; }
