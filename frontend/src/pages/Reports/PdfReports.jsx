import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { downloadPdf } from '../../lib/reportsService';
import { listWorkersRequest } from '../../lib/workersService';

// Geração dos PDFs no novo padrão (membros, financeiro e participação de obreiros).
// Os filtros vão para os mesmos endpoints dos botões de download.
const field = 'w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-coal';
const Label = ({ children, text }) => <label className="grid gap-1 text-xs font-medium text-ink/60">{text}{children}</label>;

function qs(obj) {
  const p = new URLSearchParams();
  Object.entries(obj).forEach(([k, v]) => { if (v !== '' && v !== undefined && v !== null && v !== false) p.set(k, v === true ? 'true' : v); });
  const s = p.toString();
  return s ? `?${s}` : '';
}
async function errorText(err) {
  try { const t = await err.response.data.text(); return JSON.parse(t).error.message; } catch { return 'Não foi possível gerar o PDF.'; }
}

function useDownload() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function run(path, filename) {
    setBusy(true); setError('');
    try { await downloadPdf(path, filename); } catch (err) { setError(await errorText(err)); } finally { setBusy(false); }
  }
  return { busy, error, run };
}

function MembersPdf() {
  const [f, setF] = useState({ status: 'all', from: '', to: '', ministry: '', q: '' });
  const d = useDownload();
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  return (
    <Card className="space-y-3">
      <div><p className="text-sm font-medium text-ink/80">📄 Relatório de membros (PDF)</p><p className="text-xs text-ink/50">Nome, RMA, cargo, entrada, saída e situação.</p></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Label text="Situação"><select value={f.status} onChange={set('status')} className={field}><option value="all">Todas</option><option value="active">Ativos</option><option value="inactive">Inativos</option><option value="transferred">Transferidos</option><option value="away">Afastados</option><option value="visitor">Visitantes</option></select></Label>
        <Label text="Ministério"><input value={f.ministry} onChange={set('ministry')} className={field} /></Label>
        <Label text="Entrada a partir de"><input type="date" value={f.from} onChange={set('from')} className={field} /></Label>
        <Label text="Entrada até"><input type="date" value={f.to} onChange={set('to')} className={field} /></Label>
        <div className="sm:col-span-2"><Label text="Nome contém"><input value={f.q} onChange={set('q')} className={field} /></Label></div>
      </div>
      {d.error && <p role="alert" className="text-sm text-danger">{d.error}</p>}
      <Button onClick={() => d.run(`/pdf/members${qs(f)}`, 'relatorio-membros.pdf')} disabled={d.busy}>{d.busy ? 'Gerando…' : 'Gerar PDF'}</Button>
    </Card>
  );
}

function FinancePdf() {
  const [mode, setMode] = useState('month');
  const now = new Date();
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [from, setFrom] = useState(''); const [to, setTo] = useState('');
  const [type, setType] = useState('all'); const [status, setStatus] = useState('all');
  const d = useDownload();
  const params = mode === 'month' ? { month, type, status } : { from, to, type, status };
  return (
    <Card className="space-y-3">
      <div><p className="text-sm font-medium text-ink/80">📄 Relatório financeiro (PDF)</p><p className="text-xs text-ink/50">Lançamentos com data, registro, vencimento, categoria, tipo, situação e valor.</p></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Label text="Período"><select value={mode} onChange={(e) => setMode(e.target.value)} className={field}><option value="month">Mês específico</option><option value="range">Intervalo de datas</option></select></Label>
        {mode === 'month' ? <Label text="Mês"><input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className={field} /></Label> : <span />}
        {mode === 'range' && <><Label text="Data inicial"><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={field} /></Label><Label text="Data final"><input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={field} /></Label></>}
        <Label text="Tipo"><select value={type} onChange={(e) => setType(e.target.value)} className={field}><option value="all">Entradas e saídas</option><option value="income">Somente entradas</option><option value="expense">Somente saídas</option></select></Label>
        <Label text="Situação"><select value={status} onChange={(e) => setStatus(e.target.value)} className={field}><option value="all">Todas</option><option value="paid">Efetivados</option><option value="pending">Pendentes</option></select></Label>
      </div>
      {d.error && <p role="alert" className="text-sm text-danger">{d.error}</p>}
      <Button onClick={() => d.run(`/pdf/financial${qs(params)}`, 'relatorio-financeiro.pdf')} disabled={d.busy}>{d.busy ? 'Gerando…' : 'Gerar PDF'}</Button>
    </Card>
  );
}

function WorkersPdf() {
  const [workers, setWorkers] = useState([]);
  const [f, setF] = useState({ workerId: '', ministry: '', from: '', to: '', status: 'all', detail: true });
  const d = useDownload();
  useEffect(() => { listWorkersRequest().then(setWorkers).catch(() => {}); }, []);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  return (
    <Card className="space-y-3">
      <div><p className="text-sm font-medium text-ink/80">📄 Participação dos obreiros nas escalas (PDF)</p><p className="text-xs text-ink/50">Escalas e confirmações registradas — sem ranking nem pontuação.</p></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Label text="Obreiro"><select value={f.workerId} onChange={set('workerId')} className={field}><option value="">Todos os obreiros ativos</option>{workers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></Label>
        <Label text="Ministério"><input value={f.ministry} onChange={set('ministry')} className={field} disabled={Boolean(f.workerId)} /></Label>
        <Label text="Escalas a partir de"><input type="date" value={f.from} onChange={set('from')} className={field} /></Label>
        <Label text="Escalas até"><input type="date" value={f.to} onChange={set('to')} className={field} /></Label>
        <Label text="Situação da escala"><select value={f.status} onChange={set('status')} className={field}><option value="all">Todas</option><option value="confirmed">Confirmadas</option><option value="pending">Pendentes</option><option value="called">Convocadas</option><option value="declined">Recusadas</option><option value="substituted">Substituídas</option></select></Label>
        <label className="flex items-end gap-2 pb-2 text-sm text-ink/70"><input type="checkbox" checked={f.detail} onChange={(e) => setF((x) => ({ ...x, detail: e.target.checked }))} /> Incluir histórico detalhado das escalas</label>
      </div>
      {d.error && <p role="alert" className="text-sm text-danger">{d.error}</p>}
      <Button onClick={() => d.run(`/pdf/worker-participation${qs({ ...f, detail: f.detail ? 'true' : 'false', ministry: f.workerId ? '' : f.ministry })}`, 'participacao-obreiros.pdf')} disabled={d.busy}>{d.busy ? 'Gerando…' : 'Gerar PDF'}</Button>
    </Card>
  );
}

export function PdfReports() {
  const { hasPermission } = useAuthStore();
  const any = hasPermission('members.view') || hasPermission('finance.view') || hasPermission('workers.view');
  if (!any) return null;
  return (
    <section className="mt-8" aria-labelledby="pdf-title">
      <h2 id="pdf-title" className="font-display text-xl font-medium text-ink">Gerar relatórios em PDF</h2>
      <p className="mt-1 text-sm text-ink/60">Escolha os filtros e gere o documento no novo padrão visual.</p>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {hasPermission('members.view') && <MembersPdf />}
        {hasPermission('finance.view') && <FinancePdf />}
        {hasPermission('workers.view') && <WorkersPdf />}
      </div>
    </section>
  );
}
