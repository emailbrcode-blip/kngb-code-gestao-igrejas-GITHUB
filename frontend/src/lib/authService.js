import { api } from './api';

export async function loginRequest({ email, password }) {
  const { data } = await api.post('/auth/login', { email, password });
  return data; // { accessToken, refreshToken, user }
}

export async function fetchCurrentUser() {
  const { data } = await api.get('/auth/me');
  return data.user;
}

export async function logoutRequest(refreshToken) {
  await api.post('/auth/logout', { refreshToken });
}
