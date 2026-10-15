import { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';

export function EventFormModal({ initial, onClose, onSubmit, submitting, error }) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    description: initial?.description || '',
    date: initial?.date ? initial.date.slice(0, 10) : '',
    startTime: initial?.startTime || '',
    endTime: initial?.endTime || '',
    location: initial?.location || '',
    responsible: initial?.responsible || '',
    capacity: initial?.capacity || '',
    isPublic: initial?.isPublic || false,
  });

  function set(field, value) { setForm((f) => ({ ...f, [field]: value })); }

  function handleSubmit(e) {
    e.preventDefault();
    const payload = { ...form, date: new Date(form.date).toISOString() };
    if (payload.capacity) payload.capacity = Number(payload.capacity); else delete payload.capacity;
    onSubmit(payload);
  }

  return (
    <Modal title={initial ? 'Editar evento' : 'Novo evento'} onClose={onClose} wide>
      <form onSubmit={handleSubmit} className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-ink/80">Nome</label>
          <input required value={form.name} onChange={(e) => set('name', e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-ink/15 px-3.5 py-2.5 text-sm outline-none focus:border-coal" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-ink/80">Descrição</label>
          <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={2}
            className="mt-1.5 w-full rounded-lg border border-ink/15 px-3.5 py-2.5 text-sm outline-none focus:border-coal" />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink/80">Data</label>
          <input required type="date" value={form.date} onChange={(e) => set('date', e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-ink/15 px-3.5 py-2.5 text-sm outline-none focus:border-coal" />
        </div>

        <label className="sm:col-span-2 flex items-center gap-2 text-sm text-ink/80">
          <input type="checkbox" checked={form.isPublic} onChange={(e) => set('isPublic', e.target.checked)} />
          Exibir este evento na página pública da igreja
        </label>
        <div>
          <label className="block text-sm font-medium text-ink/80">Local</label>
          <input value={form.location} onChange={(e) => set('location', e.target.value)}
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
        <div>
          <label className="block text-sm font-medium text-ink/80">Responsável</label>
          <input value={form.responsible} onChange={(e) => set('responsible', e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-ink/15 px-3.5 py-2.5 text-sm outline-none focus:border-coal" />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink/80">Capacidade</label>
          <input type="number" min="1" value={form.capacity} onChange={(e) => set('capacity', e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-ink/15 px-3.5 py-2.5 text-sm outline-none focus:border-coal" />
        </div>

        {error && <p className="sm:col-span-2 rounded-lg bg-danger/10 px-3.5 py-2.5 text-sm text-danger">{error}</p>}

        <div className="sm:col-span-2 mt-2 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={submitting}>{submitting ? 'Salvando…' : 'Salvar'}</Button>
        </div>
      </form>
    </Modal>
  );
}
