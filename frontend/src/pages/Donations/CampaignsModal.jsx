import { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { createCampaignRequest, updateCampaignRequest, deleteCampaignRequest, createCampaignItemRequest, createCampaignExpenseRequest, transferCampaignToFinanceRequest } from '../../lib/donationsService';

export function CampaignsModal({ campaigns, onClose, onChanged, canManageExpenses, canPostFinancial }) {
  const [form, setForm] = useState({ name: '', description: '', type: 'campanha', goalAmount: '', goalQuantity: '', quantityUnit: '', startDate: '', endDate: '', isPublic: true });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [itemCampaign, setItemCampaign] = useState('');
  const [itemName, setItemName] = useState(''); const [itemUnit, setItemUnit] = useState(''); const [itemTargetQuantity, setItemTargetQuantity] = useState('');
  const [expenseCampaign, setExpenseCampaign] = useState(''); const [expenseForm, setExpenseForm] = useState({ description: '', amount: '' }); const [transferAmounts, setTransferAmounts] = useState({});

  function set(field, value) { setForm((f) => ({ ...f, [field]: value })); }

  async function handleCreate(e) {
    e.preventDefault();
    setSubmitting(true); setError('');
    try {
      const payload = { name: form.name, type: form.type, isPublic: form.isPublic };
      if (form.description) payload.description = form.description;
      if (form.goalAmount) payload.goalAmount = Number(form.goalAmount);
      if (form.goalQuantity) payload.goalQuantity = Number(form.goalQuantity);
      if (form.quantityUnit) payload.quantityUnit = form.quantityUnit;
      if (form.startDate) payload.startDate = new Date(`${form.startDate}T00:00:00`).toISOString();
      if (form.endDate) payload.endDate = new Date(`${form.endDate}T23:59:59`).toISOString();
      await createCampaignRequest(payload);
      setForm({ name: '', description: '', type: 'campanha', goalAmount: '', goalQuantity: '', quantityUnit: '', startDate: '', endDate: '', isPublic: true });
      onChanged();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Não foi possível criar a campanha.');
    } finally { setSubmitting(false); }
  }

  async function toggleActive(c) {
    await updateCampaignRequest(c.id, { active: !c.active });
    onChanged();
  }

  async function togglePublic(c) {
    setError(''); setSubmitting(true);
    try { await updateCampaignRequest(c.id, { isPublic: !c.isPublic }); onChanged(); }
    catch (err) { setError(err.response?.data?.error?.message || 'Não foi possível alterar a publicação da campanha.'); }
    finally { setSubmitting(false); }
  }

  async function handleDeleteCampaign(campaign) {
    if (!window.confirm('Tem certeza que deseja excluir este registro? Esta ação não poderá ser desfeita. As doações, itens, despesas e históricos desta campanha também serão removidos.')) return;
    setError(''); setSubmitting(true);
    try { await deleteCampaignRequest(campaign.id); onChanged(); }
    catch (err) { setError(err.response?.data?.error?.message || 'Não foi possível excluir a campanha.'); }
    finally { setSubmitting(false); }
  }

  async function saveItem(e) {
    e.preventDefault(); setError(''); setSubmitting(true);
    try { await createCampaignItemRequest(itemCampaign, { name: itemName, ...(itemUnit ? { unit: itemUnit } : {}), ...(itemTargetQuantity ? { targetQuantity: Number(itemTargetQuantity) } : {}) }); setItemName(''); setItemUnit(''); setItemTargetQuantity(''); setItemCampaign(''); onChanged(); }
    catch (err) { setError(err.response?.data?.error?.message || 'Não foi possível adicionar a necessidade.'); }
    finally { setSubmitting(false); }
  }
  async function saveExpense(e) { e.preventDefault(); setError(''); setSubmitting(true); try { await createCampaignExpenseRequest(expenseCampaign, { description: expenseForm.description, amount: Number(expenseForm.amount), date: new Date().toISOString() }); setExpenseForm({ description: '', amount: '' }); setExpenseCampaign(''); onChanged(); } catch (err) { setError(err.response?.data?.error?.message || 'Não foi possível registrar a despesa.'); } finally { setSubmitting(false); } }
  async function postTransfer(campaign) { const amount = Number(transferAmounts[campaign.id]); if (!(amount > 0)) return; if (!window.confirm(`Registrar R$ ${amount.toFixed(2)} como receita no Financeiro oficial para “${campaign.name}”?`)) return; setError(''); setSubmitting(true); try { await transferCampaignToFinanceRequest(campaign.id, { amount, date: new Date().toISOString() }); setTransferAmounts((x) => ({ ...x, [campaign.id]: '' })); setError('Repasse registrado no Financeiro oficial.'); onChanged(); } catch (err) { setError(err.response?.data?.error?.message || 'Não foi possível registrar o repasse.'); } finally { setSubmitting(false); } }

  return (
    <Modal title="Campanhas de doação" onClose={onClose} wide>
      <form onSubmit={handleCreate} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <input required placeholder="Nome (ex: Bolo dos Aniversariantes — Setembro)" value={form.name}
          onChange={(e) => set('name', e.target.value)}
          className="sm:col-span-2 rounded-lg border border-ink/15 px-3.5 py-2.5 text-sm outline-none focus:border-coal" />
        <input type="number" min="0" step="0.01" placeholder="Meta (R$, opcional)" value={form.goalAmount}
          onChange={(e) => set('goalAmount', e.target.value)}
          className="rounded-lg border border-ink/15 px-3.5 py-2.5 text-sm outline-none focus:border-coal" />
        <select value={form.type} onChange={(e) => set('type', e.target.value)} className="rounded-lg border border-ink/15 bg-white px-3.5 py-2.5 text-sm"><option value="campanha">Campanha geral</option><option value="alimentos">Alimentos</option><option value="materiais">Materiais</option><option value="servicos">Serviços</option><option value="evento">Evento</option><option value="missao">Missão</option><option value="outro">Outro</option></select>
        <textarea placeholder="Descrição" value={form.description} onChange={(e) => set('description', e.target.value)} className="rounded-lg border border-ink/15 px-3.5 py-2.5 text-sm sm:col-span-2" rows="2" />
        <div className="grid grid-cols-2 gap-2"><input type="number" min="0.001" step="0.001" placeholder="Meta quantidade" value={form.goalQuantity} onChange={(e) => set('goalQuantity', e.target.value)} className="min-w-0 rounded-lg border border-ink/15 px-3 py-2 text-sm" /><input placeholder="Unidade" value={form.quantityUnit} onChange={(e) => set('quantityUnit', e.target.value)} className="min-w-0 rounded-lg border border-ink/15 px-3 py-2 text-sm" /></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isPublic} onChange={(e) => set('isPublic', e.target.checked)} /> Mostrar no site público</label>
        <input type="date" aria-label="Início" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} className="rounded-lg border border-ink/15 px-3.5 py-2.5 text-sm" />
        <input type="date" aria-label="Encerramento" value={form.endDate} onChange={(e) => set('endDate', e.target.value)} className="rounded-lg border border-ink/15 px-3.5 py-2.5 text-sm" />
        <div className="sm:col-span-3 flex justify-end">
          <Button type="submit" disabled={submitting || !form.name}>Criar campanha</Button>
        </div>
      </form>

      {error && <p className="mt-3 rounded-lg bg-danger/10 px-3.5 py-2.5 text-sm text-danger">{error}</p>}

      <div className="mt-5 max-h-72 overflow-y-auto divide-y divide-ink/5">
        {campaigns.map((c) => (
          <div key={c.id} className="py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-ink">{c.name}</span>
              <button onClick={() => toggleActive(c)} className="text-xs text-coal hover:underline">
                {c.active ? 'encerrar' : 'reabrir'}
              </button>
            </div>
            <p className="mt-1 text-xs text-ink/55">Site público: {c.isPublic ? 'publicada' : 'não publicada'} · {c.active ? 'ativa' : 'encerrada'}</p>
            <button type="button" onClick={() => togglePublic(c)} className="mt-1 text-xs font-medium text-coal underline" disabled={submitting}>{c.isPublic ? 'Retirar do site público' : 'Publicar no site público'}</button>
            <p className="mt-1 text-xs text-ink/50">
              Arrecadado: R$ {c.raisedAmount.toFixed(2)}{c.goalAmount ? ` de R$ ${Number(c.goalAmount).toFixed(2)}` : ''} — {c.donorCount} doações confirmadas
            </p>
            <button type="button" onClick={() => { setItemCampaign(c.id); setItemName(''); }} className="mt-2 text-xs font-medium text-coal underline">Adicionar necessidade</button>
            <button type="button" onClick={() => handleDeleteCampaign(c)} className="ml-3 mt-2 text-xs font-medium text-danger underline" disabled={submitting}>Excluir</button>
            {canManageExpenses && <button type="button" onClick={() => setExpenseCampaign(expenseCampaign === c.id ? '' : c.id)} className="ml-3 mt-2 text-xs font-medium text-coal underline">Registrar despesa</button>}
            {canPostFinancial && <div className="mt-3 flex flex-wrap gap-2"><input type="number" min="0.01" step="0.01" value={transferAmounts[c.id] || ''} onChange={(e) => setTransferAmounts((x) => ({ ...x, [c.id]: e.target.value }))} placeholder="Valor do repasse (R$)" className="min-w-0 rounded-lg border border-ink/15 px-3 py-2 text-sm" /><Button type="button" disabled={submitting} onClick={() => postTransfer(c)}>Lançar no Financeiro</Button></div>}
            {itemCampaign === c.id && <form onSubmit={saveItem} className="mt-2 grid gap-2 sm:grid-cols-4"><input required value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="Ex.: cesta básica" className="min-w-0 rounded-lg border border-ink/15 px-3 py-2 text-sm sm:col-span-2" /><input type="number" min="0.001" step="0.001" value={itemTargetQuantity} onChange={(e) => setItemTargetQuantity(e.target.value)} placeholder="Meta" className="min-w-0 rounded-lg border border-ink/15 px-3 py-2 text-sm" /><input value={itemUnit} onChange={(e) => setItemUnit(e.target.value)} placeholder="Unidade" className="min-w-0 rounded-lg border border-ink/15 px-3 py-2 text-sm" /><Button type="submit" disabled={submitting} className="sm:col-span-4">Salvar item</Button></form>}
            {expenseCampaign === c.id && <form onSubmit={saveExpense} className="mt-2 grid gap-2 sm:grid-cols-3"><input required value={expenseForm.description} onChange={(e) => setExpenseForm((x) => ({ ...x, description: e.target.value }))} placeholder="Descrição da despesa da campanha" className="rounded-lg border border-ink/15 px-3 py-2 text-sm sm:col-span-2" /><input required type="number" min="0.01" step="0.01" value={expenseForm.amount} onChange={(e) => setExpenseForm((x) => ({ ...x, amount: e.target.value }))} placeholder="Valor" className="rounded-lg border border-ink/15 px-3 py-2 text-sm" /><Button type="submit" disabled={submitting} className="sm:col-span-3">Salvar despesa interna</Button></form>}
          </div>
        ))}
        {campaigns.length === 0 && <p className="py-6 text-center text-sm text-ink/40">Nenhuma campanha criada ainda.</p>}
      </div>

      <div className="mt-5 flex justify-end">
        <Button variant="ghost" onClick={onClose}>Fechar</Button>
      </div>
    </Modal>
  );
}
