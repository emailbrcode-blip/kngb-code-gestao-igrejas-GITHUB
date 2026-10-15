import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { roleLabel } from '../../components/layout/Sidebar';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Loading } from '../../components/ui/Loading';
import { getDashboardSummaryRequest } from '../../lib/appServices';
import { formatDateShortBR } from '../../lib/dateUtils';

function formatMoney(v) {
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function Dashboard() {
  const { user } = useAuthStore();
  const [summary, setSummary] = useState(null);
  const churchUpdates = summary?.churchUpdates || {};
  const eventsToShow = summary?.upcomingEvents?.length ? summary.upcomingEvents : churchUpdates.events || [];
  const schedulesToShow = summary?.upcomingSchedules || []; 
  const worshipsToShow = summary?.upcomingWorships?.length ? summary.upcomingWorships : churchUpdates.worships || [];
  const announcementsToShow = summary?.announcements?.length ? summary.announcements : churchUpdates.announcements || [];

  useEffect(() => { getDashboardSummaryRequest().then(setSummary); }, []);

  return (
    <div className="max-w-5xl">
      <h1 className="font-display text-2xl font-medium text-ink">Olá, {user?.name?.split(' ')[0]}</h1>
      <p className="mt-1 text-sm text-ink/60">{roleLabel(user?.role)}</p>

      {!summary ? <Loading /> : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {summary.totalMembers !== undefined && (
              <Card><p className="text-xs text-ink/50">Membros</p><p className="mt-1 font-display text-2xl text-ink">{summary.totalMembers}</p></Card>
            )}
            {summary.totalWorkers !== undefined && (
              <Card><p className="text-xs text-ink/50">Obreiros</p><p className="mt-1 font-display text-2xl text-ink">{summary.totalWorkers}</p></Card>
            )}
            {(summary.upcomingSchedules || churchUpdates.schedules) && (
              <Card><p className="text-xs text-ink/50">Próximas escalas</p><p className="mt-1 font-display text-2xl text-ink">{schedulesToShow.length}</p></Card>
            )}
            {(summary.upcomingEvents || churchUpdates.events) && (
              <Card><p className="text-xs text-ink/50">Próximos eventos</p><p className="mt-1 font-display text-2xl text-ink">{eventsToShow.length}</p></Card>
            )}
            {summary.finance && (
              <>
                <Card><p className="text-xs text-ink/50">Receitas</p><p className="mt-1 font-display text-xl text-success">{formatMoney(summary.finance.income)}</p></Card>
                <Card><p className="text-xs text-ink/50">Despesas</p><p className="mt-1 font-display text-xl text-danger">{formatMoney(summary.finance.expense)}</p></Card>
                <Card><p className="text-xs text-ink/50">Saldo</p><p className="mt-1 font-display text-xl text-ink">{formatMoney(summary.finance.balance)}</p></Card>
              </>
            )}
            {summary.donations && <><Card><p className="text-xs text-ink/50">Doações pendentes</p><p className="mt-1 font-display text-2xl text-ink">{summary.donations.pending}</p></Card><Card><p className="text-xs text-ink/50">Total confirmado em doações</p><p className="mt-1 font-display text-lg text-success">{formatMoney(summary.donations.confirmedAmount)}</p></Card></>}
            {summary.donationParticipation && <Card><p className="text-xs text-ink/50">Campanhas abertas</p><p className="mt-1 font-display text-2xl text-ink">{summary.donationParticipation.openCampaigns}</p><p className="mt-1 text-xs text-ink/50">Suas contribuições pendentes: {summary.donationParticipation.myPending}</p><Link to="/participar-doacoes" className="mt-2 inline-block text-sm font-medium text-coal underline">Participar</Link></Card>}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {eventsToShow.length > 0 && (
              <Card>
                <p className="text-sm font-medium text-ink/70">Próximos eventos</p>
                <div className="mt-3 space-y-2">
                  {eventsToShow.map((e) => (
                    <div key={e.id} className="flex justify-between text-sm">
                      <span className="text-ink">{e.name}</span>
                      <span className="text-ink/40">{formatDateShortBR(e.date)}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {schedulesToShow.length > 0 && (
              <Card>
                <p className="text-sm font-medium text-ink/70">Próximas escalas</p>
                <div className="mt-3 space-y-2">
                  {schedulesToShow.map((s) => (
                    <div key={s.id} className="flex justify-between text-sm">
                      <span className="text-ink">{s.title}</span>
                      <span className="text-ink/40">{formatDateShortBR(s.date)}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {worshipsToShow.length > 0 && <Card><p className="text-sm font-medium text-ink/70">Próximos cultos</p><div className="mt-3 space-y-2">{worshipsToShow.map((w) => <div key={w.id} className="flex justify-between gap-2 text-sm"><span>{w.theme || w.type}</span><span className="text-ink/40">{formatDateShortBR(w.date)} {w.startTime || ''}</span></div>)}</div></Card>}

            {summary.upcomingBirthdays?.length > 0 && (
              <Card>
                <p className="text-sm font-medium text-ink/70">Aniversariantes</p>
                <div className="mt-3 space-y-2">
                  {summary.upcomingBirthdays.map((m) => (
                    <div key={m.id} className="flex justify-between text-sm">
                      <span className="text-ink">{m.fullName}</span>
                      <span className="text-ink/40">{formatDateShortBR(m.nextBirthday)}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {announcementsToShow.length > 0 && (
              <Card>
                <p className="text-sm font-medium text-ink/70">Avisos importantes</p>
                <div className="mt-3 space-y-3">
                  {announcementsToShow.map((a) => (
                    <div key={a.id}>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-ink">{a.title}</span>
                        {a.priority !== 'normal' && <Badge tone={a.priority === 'urgent' ? 'danger' : 'warning'}>{a.priority === 'urgent' ? 'Urgente' : 'Importante'}</Badge>}
                      </div>
                      <p className="text-sm text-ink/50 line-clamp-1">{a.body}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {churchUpdates.campaigns?.length > 0 && <Card><p className="text-sm font-medium text-ink/70">Campanhas publicadas</p><div className="mt-3 space-y-3">{churchUpdates.campaigns.map((campaign) => <div key={campaign.id}><p className="text-sm font-medium text-ink">{campaign.name}</p>{campaign.description && <p className="text-sm text-ink/50 line-clamp-2">{campaign.description}</p>}<Link to="/participar-doacoes" className="mt-1 inline-block text-xs font-medium text-coal underline">Ver campanha</Link></div>)}</div></Card>}

            {summary.recentNotifications?.length > 0 && <Card><p className="text-sm font-medium text-ink/70">Notificações recentes</p><div className="mt-3 space-y-3">{summary.recentNotifications.map((notification) => <div key={notification.id}><p className="text-sm font-medium text-ink">{notification.title}</p><p className="text-xs text-ink/55">{notification.body}</p><p className="mt-1 text-[11px] text-ink/40">{formatDateShortBR(notification.createdAt)}</p></div>)}</div><Link to="/notificacoes" className="mt-3 inline-block text-sm font-medium text-coal underline">Ver todas</Link></Card>}

            {summary.recentActivity?.length > 0 && (
              <Card>
                <p className="text-sm font-medium text-ink/70">Atividades recentes</p>
                <div className="mt-3 space-y-2 text-sm text-ink/60">
                  {summary.recentActivity.map((log) => (
                    <p key={log.id}>{log.user?.name || 'Sistema'} — {log.action}</p>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {!summary.totalMembers && !summary.totalWorkers && !summary.upcomingEvents?.length && !summary.donationParticipation && (
            <Card className="mt-6">
              <p className="text-sm text-ink/50">
                Bem-vindo! Confira <Link to="/agenda" className="text-coal hover:underline">a agenda</Link> e{' '}
                <Link to="/avisos" className="text-coal hover:underline">os avisos</Link> da igreja no menu ao lado.
              </p>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
