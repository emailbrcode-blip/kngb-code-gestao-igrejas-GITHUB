import axios from 'axios';
import { useAuthStore } from '../store/authStore';

// URL da API desta instalação, definida em VITE_API_URL (.env). Sem valor,
// usa '/api' (proxy do Vite em desenvolvimento ou proxy reverso em produção).
const baseURL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

export const api = axios.create({ baseURL });

// Injeta o access token em toda requisição
api.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

// Fila para evitar múltiplas chamadas simultâneas de /auth/refresh
let isRefreshing = false;
let pendingQueue = [];

function resolveQueue(error, token) {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });

  pendingQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    const isAuthRoute =
      originalRequest?.url?.includes('/auth/login') ||
      originalRequest?.url?.includes('/auth/refresh');

    if (status === 401 && !originalRequest._retry && !isAuthRoute) {
      const { refreshToken, updateTokens, clearSession } =
        useAuthStore.getState();

      if (!refreshToken) {
        clearSession();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({ resolve, reject });
        }).then((newAccessToken) => {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(
          `${baseURL}/auth/refresh`,
          { refreshToken }
        );

        updateTokens({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken
        });

        resolveQueue(null, data.accessToken);

        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;

        return api(originalRequest);
      } catch (refreshError) {
        resolveQueue(refreshError, null);
        clearSession();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
