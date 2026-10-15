import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Loading } from '../../components/ui/Loading';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { listWorkersRequest } from '../../lib/workersService';
import {
  listWorshipsRequest, createWorshipRequest, updateWorshipRequest, deleteWorshipRequest,
  saveSermonRequest, addWorshipSongRequest, removeWorshipSongRequest,
  assignReceptionRequest, removeReceptionRequest, assignGreetingRequest, removeGreetingRequest,
} from '../../lib/worshipService';
import { formatDateLongBR } from '../../lib/dateUtils';

const STATUS = {
  scheduled: ['Programado', 'success'],
  completed: ['Concluído', 'neutral'],
  cancelled: ['Cancelado', 'danger'],
};

function Field({ label, children, className = '' }) {
  return <label className={`block text-sm font-medium text-ink/80 ${className}`}>{label}{children}</label>;
}

function Input({ className = '', ...props }) {
  return <input {...props} className={`mt-1.5 w-full rounded-lg border border-ink/15 px-3.5 py-2.5 text-sm outline-none focus:border-coal ${className}`} />;
}

function Textarea({ className = '', ...props }) {
  return <textarea {...props} className={`mt-1.5 w-full rounded-lg border border-ink/15 px-3.5 py-2.5 text-sm outline-none focus:border-coal ${className}`} />;
}

function WorshipModal({ initial, onClose, onSubmit, submitting, error }) {
  const [form, setForm] = useState({
    title: initial?.title || '',
    type: initial?.type || 'Culto',
    date: initial?.date ? initial.date.slice(0, 10) : '',
    startTime: initial?.startTime || '',
    endTime: initial?.endTime || '',
    theme: initial?.theme || '',
    notes: initial?.notes || '',
    status: initial?.status || 'scheduled',
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  function submit(e) {
    e.preventDefault();
    onSubmit({
      ...form,
      date: new Date(`${form.date}T${form.startTime || '00:00'}:00`).toISOString(),
    });
  }
  return (
    <Modal title={initial ? 'Editar culto' : 'Novo culto'} onClose={onClose} wide>
      <form onSubmit={submit} className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><Field label="Título"><Input required value={form.title} onChange={e => set('title', e.target.value)} placeholder="Culto de Domingo — Manhã" /></Field></div>
        <Field label="Tipo"><Input value={form.type} onChange={e => set('type', e.target.value)} placeholder="Culto, Santa Ceia, Vigília..." /></Field>
        <Field label="Data"><Input required type="date" value={form.date} onChange={e => set('date', e.target.value)} /></Field>
        <Field label="Início"><Input type="time" value={form.startTime} onChange={e => set('startTime', e.target.value)} /></Field>
        <Field label="Fim"><Input type="time" value={form.endTime} onChange={e => set('endTime', e.target.value)} /></Field>
        <div className="sm:col-span-2"><Field label="Tema"><Input value={form.theme} onChange={e => set('theme', e.target.value)} placeholder="Tema do culto" /></Field></div>
        <div className="sm:col-span-2"><Field label="Observações"><Textarea rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} /></Field></div>
        {initial && <Field label="Status"><select value={form.status} onChange={e => set('status', e.target.value)} className="mt-1.5 w-full rounded-lg border border-ink/15 px-3.5 py-2.5 text-sm"><option value="scheduled">Programado</option><option value="completed">Concluído</option><option value="cancelled">Cancelado</option></select></Field>}
        {error && <p className="sm:col-span-2 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
        <div className="sm:col-span-2 flex justify-end gap-3"><Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={submitting}>{submitting ? 'Salvando…' : 'Salvar'}</Button></div>
      </form>
    </Modal>
  );
}

function SectionTitle({ title, canManage, onAdd }) {
  return <div className="flex items-center justify-between gap-3"><h3 className="font-medium text-ink">{title}</h3>{canManage && <Button onClick={onAdd} className="px-3 py-2">Adicionar</Button>}</div>;
}

export function Worships() {
  const { hasPermission } = useAuthStore();
  const [worships, setWorships] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const canCreate = hasPermission('worship.create');
  const canEdit = hasPermission('worship.edit');
  const canDelete = hasPermission('worship.delete');
  const canSermon = hasPermission('sermon.manage');
  const canSongs = hasPermission('worship_songs.manage');
  const canReception = hasPermission('reception.manage');
  const canGreeting = hasPermission('greeting.manage');

  async function load() {
    setLoading(true);
    try {
      const data = await listWorshipsRequest();
      setWorships(data);
      if (selected) setSelected(data.find(w => w.id === selected.id) || null);
      if (canReception || canGreeting) setWorkers(await listWorkersRequest());
    } catch (e) {
      setError(e.response?.data?.error?.message || 'Não foi possível carregar os cultos.');
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function createOrEdit(payload) {
    setBusy(true); setFormError('');
    try {
      if (modal?.mode === 'edit') await updateWorshipRequest(modal.worship.id, payload);
      else await createWorshipRequest(payload);
      setModal(null); await load();
    } catch (e) { setFormError(e.response?.data?.error?.message || 'Não foi possível salvar o culto.'); }
    finally { setBusy(false); }
  }

  async function run(action) {
    try { await action(); await load(); }
    catch (e) { setError(e.response?.data?.error?.message || 'Não foi possível concluir a operação.'); }
  }

  async function saveSermon(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    await run(() => saveSermonRequest(selected.id, {
      title: f.get('title'), bibleReference: f.get('bibleReference'),
      preacher: f.get('preacher'), summary: f.get('summary'), notes: f.get('notes'),
    }));
  }

  async function addSong(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    await run(() => addWorshipSongRequest(selected.id, {
      title: f.get('title'), artist: f.get('artist'),
      position: Number(f.get('position') || 0), notes: f.get('notes'),
    }));
    form.reset();
  }

  async function assign(kind, e) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const fn = kind === 'reception' ? assignReceptionRequest : assignGreetingRequest;
    await run(() => fn(selected.id, { workerId: f.get('workerId'), notes: f.get('notes') }));
    form.reset();
  }

  const detail = selected && worships.find(w => w.id === selected.id);
  const sorted = [...worships].sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="font-display text-2xl font-medium text-ink">Cultos</h1><p className="mt-1 text-sm text-ink/60">Programação do culto, Palavra, louvor, recepção e saudação.</p></div>
        {canCreate && <Button variant="metal" onClick={() => { setFormError(''); setModal({ mode: 'create' }); }}>Novo culto</Button>}
      </div>

      {error && <p className="mt-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
      {loading ? <Loading /> : sorted.length === 0 ? <EmptyState message="Nenhum culto cadastrado." /> : (
        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="space-y-3">
            {sorted.map(w => {
              const [label, tone] = STATUS[w.status] || STATUS.scheduled;
              return <button key={w.id} onClick={() => setSelected(w)} className={`w-full rounded-xl border p-4 text-left transition ${selected?.id === w.id ? 'border-coal bg-ink/5' : 'border-ink/10 bg-white hover:border-ink/25'}`}>
                <div className="flex items-start justify-between gap-2"><span className="font-medium text-ink">{w.title}</span><Badge tone={tone}>{label}</Badge></div>
                <p className="mt-1 text-sm text-ink/50">{formatDateLongBR(w.date)}{w.startTime ? ` às ${w.startTime}` : ''}</p>
                {w.theme && <p className="mt-2 text-sm text-ink/60">Tema: {w.theme}</p>}
              </button>;
            })}
          </div>

          {detail && <div className="lg:col-span-2 space-y-4">
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><h2 className="font-display text-xl text-ink">{detail.title}</h2><p className="mt-1 text-sm text-ink/50">{formatDateLongBR(detail.date)}{detail.startTime && ` • ${detail.startTime}${detail.endTime ? `–${detail.endTime}` : ''}`}</p>{detail.theme && <p className="mt-2 text-sm text-ink/70">Tema: {detail.theme}</p>}</div>
                <div className="flex gap-2">{canEdit && <Button variant="ghost" onClick={() => { setFormError(''); setModal({ mode: 'edit', worship: detail }); }}>Editar</Button>}{canDelete && <Button variant="danger" onClick={() => setConfirm(detail)}>Excluir</Button>}</div>
              </div>
            </Card>

            <Card>
              <SectionTitle title="Palavra / Sermão" canManage={false} />
              {canSermon ? <form onSubmit={saveSermon} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Título"><Input name="title" defaultValue={detail.sermon?.title || ''} required /></Field>
                <Field label="Referência bíblica"><Input name="bibleReference" defaultValue={detail.sermon?.bibleReference || ''} placeholder="Ex.: João 3:16" /></Field>
                <Field label="Pregador"><Input name="preacher" defaultValue={detail.sermon?.preacher || ''} /></Field>
                <div className="sm:col-span-2"><Field label="Resumo"><Textarea name="summary" rows={3} defaultValue={detail.sermon?.summary || ''} /></Field></div>
                <div className="sm:col-span-2"><Field label="Observações"><Textarea name="notes" rows={2} defaultValue={detail.sermon?.notes || ''} /></Field></div>
                <div><Button type="submit">Salvar Palavra</Button></div>
              </form> : detail.sermon ? <div className="mt-3 text-sm text-ink/70"><p className="font-medium">{detail.sermon.title}</p><p>{detail.sermon.bibleReference}</p><p className="mt-2">{detail.sermon.summary}</p></div> : <p className="mt-3 text-sm text-ink/50">Palavra ainda não cadastrada.</p>}
            </Card>

            <Card>
              <SectionTitle title="Louvor / Repertório" canManage={false} />
              <div className="mt-3 space-y-2">{detail.songs?.length ? detail.songs.map((s, i) => <div key={s.id} className="flex items-center justify-between rounded-lg bg-ink/5 px-3 py-2 text-sm"><span>{i + 1}. {s.title}{s.artist ? ` — ${s.artist}` : ''}</span>{canSongs && <button className="text-danger hover:underline" onClick={() => run(() => removeWorshipSongRequest(s.id))}>Remover</button>}</div>) : <p className="text-sm text-ink/50">Nenhum louvor cadastrado.</p>}</div>
              {canSongs && <form onSubmit={addSong} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3"><Field label="Louvor"><Input name="title" required /></Field><Field label="Artista"><Input name="artist" /></Field><Field label="Ordem"><Input name="position" type="number" min="0" defaultValue="0" /></Field><div className="sm:col-span-3"><Button type="submit">Adicionar louvor</Button></div></form>}
            </Card>

            <Card>
              <SectionTitle title="Recepção" canManage={false} />
              <AssignmentList rows={detail.receptions} canManage={canReception} remove={id => run(() => removeReceptionRequest(id))} />
              {canReception && <AssignmentForm workers={workers} onSubmit={e => assign('reception', e)} />}
            </Card>

            <Card>
              <SectionTitle title="Saudação" canManage={false} />
              <AssignmentList rows={detail.greetings} canManage={canGreeting} remove={id => run(() => removeGreetingRequest(id))} />
              {canGreeting && <AssignmentForm workers={workers} onSubmit={e => assign('greeting', e)} />}
            </Card>
          </div>}
        </div>
      )}

      {modal && <WorshipModal initial={modal.mode === 'edit' ? modal.worship : null} onClose={() => setModal(null)} onSubmit={createOrEdit} submitting={busy} error={formError} />}
      {confirm && <ConfirmDialog title="Excluir culto" message={`Excluir "${confirm.title}"? Isso removerá Palavra, louvores, recepção e saudação vinculados.`} onCancel={() => setConfirm(null)} onConfirm={() => run(async () => { await deleteWorshipRequest(confirm.id); setConfirm(null); setSelected(null); })} confirmLabel="Excluir" danger />}
    </div>
  );
}

function AssignmentList({ rows = [], canManage, remove }) {
  if (!rows.length) return <p className="mt-3 text-sm text-ink/50">Nenhuma designação.</p>;
  return <div className="mt-3 space-y-2">{rows.map(r => <div key={r.id} className="flex items-center justify-between rounded-lg bg-ink/5 px-3 py-2 text-sm"><div><span className="font-medium">{r.worker?.name}</span>{r.worker?.function?.name && <span className="ml-2 text-ink/50">• {r.worker.function.name}</span>}</div>{canManage && <button className="text-danger hover:underline" onClick={() => remove(r.id)}>Remover</button>}</div>)}</div>;
}

function AssignmentForm({ workers, onSubmit }) {
  return <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"><Field label="Obreiro" className="flex-1"><select name="workerId" required className="mt-1.5 w-full rounded-lg border border-ink/15 px-3.5 py-2.5 text-sm"><option value="">Selecione</option>{workers.filter(w => w.status === 'active').map(w => <option key={w.id} value={w.id}>{w.name}{w.function?.name ? ` — ${w.function.name}` : ''}</option>)}</select></Field><Field label="Observação" className="flex-1"><Input name="notes" /></Field><Button type="submit">Designar</Button></form>;
}
