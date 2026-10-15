import { useEffect, useState } from 'react';
import { createMyAvailabilityExceptionRequest, deactivateMyAvailabilityExceptionRequest, getMyAvailabilityExceptionsRequest, getMyAvailabilityRequest } from '../../lib/availabilityService';
import { Card } from '../../components/ui/Card';
import { Loading } from '../../components/ui/Loading';
import { AvailabilityGrid } from './AvailabilityGrid';

export function MyAvailability() {
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState('');
  const [exceptions, setExceptions] = useState([]); const [exception, setException] = useState({ date: '', status: 'unavailable', startTime: '', endTime: '', notes: '' }); const [exceptionMessage, setExceptionMessage] = useState(''); const [savingException, setSavingException] = useState(false);

  useEffect(() => {
    getMyAvailabilityRequest()
      .then(setEntries)
      .catch((err) => setError(err.response?.data?.error?.message || 'Não foi possível carregar sua disponibilidade.'));
    getMyAvailabilityExceptionsRequest().then(setExceptions).catch(() => setExceptionMessage('Não foi possível carregar as exceções de data.'));
  }, []);

  async function saveException(e) { e.preventDefault(); setSavingException(true); setExceptionMessage(''); try { const payload = { date: exception.date, status: exception.status, notes: exception.notes || undefined }; if (exception.startTime || exception.endTime) { payload.startTime = exception.startTime; payload.endTime = exception.endTime; } await createMyAvailabilityExceptionRequest(payload); setExceptions(await getMyAvailabilityExceptionsRequest()); setException({ date: '', status: 'unavailable', startTime: '', endTime: '', notes: '' }); setExceptionMessage('Alteração específica salva; a equipe responsável foi notificada.'); } catch (err) { setExceptionMessage(err.response?.data?.error?.message || 'Não foi possível salvar a alteração.'); } finally { setSavingException(false); } }
  async function removeException(id) { try { await deactivateMyAvailabilityExceptionRequest(id); setExceptions(await getMyAvailabilityExceptionsRequest()); setExceptionMessage('Regra específica removida.'); } catch (err) { setExceptionMessage(err.response?.data?.error?.message || 'Não foi possível remover a regra.'); } }

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl font-medium text-ink">Minha Disponibilidade</h1>
      <p className="mt-1 text-sm text-ink/60">Marque os períodos em que você está disponível para servir.</p>

      <Card className="mt-6">
        {error ? (
          <p className="text-sm text-danger">{error}</p>
        ) : entries === null ? (
          <Loading />
        ) : (
          <AvailabilityGrid initialEntries={entries} />
        )}
      </Card>
      <Card className="mt-5"><h2 className="font-display text-lg">Alteração para uma data específica</h2><p className="mt-1 text-sm text-ink/60">Use quando sua disponibilidade de um dia for diferente da regra semanal.</p><form onSubmit={saveException} className="mt-4 grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-sm">Data<input required type="date" min={new Date().toISOString().slice(0,10)} value={exception.date} onChange={(e) => setException((x) => ({ ...x, date: e.target.value }))} className="rounded-lg border border-ink/15 p-2.5" /></label><label className="grid gap-1 text-sm">Status<select value={exception.status} onChange={(e) => setException((x) => ({ ...x, status: e.target.value }))} className="rounded-lg border border-ink/15 bg-white p-2.5"><option value="unavailable">Indisponível</option><option value="available">Disponível</option></select></label><label className="grid gap-1 text-sm">Início (opcional)<input type="time" value={exception.startTime} onChange={(e) => setException((x) => ({ ...x, startTime: e.target.value }))} className="rounded-lg border border-ink/15 p-2.5" /></label><label className="grid gap-1 text-sm">Fim (opcional)<input type="time" value={exception.endTime} onChange={(e) => setException((x) => ({ ...x, endTime: e.target.value }))} className="rounded-lg border border-ink/15 p-2.5" /></label><label className="grid gap-1 text-sm sm:col-span-2">Motivo (opcional)<input maxLength="500" value={exception.notes} onChange={(e) => setException((x) => ({ ...x, notes: e.target.value }))} className="rounded-lg border border-ink/15 p-2.5" /></label><div className="sm:col-span-2"><button disabled={savingException || !exception.date} className="rounded-lg bg-coal px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">{savingException ? 'Salvando…' : 'Salvar alteração'}</button></div></form>{exceptionMessage && <p role="status" className="mt-3 text-sm text-ink/70">{exceptionMessage}</p>}<ul className="mt-4 divide-y divide-ink/10">{exceptions.map((entry) => <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><span>{new Date(`${entry.date.slice(0,10)}T12:00:00`).toLocaleDateString('pt-BR')} · {entry.startTime ? `${entry.startTime}–${entry.endTime}` : 'dia todo'} · {entry.status === 'unavailable' ? 'Indisponível' : 'Disponível'}{entry.notes ? ` · ${entry.notes}` : ''}</span><button onClick={() => removeException(entry.id)} className="text-danger hover:underline">Remover</button></li>)}{exceptions.length === 0 && <li className="py-3 text-sm text-ink/50">Nenhuma alteração específica cadastrada.</li>}</ul></Card>
    </div>
  );
}
