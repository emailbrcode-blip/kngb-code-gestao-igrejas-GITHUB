import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Card } from '../../components/ui/Card';
import { Loading } from '../../components/ui/Loading';
import { EmptyState } from '../../components/ui/EmptyState';
import { listEventsRequest } from '../../lib/appServices';
import { listSchedulesRequest } from '../../lib/schedulesService';
import { formatDateLongBR, todayISODate } from '../../lib/dateUtils';

export function Agenda() {
  const { hasPermission } = useAuthStore();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const requests = [];
      if (hasPermission('events.view')) requests.push(listEventsRequest().then((evs) => evs.map((e) => ({ ...e, kind: 'Evento' }))));
      if (hasPermission('schedule.view')) requests.push(listSchedulesRequest().then((s) => s.map((x) => ({ ...x, name: x.title, kind: 'Escala' }))));
      const results = await Promise.all(requests);
      const dateKey = (value) => new Date(value).toISOString().slice(0, 10);
      const merged = results.flat().filter((i) => dateKey(i.date) >= todayISODate());
      merged.sort((a, b) => dateKey(a.date).localeCompare(dateKey(b.date)));
      setItems(merged);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl font-medium text-ink">Agenda</h1>
      <p className="mt-1 text-sm text-ink/60">Próximos cultos, eventos e escalas.</p>

      <div className="mt-6 space-y-3">
        {loading ? <Loading /> : items.length === 0 ? (
          <EmptyState message="Nenhum compromisso próximo." />
        ) : (
          items.map((item) => (
            <Card key={`${item.kind}-${item.id}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-ink">{item.name}</p>
                  <p className="text-sm capitalize text-ink/50">{formatDateLongBR(item.date)}{item.startTime && ` às ${item.startTime}`}</p>
                </div>
                <span className="rounded-full bg-ink/5 px-2.5 py-1 text-xs text-ink/50">{item.kind}</span>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
