import { BRAND } from '../../config/brand';
import { useChurchName } from '../../hooks/useChurchName';
import { useNavigate, Link } from 'react-router-dom';
import { MobileMenu } from './MobileMenu';
import { NotificationBell } from './NotificationBell';
import { useAuthStore } from '../../store/authStore';
import { logoutRequest } from '../../lib/authService';
import { GlobalSearch } from './GlobalSearch';

export function TopBar() {
  const churchName = useChurchName();
  const navigate = useNavigate();
  const { user, refreshToken, clearSession } = useAuthStore();

  async function handleLogout() {
    try {
      await logoutRequest(refreshToken);
    } catch {
      // Mesmo se a chamada falhar (ex: token já expirado), a sessão
      // local é limpa de qualquer forma — o usuário precisa conseguir sair.
    } finally {
      clearSession();
      navigate('/login', { replace: true });
    }
  }

  return (
    <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-ink/10 bg-white px-4 md:px-8">
      <div className="flex items-center gap-3">
        <MobileMenu />
        <span className="flex items-center gap-2 font-display text-base font-medium text-ink md:hidden"><img src="/brand/cruz.png" alt="" className="h-8 w-8 rounded-md object-contain" />{churchName || BRAND.short}</span>
      </div>

      <div className="flex items-center gap-2">
        <GlobalSearch />
        <NotificationBell />
        <Link
          to="/perfil"
          className="hidden text-sm text-ink/60 hover:text-ink sm:inline"
        >
          {user?.name}
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-lg border border-ink/15 px-3 py-1.5 text-sm font-medium text-ink/80 transition-colors hover:border-danger hover:text-danger"
        >
          Sair
        </button>
      </div>
    </header>
  );
}
