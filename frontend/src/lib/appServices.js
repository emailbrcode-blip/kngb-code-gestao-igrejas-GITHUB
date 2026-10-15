import { api } from './api';

// --- Eventos ---
export async function listEventsRequest() {
  const { data } = await api.get('/events');
  return data.events;
}
export async function createEventRequest(payload) {
  const { data } = await api.post('/events', payload);
  return data.event;
}
export async function updateEventRequest(id, payload) {
  const { data } = await api.patch(`/events/${id}`, payload);
  return data.event;
}
export async function deleteEventRequest(id) {
  await api.delete(`/events/${id}`);
}

// --- Avisos ---
export async function listAnnouncementsRequest() {
  const { data } = await api.get('/announcements');
  return data.announcements;
}
export async function createAnnouncementRequest(payload) {
  const { data } = await api.post('/announcements', payload);
  return data.announcement;
}
export async function updateAnnouncementRequest(id, payload) {
  const { data } = await api.patch(`/announcements/${id}`, payload);
  return data.announcement;
}
export async function archiveAnnouncementRequest(id) {
  const { data } = await api.patch(`/announcements/${id}/archive`);
  return data.announcement;
}
export async function deleteAnnouncementRequest(id) { await api.delete(`/announcements/${id}`); }

// --- Financeiro ---
export async function getFinanceSummaryRequest() {
  const { data } = await api.get('/finance/summary');
  return data.summary;
}
export async function listFinanceEntriesRequest(params = {}) {
  const { data } = await api.get('/finance/entries', { params });
  return data.entries;
}
export async function createFinanceEntryRequest(payload) {
  const { data } = await api.post('/finance/entries', payload);
  return data.entry;
}
export async function updateFinanceEntryRequest(id, payload) {
  const { data } = await api.patch(`/finance/entries/${id}`, payload);
  return data.entry;
}
export async function deleteFinanceEntryRequest(id) {
  await api.delete(`/finance/entries/${id}`);
}
export async function listFinanceCategoriesRequest() {
  const { data } = await api.get('/finance/categories');
  return data.categories;
}

// --- Notificações ---
export async function listNotificationsRequest() {
  const { data } = await api.get('/notifications');
  return data; // { notifications, unreadCount }
}
export async function markNotificationReadRequest(id) {
  const { data } = await api.patch(`/notifications/${id}/read`);
  return data.notification;
}
export async function markAllNotificationsReadRequest() {
  await api.patch('/notifications/read-all');
}
export async function deleteNotificationRequest(id) { await api.delete(`/notifications/${id}`); }

// --- Dashboard ---
export async function getDashboardSummaryRequest() {
  const { data } = await api.get('/dashboard/summary');
  return data.summary;
}
