import { useEffect, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { todayISODate } from '../../lib/dateUtils';
import { listCampaignItemsRequest } from '../../lib/donationsService';

export function DonationFormModal({ campaigns, donorUsers = [], onClose, onSubmit, submitting, error }) {
  const [form, setForm] = useState({
    campaignId: '', donorUserId: '', donorName: '', amount: '', kind: 'money', quantity: '', unit: '', serviceDescription: '', date: todayISODate(),
    type: 'oferta', paymentMethod: 'pix', reference: '', notes: '',
  });
  const [items, setItems] = useState([]);
  useEffect(() => { if (!form.campaignId) { setItems([]); return; } listCampaignItemsRequest(form.campaignId).then(setItems).catch(() => setItems([])); }, [form.campaignId]);

  function set(field, value) { setForm((f) => ({ ...f, [field]: value })); }

  function handleSubmit(e) {
    e.preventDefault();
    const payload = { ...form, date: new Date(form.date).toISOString() };
    if (!payload.donorUserId) delete payload.donorUserId;
    if (form.kind === 'money') payload.amount = Number(form.amount); else delete payload.amount;
    if (form.quantity) payload.quantity = Number(form.quantity); else delete payload.quantity;
    if (!payload.campaignId) delete payload.campaignId;
    if (!payload.itemId) delete payload.itemId;
    onSubmit(payload);
  }

  return (
    <Modal title="Nova doação" onClose={onClose}>
      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-ink/80">Vincular a usuário cadastrado</label>
          <select value={form.donorUserId} onChange={(e) => {
            const donorUserId = e.target.value;
            const user = donorUsers.find((item) => item.id === donorUserId);
            setForm((current) => ({ ...current, donorUserId, donorName: user?.name || current.donorName }));
          }} className="mt-1.5 w-full rounded-lg border border-ink/15 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-coal">
            <option value="">Sem vínculo com usuário</option>
            {donorUsers.map((user) => <option key={user.id} value={user.id}>{user.name}{user.email ? ` — ${user.email}` : ''}</option>)}
          </select>
          <label className="mt-3 block text-sm font-medium text-ink/80">Nome do doador</label>
          <input value={form.donorName} onChange={(e) => set('donorName', e.target.value)} placeholder="Opcional para doador sem conta"
            className="mt-1.5 w-full rounded-lg border border-ink/15 px-3.5 py-2.5 text-sm outline-none focus:border-coal" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-ink/80">Tipo de contribuição</label>
            <select value={form.kind} onChange={(e) => set('kind', e.target.value)} className="mt-1.5 w-full rounded-lg border border-ink/15 bg-white px-3.5 py-2.5 text-sm"><option value="money">Dinheiro</option><option value="food">Alimentos</option><option value="materials">Materiais</option><option value="service">Serviço</option></select>
          </div>
          {form.kind === 'money' ? <div>
            <label className="block text-sm font-medium text-ink/80">Valor (R$)</label>
            <input required type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => set('amount', e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-ink/15 px-3.5 py-2.5 text-sm outline-none focus:border-coal" />
          </div> : form.kind === 'service' ? <label className="grid gap-1 text-sm font-medium text-ink/80">Serviço oferecido<textarea required value={form.serviceDescription} onChange={(e) => set('serviceDescription', e.target.value)} className="mt-1.5 rounded-lg border border-ink/15 p-3 text-sm font-normal" rows="2" /></label> : <div className="grid grid-cols-2 gap-3"><label className="grid gap-1 text-sm font-medium text-ink/80">Quantidade<input required type="number" min="0.001" step="0.001" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} className="rounded-lg border border-ink/15 p-3 text-sm font-normal" /></label><label className="grid gap-1 text-sm font-medium text-ink/80">Unidade<input required value={form.unit} onChange={(e) => set('unit', e.target.value)} className="rounded-lg border border-ink/15 p-3 text-sm font-normal" /></label></div>}
          <div>
            <label className="block text-sm font-medium text-ink/80">Data</label>
            <input required type="date" value={form.date} onChange={(e) => set('date', e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-ink/15 px-3.5 py-2.5 text-sm outline-none focus:border-coal" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-ink/80">Tipo</label>
            <select value={form.type} onChange={(e) => set('type', e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-ink/15 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-coal">
              <option value="oferta">Oferta</option>
              <option value="dizimo">Dízimo</option>
              <option value="doacao">Doação</option>
              <option value="campanha">Campanha</option>
              <option value="missao">Missão</option>
              <option value="outro">Outro</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink/80">Método</label>
            <select value={form.paymentMethod} onChange={(e) => set('paymentMethod', e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-ink/15 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-coal">
              <option value="pix">PIX</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="cartao">Cartão</option>
              <option value="transferencia">Transferência</option>
              <option value="outro">Outro</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-ink/80">Campanha</label>
          <select value={form.campaignId} onChange={(e) => { set('campaignId', e.target.value); set('itemId', ''); }}
            className="mt-1.5 w-full rounded-lg border border-ink/15 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-coal">
            <option value="">Nenhuma (avulsa)</option>
            {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        {items.length > 0 && <div><label className="block text-sm font-medium text-ink/80">Necessidade da campanha</label><select value={form.itemId || ''} onChange={(e) => set('itemId', e.target.value)} className="mt-1.5 w-full rounded-lg border border-ink/15 bg-white px-3.5 py-2.5 text-sm"><option value="">Geral</option>{items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select></div>}

        {error && <p className="rounded-lg bg-danger/10 px-3.5 py-2.5 text-sm text-danger">{error}</p>}

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={submitting}>{submitting ? 'Salvando…' : 'Registrar'}</Button>
        </div>
      </form>
    </Modal>
  );
}
