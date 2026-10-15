import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';
import { Loading } from '../../components/ui/Loading';
import { EmptyState } from '../../components/ui/EmptyState';
import { ScheduleFormModal } from './ScheduleFormModal';
import { AddAssignmentModal } from './AddAssignmentModal';
import { ScheduleCard } from './ScheduleCard';
import {
  listSchedulesRequest,
  createScheduleRequest,
  addAssignmentRequest,
  removeAssignmentRequest,
  confirmAssignmentRequest,
  updateAssignmentStatusRequest,
  deleteScheduleRequest,
} from '../../lib/schedulesService';
import { listWorkersRequest, listWorkerFunctionsRequest } from '../../lib/workersService';
import { todayISODate } from '../../lib/dateUtils';

export function Schedules() {
  const { user, hasPermission } = useAuthStore();
  const [schedules, setSchedules] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [functions, setFunctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [tab, setTab] = useState('upcoming');

  const [showCreate, setShowCreate] = useState(false);
  const [assignModal, setAssignModal] = useState(null); // schedule
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const canManage = hasPermission('schedule.create');
  const canDelete = hasPermission('schedule.delete');
  const canConfirmOwn = hasPermission('schedule.confirm_own');

  async function loadData() {
    setLoading(true); setLoadError('');
    try {
      const requests = [listSchedulesRequest()];
      if (canManage) requests.push(listWorkersRequest(), listWorkerFunctionsRequest());
      const [s, w, f] = await Promise.all(requests);
      setSchedules(s);
      if (w) setWorkers(w);
      if (f) setFunctions(f);
    } catch (err) {
      setLoadError(err.response?.data?.error?.message || 'Não foi possível carregar as escalas.');
    } finally { setLoading(false); }
  }

  useEffect(() => { loadData(); }, []);

  const { upcoming, past } = useMemo(() => {
    const today = todayISODate();
    const dateKey = (date) => new Date(date).toISOString().slice(0, 10);
    const sorted = [...schedules].sort((a, b) => dateKey(a.date).localeCompare(dateKey(b.date)));
    return {
      upcoming: sorted.filter((s) => dateKey(s.date) >= today),
      past: sorted.filter((s) => dateKey(s.date) < today).reverse(),
    };
  }, [schedules]);

  const visible = tab === 'upcoming' ? upcoming : past;

  async function handleCreate(payload) {
    setSubmitting(true); setFormError('');
    try {
      await createScheduleRequest(payload);
      setShowCreate(false); loadData();
    } catch (err) {
      setFormError(err.response?.data?.error?.message || 'Não foi possível criar a escala.');
    } finally { setSubmitting(false); }
  }

  async function handleAddAssignment(payload) {
    setSubmitting(true); setFormError('');
    try {
      await addAssignmentRequest(assignModal.id, payload);
      setAssignModal(null); loadData();
    } catch (err) {
      setFormError(err.response?.data?.error?.message || 'Não foi possível adicionar o obreiro.');
    } finally { setSubmitting(false); }
  }

  async function handleRemoveAssignment(scheduleId, assignmentId) {
    await removeAssignmentRequest(scheduleId, assignmentId);
    loadData();
  }

  async function handleConfirm(scheduleId, assignmentId, status) {
    // Quem administra pode alterar qualquer status; o próprio obreiro só
    // confirma/recusa a si mesmo (rota /confirm, que o backend garante).
    if (canManage) await updateAssignmentStatusRequest(scheduleId, assignmentId, { status });
    else await confirmAssignmentRequest(scheduleId, assignmentId, status);
    loadData();
  }
  async function handleDeleteSchedule(schedule) {
    if (!window.confirm('Tem certeza que deseja excluir este registro? Esta ação não poderá ser desfeita.')) return;
    try { await deleteScheduleRequest(schedule.id); await loadData(); }
    catch (err) { setLoadError(err.response?.data?.error?.message || 'Não foi possível excluir a escala.'); }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-medium text-ink">{canManage ? 'Escalas' : 'Minhas Escalas'}</h1>
          <p className="mt-1 text-sm text-ink/60">
            {canManage ? 'Organize as escalas de cultos e eventos.' : 'Suas designações e confirmações.'}
          </p>
        </div>
        {canManage && <Button variant="metal" onClick={() => setShowCreate(true)}>Nova escala</Button>}
      </div>

      <div className="mt-5 flex gap-2">
        <button onClick={() => setTab('upcoming')} className={`rounded-lg px-3.5 py-1.5 text-sm font-medium ${tab === 'upcoming' ? 'bg-coal text-white' : 'bg-ink/5 text-ink/60'}`}>Próximas</button>
        <button onClick={() => setTab('past')} className={`rounded-lg px-3.5 py-1.5 text-sm font-medium ${tab === 'past' ? 'bg-coal text-white' : 'bg-ink/5 text-ink/60'}`}>Passadas</button>
      </div>

      <div className="mt-5 space-y-4">
        {loading ? <Loading /> : loadError ? (
          <p className="text-sm text-danger">{loadError}</p>
        ) : visible.length === 0 ? (
          <EmptyState message={tab === 'upcoming' ? 'Nenhuma escala encontrada.' : 'Nenhuma escala passada.'} />
        ) : (
          visible.map((s) => (
            <ScheduleCard
              key={s.id}
              schedule={s}
              currentUserId={user?.id}
              canManage={canManage}
              canConfirmOwn={canConfirmOwn}
              onAddWorker={setAssignModal}
              onConfirm={handleConfirm}
              onRemoveAssignment={handleRemoveAssignment}
              canDelete={canDelete}
              onDelete={handleDeleteSchedule}
            />
          ))
        )}
      </div>

      {showCreate && (
        <ScheduleFormModal onClose={() => setShowCreate(false)} onSubmit={handleCreate} submitting={submitting} error={formError} />
      )}
      {assignModal && (
        <AddAssignmentModal
          workers={workers.filter((w) => w.status === 'active')}
          functions={functions}
          schedule={assignModal}
          onClose={() => setAssignModal(null)}
          onSubmit={handleAddAssignment}
          submitting={submitting}
          error={formError}
        />
      )}
    </div>
  );
}
