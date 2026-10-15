import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Loading } from '../../components/ui/Loading';
import { EmptyState } from '../../components/ui/EmptyState';
import { listSermonsRequest } from '../../lib/worshipsService';
import { formatDateBR } from '../../lib/dateUtils';

export function Sermons() {
  const [sermons, setSermons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [preacher, setPreacher] = useState('');
  const [theme, setTheme] = useState('');

  async function load() {
    setLoading(true);
    setSermons(await listSermonsRequest({ preacher: preacher || undefined, theme: theme || undefined }));
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function handleFilter(e) {
    e.preventDefault();
    load();
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl font-medium text-ink">Palavra</h1>
      <p className="mt-1 text-sm text-ink/60">Histórico das mensagens ministradas.</p>

      <form onSubmit={handleFilter} className="mt-5 flex flex-wrap gap-3">
        <input value={preacher} onChange={(e) => setPreacher(e.target.value)} placeholder="Pregador"
          className="rounded-lg border border-ink/15 px-3.5 py-2.5 text-sm outline-none focus:border-coal" />
        <input value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="Tema ou título"
          className="rounded-lg border border-ink/15 px-3.5 py-2.5 text-sm outline-none focus:border-coal" />
        <button type="submit" className="rounded-lg bg-coal px-4 py-2.5 text-sm font-medium text-white">Filtrar</button>
      </form>

      <div className="mt-5 space-y-3">
        {loading ? <Loading /> : sermons.length === 0 ? (
          <EmptyState message="Nenhuma palavra encontrada." />
        ) : (
          sermons.map((s) => (
            <Link key={s.id} to={`/cultos/${s.worship.id}`}>
              <Card className="hover:border-metal/50">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-ink">{s.title || 'Sem título'}</p>
                  <span className="text-xs text-ink/40">{formatDateBR(s.worship.date)}</span>
                </div>
                <p className="mt-1 text-sm text-ink/60">
                  {s.preacherWorker?.name || s.preacherName || 'Pregador não informado'}
                  {s.scripture && ` — ${s.scripture}`}
                </p>
                {s.theme && <p className="mt-1 text-xs text-ink/40">{s.theme}</p>}
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
