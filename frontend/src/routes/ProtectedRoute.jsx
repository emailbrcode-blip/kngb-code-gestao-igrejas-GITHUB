import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { fetchCurrentUser } from '../lib/authService';

export function ProtectedRoute() {
  const { user, accessToken, refreshToken, setSession, clearSession } = useAuthStore();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function hydrate() {
      // Já temos usuário em memória/persistido — nada a fazer.
      if (user) {
        if (isMounted) setChecking(false);
        return;
      }

      // Sem nenhum token, não há sessão possível.
      if (!accessToken && !refreshToken) {
        if (isMounted) setChecking(false);
        return;
      }

      // Temos token(s) mas não o usuário (ex: refresh da página) —
      // confirma a sessão junto ao backend. Se o access token expirou,
      // o interceptor do axios cuida de renová-lo automaticamente.
      try {
        const freshUser = await fetchCurrentUser();
        if (isMounted) {
          setSession({ user: freshUser, accessToken, refreshToken });
        }
      } catch {
        if (isMounted) clearSession();
      } finally {
        if (isMounted) setChecking(false);
      }
    }

    hydrate();
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center bg-canvas">
        <p className="font-sans text-sm text-ink/60">Carregando sessão…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: window.location.pathname }} />;
  }

  return <Outlet />;
}
