import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Loading } from '../../components/ui/Loading';
import { EmptyState } from '../../components/ui/EmptyState';
import { WorshipFormModal } from './WorshipFormModal';
import { listWorshipsRequest, createWorshipRequest } from '../../lib/worshipsService';
import { formatDateLongBR } from '../../lib/dateUtils';

const TYPE_LABELS = {
  culto_domingo: 'Culto de Domingo', culto_oracao: 'Culto de Oração', culto_ensino: 'Culto de Ensino',
  especial: 'Culto Especial', reuniao: 'Reunião', outro: 'Outro',
};

export function Worships() {
  const { hasPermission } = useAuthStore();
  const [worships, setWorships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const canCreate = hasPermission('worships.create');

  async function loadData() {
    setLoading(true);
    setWorships(await listWorshipsRequest());
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  async function handleCreate(payload) {
    setSubmitting(true); setFormError('');
    try { await createWorshipRequest(payload); setShowCreate(false); loadData(); }
    catch (err) { setFormError(err.response?.data?.error?.message || 'Não foi possível registrar o culto.'); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-medium text-ink">Cultos</h1>
          <p className="mt-1 text-sm text-ink/60">Palavra, louvor e registro de presença.</p>
        </div>
        {canCreate && <Button variant="metal" onClick={() => setShowCreate(true)}>Novo culto</Button>}
      </div>

      {loading ? <Loading /> : worships.length === 0 ? (
        <EmptyState message="Nenhum culto registrado." />
      ) : (
        <div className="mt-5 space-y-3">
          {worships.map((w) => (
            <Link key={w.id} to={`/cultos/${w.id}`}>
              <Card className="hover:border-metal/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-ink">{TYPE_LABELS[w.type] || w.type}{w.theme ? ` — ${w.theme}` : ''}</p>
                    <p className="mt-0.5 text-sm capitalize text-ink/50">{formatDateLongBR(w.date)}{w.startTime && ` às ${w.startTime}`}</p>
                  </div>
                  {w.sermon?.preacherName && <span className="text-xs text-ink/40">Pr. {w.sermon.preacherName}</span>}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {showCreate && (
        <WorshipFormModal onClose={() => setShowCreate(false)} onSubmit={handleCreate} submitting={submitting} error={formError} />
      )}
    </div>
  );
}
