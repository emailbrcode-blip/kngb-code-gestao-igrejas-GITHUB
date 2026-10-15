import { useEffect, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { listFinanceCategoriesRequest } from '../../lib/appServices';
import { todayISODate } from '../../lib/dateUtils';

export function FinanceEntryFormModal({ initial, defaultType = 'income', onClose, onSubmit, submitting, error }) {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    type: initial?.type || defaultType,
    categorySlug: initial?.category?.slug || '',
    description: initial?.description || '',
    amount: initial?.amount ?? '',
    date: initial?.date ? initial.date.slice(0, 10) : todayISODate(),
    status: initial?.status || 'paid',
    dueDate: initial?.dueDate ? initial.dueDate.slice(0, 10) : '',
    paymentMethod: initial?.paymentMethod || '',
    notes: initial?.notes || '',
  });

  useEffect(() => { listFinanceCategoriesRequest().then(setCategories); }, []);

  function set(field, value) { setForm((f) => ({ ...f, [field]: value })); }

  function handleSubmit(e) {
    e.preventDefault();
    const payload = { ...form, amount: Number(form.amount), date: new Date(form.date).toISOString() };
    if (payload.dueDate) payload.dueDate = new Date(payload.dueDate).toISOString(); else delete payload.dueDate;
    if (!payload.categorySlug) delete payload.categorySlug;
    onSubmit(payload);
  }

  const filteredCategories = categories.filter((c) => c.type === form.type);

  return (
    <Modal title={initial ? 'Editar lançamento' : 'Novo lançamento'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div className="flex gap-2">
          <button type="button" onClick={() => set('type', 'income')} className={`flex-1 rounded-lg py-2 text-sm font-medium ${form.type === 'income' ? 'bg-success/15 text-success' : 'bg-ink/5 text-ink/50'}`}>Receita</button>
          <button type="button" onClick={() => set('type', 'expense')} className={`flex-1 rounded-lg py-2 text-sm font-medium ${form.type === 'expense' ? 'bg-danger/15 text-danger' : 'bg-ink/5 text-ink/50'}`}>Despesa</button>
        </div>
        <div>
          <label className="block text-sm font-medium text-ink/80">Descrição</label>
          <input required value={form.description} onChange={(e) => set('description', e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-ink/15 px-3.5 py-2.5 text-sm outline-none focus:border-coal" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-ink/80">Valor (R$)</label>
            <input required type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => set('amount', e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-ink/15 px-3.5 py-2.5 text-sm outline-none focus:border-coal" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink/80">Data</label>
            <input required type="date" value={form.date} onChange={(e) => set('date', e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-ink/15 px-3.5 py-2.5 text-sm outline-none focus:border-coal" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-ink/80">Categoria</label>
          <select value={form.categorySlug} onChange={(e) => set('categorySlug', e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-ink/15 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-coal">
            <option value="">Sem categoria</option>
            {filteredCategories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </select>
        </div>
        {form.type === 'expense' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-ink/80">Situação</label>
              <select value={form.status} onChange={(e) => set('status', e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-ink/15 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-coal">
                <option value="paid">Paga</option>
                <option value="pending">Pendente</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink/80">Vencimento</label>
              <input type="date" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-ink/15 px-3.5 py-2.5 text-sm outline-none focus:border-coal" />
            </div>
          </div>
        )}

        {error && <p className="rounded-lg bg-danger/10 px-3.5 py-2.5 text-sm text-danger">{error}</p>}

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={submitting}>{submitting ? 'Salvando…' : 'Salvar'}</Button>
        </div>
      </form>
    </Modal>
  );
}
