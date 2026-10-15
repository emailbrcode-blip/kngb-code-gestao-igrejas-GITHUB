import { api } from './api';
import { useAuthStore } from '../store/authStore';

export async function listVisitorSchedulesRequest() {
  const { data } = await api.get('/visitors/schedules');
  return data.schedules;
}

export async function getScheduleVisitorsRequest(scheduleId) {
  const { data } = await api.get(`/visitors/schedules/${scheduleId}`);
  return data;
}

export async function createScheduleVisitorRequest(scheduleId, payload) {
  const { data } = await api.post(`/visitors/schedules/${scheduleId}`, payload);
  return data.visitor;
}

export async function listVisitorEventsRequest() {
  const { data } = await api.get('/visitors/events');
  return data.events;
}

export async function getEventVisitorsRequest(eventId) {
  const { data } = await api.get(`/visitors/events/${eventId}`);
  return data;
}

export async function createEventVisitorRequest(eventId, payload) {
  const { data } = await api.post(`/visitors/events/${eventId}`, payload);
  return data.visitor;
}

export async function streamScheduleVisitors(scheduleId, onVisitor, signal) {
  let accessToken = useAuthStore.getState().accessToken;
  let response = await fetch(`${api.defaults.baseURL}/visitors/schedules/${encodeURIComponent(scheduleId)}/stream`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'text/event-stream' },
    signal,
  });
  if (response.status === 401) {
    await api.get('/notifications'); // usa o refresh token já configurado no cliente Axios
    accessToken = useAuthStore.getState().accessToken;
    response = await fetch(`${api.defaults.baseURL}/visitors/schedules/${encodeURIComponent(scheduleId)}/stream`, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'text/event-stream' },
      signal,
    });
  }
  if (!response.ok || !response.body) throw new Error('Não foi possível conectar à lista em tempo real.');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (!signal.aborted) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
    let boundary;
    while ((boundary = buffer.indexOf('\n\n')) >= 0) {
      const message = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const dataLine = message.split('\n').find((line) => line.startsWith('data:'));
      if (dataLine) {
        try { onVisitor(JSON.parse(dataLine.slice(5).trim())); } catch { /* ignora evento incompleto */ }
      }
    }
  }
}
