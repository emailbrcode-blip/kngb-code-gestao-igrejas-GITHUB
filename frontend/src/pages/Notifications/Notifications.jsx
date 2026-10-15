import { useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Loading } from '../../components/ui/Loading';
import { EmptyState } from '../../components/ui/EmptyState';
import { listNotificationsRequest, markNotificationReadRequest, markAllNotificationsReadRequest, deleteNotificationRequest } from '../../lib/appServices';

function formatDate(d) {
  return new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const data = await listNotificationsRequest();
    setNotifications(data.notifications);
    setUnreadCount(data.unreadCount);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleRead(n) {
    if (!n.readAt) { await markNotificationReadRequest(n.id); load(); }
  }
  async function handleDelete(n) {
    if (!window.confirm('Tem certeza que deseja excluir este registro? Esta ação não poderá ser desfeita.')) return;
    await deleteNotificationRequest(n.id); await load();
  }

  return (
    <div className="max-w-2xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-medium text-ink">Notificações</h1>
        {unreadCount > 0 && <Button variant="ghost" onClick={async () => { await markAllNotificationsReadRequest(); load(); }}>Marcar todas como lidas</Button>}
      </div>

      <Card className="mt-5 overflow-hidden !p-0">
        {loading ? <Loading /> : notifications.length === 0 ? (
          <EmptyState message="Nenhuma notificação ainda." />
        ) : (
          <div className="divide-y divide-ink/5">
            {notifications.map((n) => (
              <div key={n.id} className={`flex items-start gap-3 px-5 py-4 hover:bg-ink/[0.02] ${!n.readAt ? 'bg-metal/5' : ''}`}>
                <button onClick={() => handleRead(n)} className="min-w-0 flex-1 text-left">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-ink">{n.title}</p>
                  {!n.readAt && <span className="h-2 w-2 rounded-full bg-metal-dark" />}
                </div>
                <p className="mt-1 text-sm text-ink/60">{n.body}</p>
                <p className="mt-1.5 text-xs text-ink/35">{formatDate(n.createdAt)}</p>
                </button>
                <button type="button" onClick={() => handleDelete(n)} className="shrink-0 text-xs font-medium text-danger hover:underline">Excluir</button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
