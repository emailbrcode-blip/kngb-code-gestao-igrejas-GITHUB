import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Loading } from '../../components/ui/Loading';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EventFormModal } from './EventFormModal';
import { listEventsRequest, createEventRequest, updateEventRequest, deleteEventRequest } from '../../lib/appServices';
import { formatDateLongBR } from '../../lib/dateUtils';

const STATUS_TONE = { scheduled: 'success', cancelled: 'danger', completed: 'neutral' };
const STATUS_LABEL = { scheduled: 'Programado', cancelled: 'Cancelado', completed: 'Concluído' };

export function Events() {
  const { hasPermission } = useAuthStore();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  const canManage = hasPermission('events.create');
  const canDelete = hasPermission('events.delete');

  async function loadData() {
    setLoading(true);
    setEvents(await listEventsRequest());
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  async function handleCreate(payload) {
    setSubmitting(true); setFormError('');
    try { await createEventRequest(payload); setModal(null); loadData(); }
    catch (err) { setFormError(err.response?.data?.error?.message || 'Não foi possível criar o evento.'); }
    finally { setSubmitting(false); }
  }

  async function handleEdit(payload) {
    setSubmitting(true); setFormError('');
    try { await updateEventRequest(modal.event.id, payload); setModal(null); loadData(); }
    catch (err) { setFormError(err.response?.data?.error?.message || 'Não foi possível atualizar o evento.'); }
    finally { setSubmitting(false); }
  }

  async function handleDelete() {
    await deleteEventRequest(confirmDelete.id);
    setConfirmDelete(null); loadData();
  }

  const sorted = [...events].sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-medium text-ink">Eventos</h1>
          <p className="mt-1 text-sm text-ink/60">Cultos especiais, conferências e atividades da igreja.</p>
        </div>
        {canManage && <Button variant="metal" onClick={() => setModal({ mode: 'create' })}>Novo evento</Button>}
      </div>

      {loading ? <Loading /> : sorted.length === 0 ? (
        <EmptyState message="Nenhum evento próximo." />
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {sorted.map((ev) => (
            <Card key={ev.id}>
              <div className="flex items-start justify-between gap-2">
                <p className="font-display text-lg text-ink">{ev.name}</p>
                <Badge tone={STATUS_TONE[ev.status]}>{STATUS_LABEL[ev.status]}</Badge>
              </div>
              <p className="mt-1 text-sm text-ink/50 capitalize">{formatDateLongBR(ev.date)}{ev.startTime && ` às ${ev.startTime}`}</p>
              {ev.location && <p className="mt-1 text-sm text-ink/50">📍 {ev.location}</p>}
              {ev.description && <p className="mt-2 text-sm text-ink/60">{ev.description}</p>}
              {(canManage || canDelete) && (
                <div className="mt-4 flex gap-3">
                  {canManage && <button onClick={() => setModal({ mode: 'edit', event: ev })} className="text-sm font-medium text-coal hover:underline">Editar</button>}
                  {canDelete && <button onClick={() => setConfirmDelete(ev)} className="text-sm font-medium text-danger hover:underline">Excluir</button>}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {modal?.mode === 'create' && <EventFormModal onClose={() => setModal(null)} onSubmit={handleCreate} submitting={submitting} error={formError} />}
      {modal?.mode === 'edit' && <EventFormModal initial={modal.event} onClose={() => setModal(null)} onSubmit={handleEdit} submitting={submitting} error={formError} />}
      {confirmDelete && (
        <ConfirmDialog title="Excluir evento" message="Tem certeza que deseja excluir este registro? Esta ação não poderá ser desfeita." onCancel={() => setConfirmDelete(null)} onConfirm={handleDelete} confirmLabel="Excluir" danger />
      )}
    </div>
  );
}
