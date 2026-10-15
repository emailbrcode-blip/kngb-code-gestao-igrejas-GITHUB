import { create } from 'zustand';

const STORAGE_KEY = 'brcode-igrejas:session';

function loadPersistedSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persistSession(session) {
  if (session) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

const persisted = loadPersistedSession();

// Store única de sessão. accessToken/refreshToken ficam em localStorage
// para sobreviver a um F5 — o ideal a longo prazo seria refresh token em
// cookie httpOnly, mas isso exigiria mudar o contrato do backend, o que
// não foi pedido nesta fase.
export const useAuthStore = create((set, get) => ({
  user: persisted?.user ?? null,
  accessToken: persisted?.accessToken ?? null,
  refreshToken: persisted?.refreshToken ?? null,
  isHydrating: true,

  setSession: ({ user, accessToken, refreshToken }) => {
    const session = { user, accessToken, refreshToken };
    persistSession(session);
    set({ user, accessToken, refreshToken, isHydrating: false });
  },

  updateTokens: ({ accessToken, refreshToken }) => {
    const current = get();
    const session = { user: current.user, accessToken, refreshToken };
    persistSession(session);
    set({ accessToken, refreshToken });
  },

  clearSession: () => {
    persistSession(null);
    set({ user: null, accessToken: null, refreshToken: null, isHydrating: false });
  },

  setHydrating: (value) => set({ isHydrating: value }),

  hasPermission: (permissionSlug) => {
    const { user } = get();
    return Boolean(user?.permissions?.includes(permissionSlug));
  },
}));
