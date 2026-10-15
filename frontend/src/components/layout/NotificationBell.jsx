import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  listNotificationsRequest,
  markNotificationReadRequest,
  markAllNotificationsReadRequest,
} from '../../lib/appServices';

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins} min atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  return `${Math.floor(hours / 24)}d atrás`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  async function load() {
    try {
      const data = await listNotificationsRequest();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // silencioso — o sino não deve quebrar o resto da tela
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000); // mantém notificações da recepção quase em tempo real
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleOpen() {
    setOpen((v) => !v);
  }

  async function handleItemClick(notification) {
    if (!notification.readAt) {
      await markNotificationReadRequest(notification.id);
      load();
    }
    setOpen(false);
    navigate('/notificacoes');
  }

  async function handleMarkAll() {
    await markAllNotificationsReadRequest();
    load();
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={handleOpen}
        aria-label="Notificações"
        className="relative flex h-9 w-9 items-center justify-center rounded-lg hover:bg-ink/5"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M13.73 21a2 2 0 01-3.46 0" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-medium text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-80 max-w-[90vw] rounded-xl border border-ink/10 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-ink/10 px-4 py-3">
            <p className="text-sm font-medium text-ink">Notificações</p>
            {unreadCount > 0 && (
              <button type="button" onClick={handleMarkAll} className="text-xs text-coal hover:underline">
                marcar todas como lidas
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-ink/40">Nenhuma notificação ainda.</p>
            )}
            {notifications.slice(0, 8).map((n) => (
              <button
                key={n.id}
                onClick={() => handleItemClick(n)}
                className={`block w-full border-b border-ink/5 px-4 py-3 text-left last:border-0 hover:bg-ink/[0.03] ${
                  !n.readAt ? 'bg-metal/5' : ''
                }`}
              >
                <p className="text-sm font-medium text-ink">{n.title}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-ink/60">{n.body}</p>
                <p className="mt-1 text-[11px] text-ink/35">{timeAgo(n.createdAt)}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
