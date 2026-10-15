import { BRAND } from '../../config/brand';
import { useChurchName } from '../../hooks/useChurchName';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { InstallButton } from '../../pwa/InstallButton';

// Cada item aparece se o usuário tiver a permissão associada — o menu
// por perfil (Admin/Obreiro/Membro) emerge naturalmente das permissões,
// sem precisar checar o slug da role aqui.
function getNavItems(hasPermission) {
  const items = [{ to: '/dashboard', label: 'Dashboard' }];

  if (hasPermission('members.view')) items.push({ to: '/membros', label: 'Membros' });
  if (hasPermission('workers.view')) items.push({ to: '/obreiros', label: 'Obreiros' });

  // Mesma rota para admin e obreiro — o rótulo e o que aparece na tela
  // mudam conforme a permissão (o backend já filtra os dados).
  if (hasPermission('schedule.view')) {
    items.push({
      to: '/escalas',
      label: hasPermission('schedule.create') ? 'Escalas' : 'Minhas Escalas',
    });
  }
  if (hasPermission('visitors.view') || hasPermission('visitors.manage') || hasPermission('visitors.create') || hasPermission('schedule.view')) {
    items.push({ to: '/visitantes', label: 'Visitantes' });
  }
  if (hasPermission('availability.edit_own')) {
    items.push({ to: '/minha-disponibilidade', label: 'Minha Disponibilidade' });
  }

  if (hasPermission('worships.view')) {
    items.push({ to: '/cultos', label: 'Cultos' });
    items.push({ to: '/palavra', label: 'Palavra' });
    items.push({ to: '/equipe/recepcao', label: 'Recepção' });
    items.push({ to: '/equipe/saudacao', label: 'Saudação' });
  }
  if (hasPermission('donations.view')) items.push({ to: '/doacoes', label: 'Doações' });
  else if (hasPermission('donations.participate')) items.push({ to: '/participar-doacoes', label: 'Campanhas de Doação' });

  items.push({ to: '/agenda', label: 'Agenda' });

  if (hasPermission('events.view')) items.push({ to: '/eventos', label: 'Eventos' });
  if (hasPermission('announcements.view')) items.push({ to: '/avisos', label: 'Avisos' });

  items.push({ to: '/notificacoes', label: 'Notificações' });

  if (hasPermission('finance.view')) items.push({ to: '/financeiro', label: 'Financeiro' });

  // Relatórios hoje cobre membros/obreiros/financeiro/doações — aparece
  // pra quem tem visão de qualquer um desses domínios, não só auditoria.
  const canSeeReports = ['members.view', 'workers.view', 'finance.view', 'donations.view']
    .some((p) => hasPermission(p));
  if (canSeeReports) items.push({ to: '/relatorios', label: 'Relatórios' });

  if (hasPermission('users.view')) items.push({ to: '/usuarios', label: 'Usuários' });
  if (hasPermission('settings.manage')) items.push({ to: '/configuracoes', label: 'Configurações' });
  if (hasPermission('public_site.manage')) items.push({ to: '/configuracoes/pagina-publica', label: 'Página Pública' });

  items.push({ to: '/perfil', label: 'Meu Perfil' });

  return items;
}

export function SidebarContent({ onNavigate }) {
  const { user, hasPermission } = useAuthStore();
  const navItems = getNavItems(hasPermission);
  const churchName = useChurchName();

  return (
    <div className="flex h-full min-h-0 flex-col bg-coal text-white">
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center gap-3 px-5 py-6">
          <img src="/brand/cruz.png" alt="" className="h-12 w-12 shrink-0 rounded-lg object-contain" />
          <div><p className="font-display text-base font-medium leading-tight text-white">{churchName || BRAND.short}</p>
          <p className="mt-1 text-xs text-white/60">{churchName ? BRAND.short : 'Sistema de gestão'}</p></div>
        </div>

        <nav aria-label="Navegação principal" className="mt-2 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain px-3 pb-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-white/10 text-metal-light font-medium'
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="shrink-0 border-t border-white/10 px-6 py-5">
        <InstallButton className="mb-3" />
        <p className="text-sm font-medium text-white">{user?.name}</p>
        <p className="text-xs text-white/50">{roleLabel(user?.role)}</p>
      </div>
    </div>
  );
}

export function roleLabel(slug) {
  const labels = {
    admin_geral: 'Administrador Geral',
    admin_financeiro: 'Administrador Financeiro',
    admin_obreiros: 'Administrador de Obreiros',
    membresia: 'Membresia',
    secretaria: 'Secretaria',
    obreiro: 'Obreiro',
    membro: 'Membro',
  };
  return labels[slug] || slug;
}

export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen min-h-screen w-64 flex-shrink-0 self-start overflow-hidden bg-coal md:flex">
      <SidebarContent />
    </aside>
  );
}
