import { useEffect, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { getAvailabilityOverviewRequest } from '../../lib/availabilityService';
import { formatDateBR } from '../../lib/dateUtils';

export function AddAssignmentModal({ workers, functions, schedule, onClose, onSubmit, submitting, error }) {
  const [workerId, setWorkerId] = useState('');
  const [functionSlug, setFunctionSlug] = useState('');
  const [availability, setAvailability] = useState([]);
  const [loadingAvailability, setLoadingAvailability] = useState(true);
  const [availabilityError, setAvailabilityError] = useState('');

  useEffect(() => {
    let active = true;
    setLoadingAvailability(true);
    setAvailabilityError('');
    getAvailabilityOverviewRequest({ date: schedule.date, startTime: schedule.startTime, endTime: schedule.endTime })
      .then((rows) => { if (active) setAvailability(rows); })
      .catch(() => { if (active) { setAvailability([]); setAvailabilityError('Não foi possível consultar a disponibilidade. Atualize a página ou tente novamente.'); } })
      .finally(() => { if (active) setLoadingAvailability(false); });
    return () => { active = false; };
  }, [schedule]);

  const states = new Map(availability.map((row) => [row.workerId, row]));
  const selected = states.get(workerId);

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({ workerId, functionSlug: functionSlug || undefined });
  }

  return (
    <Modal title="Adicionar obreiro à escala" onClose={onClose}>
      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-ink/80">Obreiro</label>
          <select required value={workerId} onChange={(e) => setWorkerId(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-ink/15 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-coal">
            <option value="">Selecione…</option>
            {workers.map((w) => {
              const state = states.get(w.id);
              return <option key={w.id} value={w.id} disabled={loadingAvailability || !state || state.status !== 'available'}>
                {w.name} — {loadingAvailability ? 'verificando…' : availabilityError ? 'CONFLITO' : state?.status === 'available' ? 'DISPONÍVEL' : state?.status === 'conflict' ? 'CONFLITO' : 'INDISPONÍVEL'}
              </option>;
            })}
          </select>
          <div className="mt-2 space-y-1 text-xs text-ink/60" aria-live="polite">
            {loadingAvailability ? <p>Consultando disponibilidade para {formatDateBR(schedule.date)} {schedule.startTime && `· ${schedule.startTime}–${schedule.endTime}`}…</p> : availabilityError ? <p className="text-danger">⚠ CONFLITO · {availabilityError}</p> : workers.map((worker) => {
              const state = states.get(worker.id);
              return <p key={worker.id} className={state?.status === 'available' ? 'text-success' : 'text-danger'}>
                {state?.status === 'available' ? '🟢 DISPONÍVEL' : state?.status === 'conflict' ? '⚠️ CONFLITO' : '🔴 INDISPONÍVEL'} · {worker.name}{state?.function ? ` · ${state.function}` : ''}{state?.reason ? ` — ${state.reason}` : ''}
              </p>;
            })}
          </div>
          {selected?.status !== 'available' && workerId && <p className="mt-2 rounded-lg bg-danger/10 p-2 text-xs text-danger">{selected?.reason || availabilityError || 'Não foi possível validar a disponibilidade. Tente novamente.'}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-ink/80">Função nesta escala</label>
          <select value={functionSlug} onChange={(e) => setFunctionSlug(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-ink/15 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-coal">
            <option value="">Sem função específica</option>
            {functions.map((f) => <option key={f.slug} value={f.slug}>{f.name}</option>)}
          </select>
        </div>

        {error && <p className="rounded-lg bg-danger/10 px-3.5 py-2.5 text-sm text-danger">{error}</p>}

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={submitting || loadingAvailability || !workerId || selected?.status !== 'available'}>{submitting ? 'Adicionando…' : 'Adicionar'}</Button>
        </div>
      </form>
    </Modal>
  );
}
