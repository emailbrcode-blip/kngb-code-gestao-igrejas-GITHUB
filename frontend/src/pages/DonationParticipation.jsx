import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { listCampaignsRequest, listCampaignItemsRequest, listMyDonationsRequest } from '../lib/donationsService';
import { participateInCampaign } from '../lib/publicSiteService';

const statusLabels = { registered: 'Aguardando confirmação', confirmed: 'Confirmada', cancelled: 'Cancelada' };

export function DonationParticipation() {
  const { hasPermission } = useAuthStore();
  const [campaigns, setCampaigns] = useState([]); const [myDonations, setMyDonations] = useState([]);
  const [items, setItems] = useState([]); const [campaignId, setCampaignId] = useState(''); const [itemId, setItemId] = useState('');
  const [kind, setKind] = useState('money'); const [amount, setAmount] = useState(''); const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState(''); const [serviceDescription, setServiceDescription] = useState('');
  const [message, setMessage] = useState(''); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false);

  async function refresh() {
    const [available, mine] = await Promise.all([listCampaignsRequest(), listMyDonationsRequest()]);
    setCampaigns(available); setMyDonations(mine);
    setCampaignId((current) => current || available[0]?.id || '');
  }
  useEffect(() => { refresh().catch(() => setMessage('Não foi possível carregar campanhas e contribuições.')).finally(() => setLoading(false)); }, []);
  useEffect(() => { if (!campaignId) { setItems([]); return; } listCampaignItemsRequest(campaignId).then(setItems).catch(() => setItems([])); }, [campaignId]);

  async function submit(e) {
    e.preventDefault(); setSaving(true); setMessage('');
    try {
      const payload = { campaignId, kind, ...(itemId ? { itemId } : {}) };
      if (kind === 'money') payload.amount = Number(amount);
      if (kind === 'food' || kind === 'materials') { payload.quantity = Number(quantity); payload.unit = unit; }
      if (kind === 'service') payload.serviceDescription = serviceDescription.trim();
      await participateInCampaign(payload); setAmount(''); setQuantity(''); setUnit(''); setServiceDescription('');
      setMessage('Contribuição registrada como pendente. A equipe responsável fará a confirmação.'); await refresh();
    } catch (err) { setMessage(err.response?.data?.error?.message || 'Não foi possível registrar a contribuição.'); }
    finally { setSaving(false); }
  }

  if (!hasPermission('donations.participate')) return <p className="text-sm text-ink/60">Sua conta não tem acesso à participação em campanhas.</p>;
  if (loading) return <p className="text-sm text-ink/60">Carregando campanhas…</p>;
  return <div className="max-w-3xl">
    <h1 className="font-display text-2xl font-medium">Participar das campanhas</h1>
    <p className="mt-1 text-sm text-ink/60">Escolha uma campanha e registre sua contribuição. Ela ficará pendente até a confirmação.</p>
    <Card className="mt-5"><form onSubmit={submit} className="grid gap-4">
      {campaigns.length === 0 ? <p className="text-sm text-ink/60">Não há campanhas abertas para participação no momento.</p> : <>
        <label className="grid gap-1 text-sm">Campanha<select required value={campaignId} onChange={(e) => { setCampaignId(e.target.value); setItemId(''); }} className="rounded-lg border border-ink/15 p-3">{campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        {items.length > 0 && <label className="grid gap-1 text-sm">Item ou necessidade (opcional)<select value={itemId} onChange={(e) => setItemId(e.target.value)} className="rounded-lg border border-ink/15 p-3"><option value="">Contribuição geral</option>{items.map((i) => <option key={i.id} value={i.id}>{i.name}{i.unit ? ` (${i.unit})` : ''}</option>)}</select></label>}
        <label className="grid gap-1 text-sm">Tipo de contribuição<select value={kind} onChange={(e) => setKind(e.target.value)} className="rounded-lg border border-ink/15 p-3"><option value="money">Dinheiro</option><option value="food">Alimentos</option><option value="materials">Materiais</option><option value="service">Serviço</option></select></label>
        {kind === 'money' && <label className="grid gap-1 text-sm">Valor (R$)<input required type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="rounded-lg border border-ink/15 p-3" /></label>}
        {(kind === 'food' || kind === 'materials') && <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-sm">Quantidade<input required type="number" min="0.001" step="0.001" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="rounded-lg border border-ink/15 p-3" /></label><label className="grid gap-1 text-sm">Unidade (kg, unidade, caixa…)<input required maxLength="40" value={unit} onChange={(e) => setUnit(e.target.value)} className="rounded-lg border border-ink/15 p-3" /></label></div>}
        {kind === 'service' && <label className="grid gap-1 text-sm">Serviço oferecido<textarea required maxLength="2000" value={serviceDescription} onChange={(e) => setServiceDescription(e.target.value)} className="rounded-lg border border-ink/15 p-3" rows={3} /></label>}
        {message && <p role="status" className="text-sm text-ink/70">{message}</p>}
        <div className="flex justify-end"><Button disabled={saving || !campaignId}>{saving ? 'Enviando…' : 'Registrar contribuição'}</Button></div>
      </>}
      {campaigns.length === 0 && message && <p role="status" className="text-sm">{message}</p>}
    </form></Card>
    <h2 className="mt-7 font-display text-lg font-medium">Minhas contribuições</h2>
    <div className="mt-3 grid gap-3">{myDonations.length ? myDonations.map((d) => <Card key={d.id} className="flex flex-wrap justify-between gap-2"><div><p className="font-medium">{d.campaign?.name || 'Campanha'} · {d.kind === 'money' ? 'Dinheiro' : d.kind === 'service' ? 'Serviço' : d.kind === 'food' ? 'Alimentos' : 'Materiais'}</p><p className="text-sm text-ink/60">{d.amount != null ? `R$ ${Number(d.amount).toFixed(2)}` : `${d.quantity || ''} ${d.unit || ''} ${d.serviceDescription || ''}`}</p></div><span className="text-sm">{statusLabels[d.status] || d.status}</span></Card>) : <p className="text-sm text-ink/60">Você ainda não registrou contribuições.</p>}</div>
  </div>;
}
