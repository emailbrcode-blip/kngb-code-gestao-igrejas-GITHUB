import { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';

export function AnnouncementFormModal({ initial, onClose, onSubmit, submitting, error }) {
  const [form, setForm] = useState({
    title: initial?.title || '',
    body: initial?.body || '',
    priority: initial?.priority || 'normal',
    audience: initial?.audience || 'all',
    publishNow: initial ? Boolean(initial.publishedAt) : true,
  });

  function set(field, value) { setForm((f) => ({ ...f, [field]: value })); }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit(form);
  }

  return (
    <Modal title={initial ? 'Editar aviso' : 'Novo aviso'} onClose={onClose} wide>
      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-ink/80">Título</label>
          <input required value={form.title} onChange={(e) => set('title', e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-ink/15 px-3.5 py-2.5 text-sm outline-none focus:border-coal" />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink/80">Texto</label>
          <textarea required value={form.body} onChange={(e) => set('body', e.target.value)} rows={3}
            className="mt-1.5 w-full rounded-lg border border-ink/15 px-3.5 py-2.5 text-sm outline-none focus:border-coal" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-ink/80">Prioridade</label>
            <select value={form.priority} onChange={(e) => set('priority', e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-ink/15 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-coal">
              <option value="normal">Normal</option>
              <option value="important">Importante</option>
              <option value="urgent">Urgente</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink/80">Público</label>
            <select value={form.audience} onChange={(e) => set('audience', e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-ink/15 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-coal">
              <option value="all">Todos</option>
              <option value="members">Membros</option>
              <option value="workers">Obreiros</option>
              <option value="leadership">Liderança</option>
            </select>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink/70">
          <input type="checkbox" checked={form.publishNow} onChange={(e) => set('publishNow', e.target.checked)} />
          Publicar agora (envia notificação aos destinatários)
        </label>

        {error && <p className="rounded-lg bg-danger/10 px-3.5 py-2.5 text-sm text-danger">{error}</p>}

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={submitting}>{submitting ? 'Salvando…' : 'Salvar'}</Button>
        </div>
      </form>
    </Modal>
  );
}
