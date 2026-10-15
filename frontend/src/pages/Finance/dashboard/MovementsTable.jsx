import { useEffect, useRef, useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Loading } from '../../../components/ui/Loading';
import { getFinanceMovements, apiErrorMessage } from '../../../lib/financeDashboardService';
import { brl, fmtISO, intBR } from './format';

const PAYMENT = { pix: 'PIX', dinheiro: 'Dinheiro', cartao: 'Cartão', transferencia: 'Transferência', boleto: 'Boleto', cheque: 'Cheque' };
const payLabel = (v) => (v ? PAYMENT[String(v).toLowerCase()] || v : '—');

const COLUMNS = [
  { key: 'date', label: 'Data' }, { key: 'description', label: 'Descrição' }, { key: 'category', label: 'Categoria' },
  { key: 'type', label: 'Tipo' }, { key: 'amount', label: 'Valor', right: true }, { key: 'payment', label: 'Forma de pgto.', nosort: true },
  { key: 'status', label: 'Situação' },
];

function StatusBadge({ status }) {
  return status === 'paid'
    ? <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">Efetivado</span>
    : <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Pendente</span>;
}

export function MovementsTable({ from, to, refreshKey }) {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('date');
  const [dir, setDir] = useState('desc');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');
  const [status, setStatus] = useState('paid');
  const [state, setState] = useState({ loading: true, error: '', data: null });
  const reqId = useRef(0);

  useEffect(() => { const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 350); return () => clearTimeout(t); }, [searchInput]);
  useEffect(() => { setPage(1); }, [from, to, type, status, sort, dir]);

  useEffect(() => {
    if (!from || !to) return undefined;
    const id = ++reqId.current;
    setState((s) => ({ ...s, loading: true, error: '' }));
    getFinanceMovements({ from, to, page, pageSize: 15, sort, dir, search: search || undefined, type, status })
      .then((data) => { if (id === reqId.current) setState({ loading: false, error: '', data }); })
      .catch((err) => { if (id === reqId.current) setState({ loading: false, error: apiErrorMessage(err), data: null }); });
    return undefined;
  }, [from, to, page, sort, dir, search, type, status, refreshKey]);

  function toggleSort(key) {
    if (key === 'payment') return;
    const field = key === 'category' ? 'category' : key;
    if (sort === field) setDir(dir === 'asc' ? 'desc' : 'asc'); else { setSort(field); setDir(field === 'date' || field === 'amount' ? 'desc' : 'asc'); }
  }
  const arrow = (key) => (sort === key ? (dir === 'asc' ? ' ↑' : ' ↓') : '');
  const { data } = state;

  return (
    <Card className="!p-0">
      <div className="space-y-3 border-b border-ink/10 p-4 sm:p-5">
        <h2 className="font-display text-lg text-ink">Movimentações do período</h2>
        <div className="grid gap-2 sm:grid-cols-4">
          <input type="search" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Pesquisar descrição ou categoria"
            aria-label="Pesquisar movimentações" className="rounded-lg border border-ink/15 px-3 py-2 text-sm sm:col-span-2" />
          <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Tipo" className="rounded-lg border border-ink/15 px-3 py-2 text-sm">
            <option value="all">Receitas e despesas</option><option value="income">Somente receitas</option><option value="expense">Somente despesas</option>
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Situação" className="rounded-lg border border-ink/15 px-3 py-2 text-sm">
            <option value="paid">Efetivadas (contam nos totais)</option><option value="pending">Pendentes (não contam)</option><option value="all">Todas</option>
          </select>
        </div>
        {data && <p className="text-xs text-ink/50">{intBR(data.total)} movimentação(ões) • Receitas {brl(data.sums.income)} • Despesas {brl(data.sums.expense)}</p>}
      </div>

      {state.loading && !data ? <Loading /> : state.error ? <p role="alert" className="p-6 text-sm text-danger">{state.error}</p> : data && data.items.length === 0 ? (
        <p className="p-8 text-center text-sm text-ink/45">Nenhuma movimentação encontrada com estes filtros.</p>
      ) : data && (
        <div className={state.loading ? 'opacity-60 transition-opacity' : ''}>
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ink/10 bg-ink/[0.02] text-ink/50">
                <tr>{COLUMNS.map((c) => (
                  <th key={c.key} className={`px-4 py-3 font-medium ${c.right ? 'text-right' : ''}`} aria-sort={sort === c.key ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                    {c.nosort ? c.label : <button type="button" onClick={() => toggleSort(c.key)} className="hover:text-ink">{c.label}{arrow(c.key)}</button>}
                  </th>))}</tr>
              </thead>
              <tbody>
                {data.items.map((e) => (
                  <tr key={e.id} className="border-b border-ink/5 last:border-0">
                    <td className="whitespace-nowrap px-4 py-3 text-ink/70">{fmtISO(e.date)}</td>
                    <td className="px-4 py-3 text-ink">{e.description}</td>
                    <td className="px-4 py-3 text-ink/70">{e.categoryName || 'Sem categoria'}</td>
                    <td className="px-4 py-3 text-ink/70">{e.type === 'income' ? 'Receita' : 'Despesa'}</td>
                    <td className={`whitespace-nowrap px-4 py-3 text-right font-medium ${e.type === 'income' ? 'text-success' : 'text-danger'}`}>{e.type === 'income' ? '+' : '−'} {brl(e.amount)}</td>
                    <td className="px-4 py-3 text-ink/70">{payLabel(e.paymentMethod)}</td>
                    <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
                  </tr>))}
              </tbody>
            </table>
          </div>
          <ul className="divide-y divide-ink/5 sm:hidden">
            {data.items.map((e) => (
              <li key={e.id} className="space-y-1 p-4">
                <div className="flex items-start justify-between gap-3"><p className="text-sm font-medium text-ink">{e.description}</p>
                  <p className={`shrink-0 text-sm font-semibold ${e.type === 'income' ? 'text-success' : 'text-danger'}`}>{e.type === 'income' ? '+' : '−'} {brl(e.amount)}</p></div>
                <p className="text-xs text-ink/55">{fmtISO(e.date)} • {e.categoryName || 'Sem categoria'} • {payLabel(e.paymentMethod)}</p>
                <StatusBadge status={e.status} />
              </li>))}
          </ul>
          <div className="flex items-center justify-between gap-3 border-t border-ink/10 p-4 text-sm">
            <Button variant="ghost" disabled={page <= 1 || state.loading} onClick={() => setPage(page - 1)}>Anterior</Button>
            <span className="text-ink/60">Página {data.page} de {data.totalPages}</span>
            <Button variant="ghost" disabled={page >= data.totalPages || state.loading} onClick={() => setPage(page + 1)}>Próxima</Button>
          </div>
        </div>
      )}
    </Card>
  );
}
