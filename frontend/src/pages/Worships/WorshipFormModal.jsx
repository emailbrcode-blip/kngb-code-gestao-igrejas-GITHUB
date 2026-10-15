import { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';

export function WorshipFormModal({ initial, onClose, onSubmit, submitting, error }) {
  const [form, setForm] = useState({
    date: initial?.date ? initial.date.slice(0, 10) : '',
    startTime: initial?.startTime || '',
    endTime: initial?.endTime || '',
    type: initial?.type || 'culto_domingo',
    theme: initial?.theme || '',
    attendanceCount: initial?.attendanceCount ?? '',
    notes: initial?.notes || '',
  });

  function set(field, value) { setForm((f) => ({ ...f, [field]: value })); }

  function handleSubmit(e) {
    e.preventDefault();
    const payload = { ...form, date: new Date(form.date).toISOString() };
    if (payload.attendanceCount !== '') payload.attendanceCount = Number(payload.attendanceCount);
    else delete payload.attendanceCount;
    onSubmit(payload);
  }

  return (
    <Modal title={initial ? 'Editar culto' : 'Novo culto'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-ink/80">Tipo</label>
          <select value={form.type} onChange={(e) => set('type', e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-ink/15 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-coal">
            <option value="culto_domingo">Culto de Domingo</option>
            <option value="culto_oracao">Culto de Oração</option>
            <option value="culto_ensino">Culto de Ensino</option>
            <option value="especial">Culto Especial</option>
            <option value="reuniao">Reunião</option>
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
          <label className="block text-sm font-medium text-ink/80">Tema</label>
          <input value={form.theme} onChange={(e) => set('theme', e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-ink/15 px-3.5 py-2.5 text-sm outline-none focus:border-coal" />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink/80">Quantidade de participantes</label>
          <input type="number" min="0" value={form.attendanceCount} onChange={(e) => set('attendanceCount', e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-ink/15 px-3.5 py-2.5 text-sm outline-none focus:border-coal" />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink/80">Observações</label>
          <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2}
            className="mt-1.5 w-full rounded-lg border border-ink/15 px-3.5 py-2.5 text-sm outline-none focus:border-coal" />
        </div>

        {error && <p className="rounded-lg bg-danger/10 px-3.5 py-2.5 text-sm text-danger">{error}</p>}

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={submitting}>{submitting ? 'Salvando…' : 'Salvar'}</Button>
        </div>
      </form>
    </Modal>
  );
}
