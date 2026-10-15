import { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';

export function ScheduleFormModal({ onClose, onSubmit, submitting, error }) {
  const [form, setForm] = useState({ title: '', type: 'culto', date: '', startTime: '', endTime: '', notes: '' });

  function set(field, value) { setForm((f) => ({ ...f, [field]: value })); }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({ ...form, date: new Date(form.date).toISOString() });
  }

  return (
    <Modal title="Nova escala" onClose={onClose}>
      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-ink/80">Título</label>
          <input required value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Culto de Celebração"
            className="mt-1.5 w-full rounded-lg border border-ink/15 px-3.5 py-2.5 text-sm outline-none focus:border-coal" />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink/80">Tipo</label>
          <select value={form.type} onChange={(e) => set('type', e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-ink/15 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-coal">
            <option value="culto">Culto</option>
            <option value="evento">Evento</option>
            <option value="recepcao">Recepção</option>
            <option value="ensaio">Ensaio</option>
            <option value="outro">Outro</option>
          </select>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-1">
            <label className="block text-sm font-medium text-ink/80">Data</label>
            <input required type="date" value={form.date} onChange={(e) => set('date', e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-ink/15 px-3.5 py-2.5 text-sm outline-none focus:border-coal" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink/80">Início</label>
            <input type="time" value={form.startTime} onChange={(e) => set('startTime', e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-ink/15 px-3.5 py-2.5 text-sm outline-none focus:border-coal" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink/80">Fim</label>
            <input type="time" value={form.endTime} onChange={(e) => set('endTime', e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-ink/15 px-3.5 py-2.5 text-sm outline-none focus:border-coal" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-ink/80">Observação</label>
          <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2}
            className="mt-1.5 w-full rounded-lg border border-ink/15 px-3.5 py-2.5 text-sm outline-none focus:border-coal" />
        </div>

        {error && <p className="rounded-lg bg-danger/10 px-3.5 py-2.5 text-sm text-danger">{error}</p>}

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={submitting}>{submitting ? 'Criando…' : 'Criar escala'}</Button>
        </div>
      </form>
    </Modal>
  );
}
