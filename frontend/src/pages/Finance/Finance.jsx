import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Loading } from '../../components/ui/Loading';
import { EmptyState } from '../../components/ui/EmptyState';
import { FinanceEntryFormModal } from './FinanceEntryFormModal';
import { getFinanceSummaryRequest, listFinanceEntriesRequest, createFinanceEntryRequest, updateFinanceEntryRequest, deleteFinanceEntryRequest } from '../../lib/appServices';
import { formatDateBR } from '../../lib/dateUtils';

function formatMoney(v) {
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function Finance() {
  const { hasPermission } = useAuthStore();
  const [summary, setSummary] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // { mode: 'create' | 'edit', entry? }
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [filter, setFilter] = useState('all');

  const canCreate = hasPermission('finance.create');
  const canEdit = hasPermission('finance.edit');
  const canDelete = hasPermission('finance.delete');

  async function loadData() {
    setLoading(true);
    const [s, e] = await Promise.all([getFinanceSummaryRequest(), listFinanceEntriesRequest()]);
    setSummary(s); setEntries(e);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  async function handleCreate(payload) {
    setSubmitting(true); setFormError('');
    try { await createFinanceEntryRequest(payload); setModal(null); loadData(); }
    catch (err) { setFormError(err.response?.data?.error?.message || 'Não foi possível criar o lançamento.'); }
    finally { setSubmitting(false); }
  }

  async function handleEdit(payload) {
    setSubmitting(true); setFormError('');
    try {
      await updateFinanceEntryRequest(modal.entry.id, payload);
      setModal(null);
      await loadData(); // recarrega resumo e lançamentos juntos
    } catch (err) {
      setFormError(err.response?.data?.error?.message || 'Não foi possível atualizar o lançamento.');
    } finally { setSubmitting(false); }
  }

  async function handleDelete(id) {
    if (!window.confirm('Tem certeza que deseja excluir este registro? Esta ação não poderá ser desfeita.')) return;
    await deleteFinanceEntryRequest(id);
    loadData();
  }

  const filtered = entries.filter((e) => filter === 'all' || e.type === filter);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-medium text-ink">Financeiro</h1>
          <p className="mt-1 text-sm text-ink/60">Receitas, despesas e saldo da igreja.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/financeiro/dashboard" className="rounded-lg bg-coal px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-coal-light">📊 Dashboard Financeiro</Link>
          {canCreate && <Button variant="metal" onClick={() => setModal({ mode: 'create' })}>Novo lançamento</Button>}
        </div>
      </div>

      {loading ? <Loading /> : (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card><p className="text-xs text-ink/50">Receitas</p><p className="mt-1 font-display text-lg text-success">{formatMoney(summary.income)}</p></Card>
            <Card><p className="text-xs text-ink/50">Despesas</p><p className="mt-1 font-display text-lg text-danger">{formatMoney(summary.expense)}</p></Card>
            <Card><p className="text-xs text-ink/50">Saldo</p><p className="mt-1 font-display text-lg text-ink">{formatMoney(summary.balance)}</p></Card>
            <Card><p className="text-xs text-ink/50">Pendências</p><p className="mt-1 font-display text-lg text-metal-dark">{summary.pendingExpenses}</p></Card>
          </div>

          <div className="mt-5 flex gap-2">
            {[['all', 'Todos'], ['income', 'Receitas'], ['expense', 'Despesas']].map(([v, l]) => (
              <button key={v} onClick={() => setFilter(v)} className={`rounded-lg px-3.5 py-1.5 text-sm font-medium ${filter === v ? 'bg-coal text-white' : 'bg-ink/5 text-ink/60'}`}>{l}</button>
            ))}
          </div>

          <Card className="mt-4 overflow-hidden !p-0">
            {filtered.length === 0 ? <EmptyState message="Nenhum lançamento encontrado." /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-ink/10 bg-ink/[0.02] text-ink/50">
                    <tr>
                      <th className="px-5 py-3 font-medium">Descrição</th>
                      <th className="px-5 py-3 font-medium hidden sm:table-cell">Categoria</th>
                      <th className="px-5 py-3 font-medium">Data</th>
                      <th className="px-5 py-3 font-medium">Valor</th>
                      {(canEdit || canDelete) && <th className="px-5 py-3 font-medium">Ações</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((e) => (
                      <tr key={e.id} className="border-b border-ink/5 last:border-0">
                        <td className="px-5 py-3.5 text-ink">
                          {e.description}
                          {e.status === 'pending' && <Badge tone="warning">Pendente</Badge>}
                        </td>
                        <td className="px-5 py-3.5 text-ink/60 hidden sm:table-cell">{e.category?.name || '—'}</td>
                        <td className="px-5 py-3.5 text-ink/60">{formatDateBR(e.date)}</td>
                        <td className={`px-5 py-3.5 font-medium ${e.type === 'income' ? 'text-success' : 'text-danger'}`}>
                          {e.type === 'income' ? '+' : '-'} {formatMoney(e.amount)}
                        </td>
                        {(canEdit || canDelete) && (
                          <td className="px-5 py-3.5">
                            <div className="flex gap-3">
                              {canEdit && (
                                <button onClick={() => setModal({ mode: 'edit', entry: e })} className="text-sm text-coal hover:underline">editar</button>
                              )}
                              {canDelete && (
                                <button onClick={() => handleDelete(e.id)} className="text-sm text-ink/40 hover:text-danger hover:underline">excluir</button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {modal?.mode === 'create' && (
        <FinanceEntryFormModal onClose={() => setModal(null)} onSubmit={handleCreate} submitting={submitting} error={formError} />
      )}
      {modal?.mode === 'edit' && (
        <FinanceEntryFormModal initial={modal.entry} onClose={() => setModal(null)} onSubmit={handleEdit} submitting={submitting} error={formError} />
      )}
    </div>
  );
}
