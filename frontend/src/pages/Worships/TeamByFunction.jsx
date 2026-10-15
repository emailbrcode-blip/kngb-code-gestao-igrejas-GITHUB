import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Loading } from '../../components/ui/Loading';
import { EmptyState } from '../../components/ui/EmptyState';
import { getTeamByFunctionRequest } from '../../lib/worshipsService';
import { formatDateBR } from '../../lib/dateUtils';

const STATUS_ICON = {
  confirmed: <span className="text-success">✓</span>,
  pending: <span className="text-metal-dark">⚠</span>,
  declined: <span className="text-danger">✕</span>,
  called: <span className="text-ink/40">•</span>,
  substituted: <span className="text-ink/40">•</span>,
};

export function TeamByFunction() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true); setError('');
    getTeamByFunctionRequest(slug)
      .then(setData)
      .catch((err) => setError(err.response?.data?.error?.message || 'Não foi possível carregar.'))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <Loading />;
  if (error) return <p className="text-sm text-danger">{error}</p>;

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl font-medium text-ink">{data.function.name}</h1>
      <p className="mt-1 text-sm text-ink/60">Escalas em que alguém foi designado para {data.function.name.toLowerCase()}.</p>

      <div className="mt-5 space-y-3">
        {data.schedules.length === 0 ? (
          <EmptyState message="Nenhuma escala com essa função ainda." />
        ) : (
          data.schedules.map((s) => (
            <Card key={s.id}>
              <div className="flex items-center justify-between">
                <Link to={`/escalas`} className="font-medium text-ink hover:underline">{s.title}</Link>
                <span className="text-xs text-ink/40">{formatDateBR(s.date)}{s.startTime && ` às ${s.startTime}`}</span>
              </div>
              <div className="mt-2 space-y-1">
                {s.assignments.map((a) => (
                  <div key={a.id} className="flex items-center justify-between text-sm">
                    <span className="text-ink/70">{a.worker.name}</span>
                    <span>{STATUS_ICON[a.status]}</span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-ink/35">{s.peopleCount} pessoa(s) escalada(s)</p>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
