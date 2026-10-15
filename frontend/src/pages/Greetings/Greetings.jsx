import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Loading } from '../../components/ui/Loading';
import { EmptyState } from '../../components/ui/EmptyState';
import { listWorshipsRequest } from '../../lib/worshipsService';
import { listWorkersRequest } from '../../lib/workersService';
import { listGreetingsRequest, createGreetingRequest, updateGreetingRequest, deleteGreetingRequest } from '../../lib/greetingsService.js';

const STATUS = { assigned: 'Designado', confirmed: 'Confirmado', declined: 'Recusado', substituted: 'Substituído' };

export function Greetings() {
  const { hasPermission } = useAuthStore();
  const [items, setItems] = useState([]); const [worships, setWorships] = useState([]); const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  const [form, setForm] = useState({ worshipId: '', workerId: '', notes: '' });
  const canManage = hasPermission('greetings.manage');
  async function load() { setLoading(true); try { const [a,b,c] = await Promise.all([listGreetingsRequest(), listWorshipsRequest(), listWorkersRequest()]); setItems(a); setWorships(b); setWorkers(c); } finally { setLoading(false); } }
  useEffect(() => { load(); }, []);
  async function submit(e) { e.preventDefault(); setSaving(true); setError(''); try { await createGreetingRequest(form); setForm({ worshipId:'', workerId:'', notes:'' }); await load(); } catch(err) { setError(err.response?.data?.error?.message || 'Não foi possível salvar.'); } finally { setSaving(false); } }
  async function changeStatus(id,status) { try { await updateGreetingRequest(id, { status }); await load(); } catch(err) { setError(err.response?.data?.error?.message || 'Não foi possível atualizar.'); } }
  async function remove(id) { if (!window.confirm('Excluir esta designação?')) return; await deleteGreetingRequest(id); await load(); }
  return <div className="max-w-5xl">
    <div><h1 className="font-display text-2xl font-medium text-ink">Saudação</h1><p className="mt-1 text-sm text-ink/60">Equipe designada para os cultos.</p></div>
    {canManage && <Card className="mt-5"><form onSubmit={submit} className="grid gap-3 md:grid-cols-4">
      <select required value={form.worshipId} onChange={e=>setForm({...form,worshipId:e.target.value})} className="rounded-lg border border-ink/10 px-3 py-2 text-sm"><option value="">Selecione o culto</option>{worships.map(w=><option key={w.id} value={w.id}>{new Date(w.date).toLocaleDateString('pt-BR')} — {w.theme || w.type}</option>)}</select>
      <select required value={form.workerId} onChange={e=>setForm({...form,workerId:e.target.value})} className="rounded-lg border border-ink/10 px-3 py-2 text-sm"><option value="">Selecione o obreiro</option>{workers.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select>
      <input value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Observação" className="rounded-lg border border-ink/10 px-3 py-2 text-sm" />
      <Button variant="metal" type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Adicionar'}</Button>
    </form>{error && <p className="mt-3 text-sm text-danger">{error}</p>}</Card>}
    {loading ? <Loading/> : items.length===0 ? <EmptyState message="Nenhuma designação cadastrada."/> : <div className="mt-5 space-y-3">{items.map(item=><Card key={item.id}><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-medium text-ink">{item.worker?.name}</p><p className="text-sm text-ink/50">{item.worship?.theme || item.worship?.type} — {new Date(item.worship?.date).toLocaleDateString('pt-BR')}</p></div><div className="flex items-center gap-2"><span className="rounded-full bg-ink/5 px-2.5 py-1 text-xs">{STATUS[item.status] || item.status}</span>{canManage && <><select value={item.status} onChange={e=>changeStatus(item.id,e.target.value)} className="rounded border border-ink/10 px-2 py-1 text-xs"><option value="assigned">Designado</option><option value="confirmed">Confirmado</option><option value="declined">Recusado</option><option value="substituted">Substituído</option></select><button onClick={()=>remove(item.id)} className="text-xs text-danger">Excluir</button></>}</div></div>{item.notes && <p className="mt-2 text-sm text-ink/60">{item.notes}</p>}</Card>)}</div>}
  </div>;
}
