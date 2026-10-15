import { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { loginRequest } from '../../lib/authService';
import { Button } from '../../components/ui/Button';
import { AppFooter } from '../../components/layout/AppFooter';
import { BRAND } from '../../config/brand';
import { useChurchName } from '../../hooks/useChurchName';

export function Login() {
  const { user, setSession } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const churchName = useChurchName();

  // Já autenticado — não faz sentido mostrar a tela de login de novo.
  if (user) {
    const redirectTo = location.state?.from || '/dashboard';
    return <Navigate to={redirectTo} replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await loginRequest({ email, password });
      setSession(data);
      const destination = typeof location.state?.from === 'string' && location.state.from.startsWith('/') ? location.state.from : '/dashboard';
      navigate(destination, { replace: true });
    } catch (err) {
      const message = err.response?.data?.error?.message;
      setError(message || 'Não foi possível entrar. Verifique seus dados e tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
     <div className="flex flex-1 flex-col md:flex-row">
      {/* Painel de identidade do produto */}
      <div className="flex flex-1 items-center justify-center bg-coal px-8 py-14 md:py-0">
        <div className="max-w-md text-center">
           <img
  src="/brand/frase-fe-claro.png"
  alt={BRAND.slogan}
  className="mx-auto mb-8 max-w-full object-contain"
  style={{ width: 400, height: 300 }}
/>
          <p className="mt-2 text-xs font-normal uppercase tracking-[0.2em] text-white/50">{BRAND.product}</p>
          {churchName && <p className="mt-3 text-sm text-white/60">{churchName}</p>}
        </div>
      </div>

      {/* Painel de login */}
      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <form onSubmit={handleSubmit} className="w-full max-w-sm">
          <h1 className="font-display text-2xl font-medium text-ink">Entrar</h1>
          <p className="mt-1 text-sm text-ink/60">Acesse sua conta para continuar.</p>

          <div className="mt-8 space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-ink/80">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-ink/15 px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-coal"
                placeholder="voce@suaigreja.org"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-ink/80">
                Senha
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-ink/15 px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-coal"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="mt-4 rounded-lg bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
              {error}
            </p>
          )}

          <Button type="submit" disabled={loading} className="mt-6 w-full">
            {loading ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>
      </div>
     </div>
     <AppFooter className="border-t border-ink/10 bg-white px-6 py-4" />
    </div>
  );
}
