import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Loading } from '../../components/ui/Loading';
import { useAuthStore } from '../../store/authStore';
import { formatDateBR, todayISODate } from '../../lib/dateUtils';
import {
  createEventVisitorRequest,
  createScheduleVisitorRequest,
  getEventVisitorsRequest,
  getScheduleVisitorsRequest,
  listVisitorEventsRequest,
  listVisitorSchedulesRequest,
  streamScheduleVisitors,
} from '../../lib/visitorsService';

function formatDateTime(date, time) {
  const dateLabel = date ? formatDateBR(date, { dateStyle: 'full' }) : '';
  return `${dateLabel}${time ? ` · ${time}` : ''}`;
}

function formatVisitTime(date) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(date));
}

function isToday(date) {
  return new Date(date).toISOString().slice(0, 10) === todayISODate();
}

export function Visitors() {
  const { scheduleId, eventId } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuthStore();
  const [schedules, setSchedules] = useState([]);
  const [events, setEvents] = useState([]);
  const [scheduleData, setScheduleData] = useState(null);
  const [eventData, setEventData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', area: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [streamStatus, setStreamStatus] = useState('');
  const canSeeEvents = hasPermission('visitors.view') || hasPermission('visitors.manage');

  const loadDirectory = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [scheduleRows, eventRows] = await Promise.all([listVisitorSchedulesRequest(), listVisitorEventsRequest()]);
      setSchedules(scheduleRows); setEvents(eventRows);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Não foi possível carregar os cultos e eventos.');
    } finally { setLoading(false); }
  }, []);

  const loadSchedule = useCallback(async (quiet = false) => {
    if (!scheduleId) return;
    if (!quiet) { setLoading(true); setError(''); }
    try { setScheduleData(await getScheduleVisitorsRequest(scheduleId)); }
    catch (err) { setError(err.response?.data?.error?.message || 'Não foi possível abrir a lista de visitantes.'); }
    finally { if (!quiet) setLoading(false); }
  }, [scheduleId]);

  const loadEvent = useCallback(async (quiet = false) => {
    if (!eventId) return;
    if (!quiet) { setLoading(true); setError(''); }
    try { setEventData(await getEventVisitorsRequest(eventId)); }
    catch (err) { setError(err.response?.data?.error?.message || 'Não foi possível abrir a lista de visitantes.'); }
    finally { if (!quiet) setLoading(false); }
  }, [eventId]);

  useEffect(() => {
    if (scheduleId) loadSchedule();
    else if (eventId) loadEvent();
    else loadDirectory();
  }, [scheduleId, eventId, loadSchedule, loadEvent, loadDirectory]);

  useEffect(() => {
    if (!scheduleId) return undefined;
    const controller = new AbortController();
    setStreamStatus('Conectando atualizações ao vivo…');
    streamScheduleVisitors(scheduleId, (visitor) => {
      setScheduleData((current) => {
        if (!current || current.visitors.some((entry) => entry.id === visitor.id)) return current;
        return { ...current, visitors: [visitor, ...current.visitors] };
      });
      setStreamStatus('Lista atualizada em tempo real');
    }, controller.signal).then(() => {
      if (!controller.signal.aborted) setStreamStatus('Conexão ao vivo encerrada. Atualizando automaticamente.');
    }).catch(() => {
      if (!controller.signal.aborted) setStreamStatus('Atualização automática ativa');
    });
    const refresh = setInterval(() => loadSchedule(true), 5000);
    return () => { controller.abort(); clearInterval(refresh); };
  }, [scheduleId, loadSchedule]);

  useEffect(() => {
    if (!eventId) return undefined;
    const refresh = setInterval(() => loadEvent(true), 5000);
    return () => clearInterval(refresh);
  }, [eventId, loadEvent]);

  const visitorList = scheduleData?.visitors || eventData?.visitors || [];
  const canCreate = scheduleData?.canCreate || eventData?.canCreate;
  const context = scheduleData?.schedule || eventData?.event;
  const contextTitle = scheduleData?.schedule?.title || eventData?.event?.name || '';
  const contextDate = useMemo(() => scheduleData?.schedule?.date || eventData?.event?.date, [scheduleData, eventData]);
  const contextTime = scheduleData?.schedule?.startTime || eventData?.event?.startTime;
  const contextSubtitle = context ? formatDateTime(contextDate, contextTime) : '';

  async function handleSubmit(event) {
    event.preventDefault(); setSubmitting(true); setError(''); setMessage('');
    const payload = { name: form.name, phone: form.phone, whatsapp: form.phone, area: form.area, notes: form.notes };
    try {
      const visitor = scheduleId
        ? await createScheduleVisitorRequest(scheduleId, payload)
        : await createEventVisitorRequest(eventId, payload);
      const update = (current) => current ? { ...current, visitors: [visitor, ...current.visitors.filter((entry) => entry.id !== visitor.id)] } : current;
      setScheduleData(update); setEventData(update);
      setForm({ name: '', phone: '', area: '', notes: '' });
      setMessage(`Visitante ${visitor.name} registrado e responsáveis notificados.`);
    } catch (err) { setError(err.response?.data?.error?.message || 'Não foi possível cadastrar o visitante.'); }
    finally { setSubmitting(false); }
  }

  if (loading) return <Loading />;

  if (!scheduleId && !eventId) {
    const todaySchedules = schedules.filter((entry) => isToday(entry.date));
    const otherSchedules = schedules.filter((entry) => !isToday(entry.date));
    return <div className="mx-auto max-w-5xl">
      <h1 className="font-display text-2xl font-medium text-ink">Visitantes</h1>
      <p className="mt-1 text-sm text-ink/60">Abra a lista do culto ou evento. A Recepção pode cadastrar pelo celular; dirigentes e responsáveis acompanham as entradas ao vivo.</p>
      {error && <p role="alert" className="mt-4 rounded-lg bg-danger/10 p-3 text-sm text-danger">{error}</p>}
      {todaySchedules.length > 0 && <section className="mt-6"><h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-coal">Cultos e escalas de hoje</h2><div className="grid gap-3 md:grid-cols-2">{todaySchedules.map((entry) => <ScheduleCard key={entry.id} schedule={entry} onOpen={() => navigate(`/visitantes/${entry.id}`)} />)}</div></section>}
      <section className="mt-6"><h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-coal">Outras escalas e cultos</h2>{otherSchedules.length ? <div className="grid gap-3 md:grid-cols-2">{otherSchedules.map((entry) => <ScheduleCard key={entry.id} schedule={entry} onOpen={() => navigate(`/visitantes/${entry.id}`)} />)}</div> : <p className="text-sm text-ink/50">Nenhuma outra escala disponível para seu perfil.</p>}</section>
      {canSeeEvents && <section className="mt-8"><h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-coal">Eventos</h2>{events.length ? <div className="grid gap-3 md:grid-cols-2">{events.map((entry) => <button key={entry.id} type="button" onClick={() => navigate(`/visitantes/eventos/${entry.id}`)} className="rounded-xl border border-ink/10 bg-white p-4 text-left shadow-sm hover:border-coal/30"><span className="font-medium text-ink">{entry.name}</span><span className="mt-1 block text-sm text-ink/55">{formatDateTime(entry.date, entry.startTime)}</span></button>)}</div> : <p className="text-sm text-ink/50">Nenhum evento cadastrado.</p>}</section>}
    </div>;
  }

  return <div className="mx-auto max-w-3xl">
    <Link to="/visitantes" className="text-sm font-medium text-coal underline">← Voltar às listas</Link>
    <div className="mt-4 flex flex-wrap items-start justify-between gap-3"><div><h1 className="font-display text-2xl font-medium text-ink">Visitantes · {contextTitle}</h1><p className="mt-1 text-sm text-ink/60">{contextSubtitle}</p>{scheduleData && <p className="mt-1 text-xs text-ink/45">Obreiros escalados: {scheduleData.schedule.assignments.map((assignment) => `${assignment.workerName}${assignment.functionName ? ` (${assignment.functionName})` : ''}`).join(', ') || 'não informado'}</p>}</div><span className="rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">{visitorList.length} {visitorList.length === 1 ? 'visitante' : 'visitantes'}</span></div>
    {streamStatus && scheduleId && <p aria-live="polite" className="mt-3 text-xs text-ink/50">● {streamStatus}</p>}
    {error && <p role="alert" className="mt-4 rounded-lg bg-danger/10 p-3 text-sm text-danger">{error}</p>}
    {message && <p role="status" className="mt-4 rounded-lg bg-success/10 p-3 text-sm text-success">{message}</p>}

    {canCreate && <Card className="mt-5"><h2 className="font-display text-lg">Cadastro rápido</h2><form onSubmit={handleSubmit} className="mt-4 grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-sm sm:col-span-2">Nome do visitante<input required autoFocus value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} maxLength="160" className="rounded-lg border border-ink/15 p-3" placeholder="Nome completo" /></label><label className="grid gap-1 text-sm">Telefone / WhatsApp<input inputMode="tel" value={form.phone} onChange={(e) => setForm((current) => ({ ...current, phone: e.target.value }))} maxLength="40" className="rounded-lg border border-ink/15 p-3" placeholder="(00) 00000-0000" /></label><label className="grid gap-1 text-sm">Ministério ou área<input value={form.area} onChange={(e) => setForm((current) => ({ ...current, area: e.target.value }))} maxLength="160" className="rounded-lg border border-ink/15 p-3" placeholder="Ex.: louvor, crianças…" /></label><label className="grid gap-1 text-sm sm:col-span-2">Observação<textarea value={form.notes} onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))} maxLength="2000" rows="2" className="rounded-lg border border-ink/15 p-3" placeholder="Informação útil para o acompanhamento" /></label><p className="text-xs text-ink/50 sm:col-span-2">Culto/evento, data e responsável pelo cadastro serão registrados automaticamente.</p><div className="sm:col-span-2"><Button type="submit" disabled={submitting || !form.name.trim()}>{submitting ? 'Salvando…' : 'Cadastrar visitante'}</Button></div></form></Card>}

    <section className="mt-6"><h2 className="font-display text-lg">Lista do culto/evento</h2>{visitorList.length ? <div className="mt-3 space-y-3">{visitorList.map((visitor) => <Card key={visitor.id} className="!p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-medium text-ink">{visitor.name}</p><p className="mt-1 text-sm text-ink/60">{visitor.phone || visitor.whatsapp || 'Telefone não informado'}{visitor.interest ? ` · ${visitor.interest}` : ''}</p>{visitor.notes && <p className="mt-2 whitespace-pre-wrap text-sm text-ink/70">{visitor.notes}</p>}</div><span className="text-xs text-ink/45">{formatVisitTime(visitor.visitedAt)}</span></div><p className="mt-3 text-xs text-ink/45">Cadastrado por {visitor.createdByName || 'usuário do sistema'}</p></Card>)}</div> : <Card className="mt-3"><p className="text-sm text-ink/55">Ainda não há visitantes registrados para este culto/evento.</p></Card>}</section>
  </div>;
}

function ScheduleCard({ schedule, onOpen }) {
  const reception = schedule.assignments.filter((assignment) => assignment.isReception);
  const today = isToday(schedule.date);
  return <Card className="flex flex-col gap-3 !p-4"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-medium text-ink">{schedule.title}</h3>{today && <span className="rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success">HOJE</span>}</div><p className="mt-1 text-sm text-ink/55">{formatDateTime(schedule.date, schedule.startTime)}{schedule.endTime ? `–${schedule.endTime}` : ''}</p><p className="mt-2 text-xs text-ink/50">Recepção: {reception.map((assignment) => assignment.workerName).join(', ') || 'não escalada'}</p></div><Button type="button" variant="ghost" onClick={onOpen}>{schedule.canCreate ? 'Abrir lista / cadastrar' : 'Abrir lista'}</Button></Card>;
}
