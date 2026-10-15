import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getWorkerRequest, getWorkerCardPdf } from '../../lib/workersService';
import { downloadCardPdf, formatRma } from '../../lib/cardDownload';
import { Button } from '../../components/ui/Button';
import { getWorkerAvailabilityRequest } from '../../lib/availabilityService';
import { useAuthStore } from '../../store/authStore';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Loading } from '../../components/ui/Loading';
import { AvailabilityGrid } from '../Availability/AvailabilityGrid';

export function WorkerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuthStore();
  const [worker, setWorker] = useState(null);
  const [availability, setAvailability] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cardMsg, setCardMsg] = useState({ type: '', text: '' });

  const canManageAvailability = hasPermission('availability.manage');

  async function load() {
    setLoading(true);
    const w = await getWorkerRequest(id);
    setWorker(w);
    if (canManageAvailability) {
      setAvailability(await getWorkerAvailabilityRequest(id));
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  async function downloadCard() {
    setCardMsg({ type: '', text: '' });
    try {
      const r = await downloadCardPdf(getWorkerCardPdf, id, `carteirinha-${formatRma(worker.rmaNumber)}`);
      if (r.photoStatus !== 'ok') setCardMsg({ type: 'warn', text: `Carteirinha gerada sem a foto: ${r.photoMessage || 'foto indisponível'}` });
    } catch (err) { setCardMsg({ type: 'error', text: err?.response?.status === 403 ? 'Você não tem permissão para emitir carteirinhas.' : 'Não foi possível gerar a carteirinha.' }); }
  }

  if (loading) return <Loading />;
  if (!worker) return <p className="text-sm text-ink/50">Obreiro não encontrado.</p>;

  return (
    <div className="max-w-3xl">
      <button onClick={() => navigate(-1)} className="text-sm text-ink/50 hover:text-ink">← Voltar</button>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3"><h1 className="font-display text-2xl font-medium text-ink">{worker.name}</h1><Button variant="ghost" onClick={downloadCard}>Carteirinha PDF</Button></div>
        <Badge tone={worker.status === 'active' ? 'success' : 'neutral'}>{worker.status === 'active' ? 'Ativo' : 'Inativo'}</Badge>
      </div>

      <p className="mt-1 text-sm text-ink/60">{formatRma(worker.rmaNumber)}</p>
      {cardMsg.text && <p role={cardMsg.type === 'error' ? 'alert' : 'status'} className={`mt-2 rounded-lg px-3 py-2 text-sm ${cardMsg.type === 'error' ? 'bg-danger/10 text-danger' : 'bg-amber-50 text-amber-800'}`}>{cardMsg.text}</p>}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <p className="text-sm font-medium text-ink/70">Dados</p>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-ink/50">Função</dt><dd>{worker.function?.name || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-ink/50">Ministério</dt><dd>{worker.ministry || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-ink/50">Telefone</dt><dd>{worker.phone || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-ink/50">E-mail</dt><dd>{worker.email || '—'}</dd></div>
          </dl>
        </Card>

        <Card>
          <p className="text-sm font-medium text-ink/70">Acesso ao sistema</p>
          <div className="mt-3">
            <p className="text-sm text-ink/50">Conta vinculada:</p>
            <p className={`mt-1 font-display text-lg ${worker.userId ? 'text-success' : 'text-ink/40'}`}>
              {worker.userId ? 'SIM' : 'NÃO'}
            </p>
            {worker.user && <p className="mt-1 text-sm text-ink/60">{worker.user.name} · {worker.user.email}</p>}
          </div>
        </Card>
      </div>

      {canManageAvailability && availability && (
        <Card className="mt-4">
          <p className="text-sm font-medium text-ink/70">Disponibilidade</p>
          <div className="mt-3">
            <AvailabilityGrid workerId={worker.id} initialEntries={availability} admin onSaved={load} />
          </div>
        </Card>
      )}
    </div>
  );
}
