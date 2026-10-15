import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Loading } from '../../components/ui/Loading';
import { EmptyState } from '../../components/ui/EmptyState';
import { AnnouncementFormModal } from './AnnouncementFormModal';
import { listAnnouncementsRequest, createAnnouncementRequest, updateAnnouncementRequest, archiveAnnouncementRequest, deleteAnnouncementRequest } from '../../lib/appServices';

const PRIORITY_TONE = { normal: 'neutral', important: 'warning', urgent: 'danger' };
const PRIORITY_LABEL = { normal: 'Normal', important: 'Importante', urgent: 'Urgente' };

export function Announcements() {
  const { hasPermission } = useAuthStore();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const canManage = hasPermission('announcements.manage');

  async function loadData() {
    setLoading(true);
    setItems(await listAnnouncementsRequest());
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  async function handleCreate(payload) {
    setSubmitting(true); setFormError('');
    try { await createAnnouncementRequest(payload); setModal(null); loadData(); }
    catch (err) { setFormError(err.response?.data?.error?.message || 'Não foi possível criar o aviso.'); }
    finally { setSubmitting(false); }
  }

  async function handleEdit(payload) {
    setSubmitting(true); setFormError('');
    try { await updateAnnouncementRequest(modal.announcement.id, payload); setModal(null); loadData(); }
    catch (err) { setFormError(err.response?.data?.error?.message || 'Não foi possível atualizar o aviso.'); }
    finally { setSubmitting(false); }
  }

  async function handleArchive(id) {
    await archiveAnnouncementRequest(id);
    loadData();
  }
  async function handleDelete(item) {
    if (!window.confirm('Tem certeza que deseja excluir este registro? Esta ação não poderá ser desfeita.')) return;
    try { await deleteAnnouncementRequest(item.id); await loadData(); }
    catch (err) { setFormError(err.response?.data?.error?.message || 'Não foi possível excluir o aviso.'); }
  }

  const sorted = [...items].sort((a, b) => (b.priority === 'urgent') - (a.priority === 'urgent'));

  return (
    <div className="max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-medium text-ink">Avisos</h1>
          <p className="mt-1 text-sm text-ink/60">Comunicados da liderança.</p>
        </div>
        {canManage && <Button variant="metal" onClick={() => setModal({ mode: 'create' })}>Novo aviso</Button>}
      </div>

      {loading ? <Loading /> : sorted.length === 0 ? (
        <EmptyState message="Nenhum aviso publicado." />
      ) : (
        <div className="mt-5 space-y-3">
          {sorted.map((a) => (
            <Card key={a.id}>
              <div className="flex items-start justify-between gap-2">
                <p className="font-display text-lg text-ink">{a.title}</p>
                <Badge tone={PRIORITY_TONE[a.priority]}>{PRIORITY_LABEL[a.priority]}</Badge>
              </div>
              <p className="mt-2 text-sm text-ink/70">{a.body}</p>
              {!a.publishedAt && <p className="mt-2 text-xs text-ink/40">Rascunho — não publicado</p>}
              {canManage && (
                <div className="mt-3 flex gap-3">
                  <button onClick={() => setModal({ mode: 'edit', announcement: a })} className="text-sm font-medium text-coal hover:underline">Editar</button>
                  <button onClick={() => handleArchive(a.id)} className="text-sm font-medium text-ink/50 hover:underline">Arquivar</button>
                  <button onClick={() => handleDelete(a)} className="text-sm font-medium text-danger hover:underline">Excluir</button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {formError && <p role="alert" className="mt-4 rounded-lg bg-danger/10 p-3 text-sm text-danger">{formError}</p>}

      {modal?.mode === 'create' && <AnnouncementFormModal onClose={() => setModal(null)} onSubmit={handleCreate} submitting={submitting} error={formError} />}
      {modal?.mode === 'edit' && <AnnouncementFormModal initial={modal.announcement} onClose={() => setModal(null)} onSubmit={handleEdit} submitting={submitting} error={formError} />}
    </div>
  );
}
