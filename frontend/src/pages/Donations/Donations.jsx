import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Loading } from '../../components/ui/Loading';
import { EmptyState } from '../../components/ui/EmptyState';
import { DonationFormModal } from './DonationFormModal';
import { CampaignsModal } from './CampaignsModal';
import {
  listDonationsRequest, listDonationDonorsRequest, createDonationRequest, updateDonationStatusRequest, listCampaignsRequest, sendDonationReminderRequest, deleteDonationRequest,
} from '../../lib/donationsService';
import { formatDateBR } from '../../lib/dateUtils';

const STATUS_LABEL = { registered: 'Pendente', confirmed: 'Confirmada', cancelled: 'Cancelada' };
const STATUS_TONE = { registered: 'warning', confirmed: 'success', cancelled: 'neutral' };

export function Donations() {
  const { hasPermission } = useAuthStore();
  const [donations, setDonations] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [donorUsers, setDonorUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showCampaigns, setShowCampaigns] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [filter, setFilter] = useState('all');
  const [campaignFilter, setCampaignFilter] = useState(''); const [kindFilter, setKindFilter] = useState(''); const [fromDate, setFromDate] = useState(''); const [toDate, setToDate] = useState('');

  const canCreate = hasPermission('donations.create');
  const canManage = hasPermission('donations.manage');
  const canRemind = hasPermission('donations.reminders.send');

  async function loadData() {
    setLoading(true);
    const [d, c] = await Promise.all([listDonationsRequest(), listCampaignsRequest()]);
    setDonations(d); setCampaigns(c);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (!showCreate) return;
    listDonationDonorsRequest().then(setDonorUsers).catch(() => setDonorUsers([]));
  }, [showCreate]);

  async function handleCreate(payload) {
    setSubmitting(true); setFormError('');
    try { await createDonationRequest(payload); setShowCreate(false); loadData(); }
    catch (err) { setFormError(err.response?.data?.error?.message || 'Não foi possível registrar a doação.'); }
    finally { setSubmitting(false); }
  }

  async function handleStatusChange(id, status) {
    try { await updateDonationStatusRequest(id, status); setFormError(''); await loadData(); }
    catch (err) { setFormError(err.response?.data?.error?.message || 'Não foi possível alterar o status.'); }
  }
  async function handleDeleteDonation(donation) {
    if (!window.confirm('Tem certeza que deseja excluir este registro? Esta ação não poderá ser desfeita.')) return;
    try { await deleteDonationRequest(donation.id); await loadData(); }
    catch (err) { setFormError(err.response?.data?.error?.message || 'Não foi possível excluir a doação.'); }
  }
  async function handleReminder(id) { try { await sendDonationReminderRequest(id); setFormError('Lembrete enviado ao doador.'); } catch (err) { setFormError(err.response?.data?.error?.message || 'Não foi possível enviar o lembrete.'); } }

  const filtered = donations.filter((d) => (filter === 'all' || d.status === filter) && (!campaignFilter || d.campaignId === campaignFilter) && (!kindFilter || d.kind === kindFilter) && (!fromDate || new Date(d.date) >= new Date(`${fromDate}T00:00:00`)) && (!toDate || new Date(d.date) <= new Date(`${toDate}T23:59:59`)));
  const confirmed = filtered.filter((d) => d.status === 'confirmed');
  const confirmedAmount = confirmed.reduce((sum, d) => sum + Number(d.amount || 0), 0);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-medium text-ink">Doações</h1>
          <p className="mt-1 text-sm text-ink/60">Ofertas, dízimos, campanhas e o Bolo dos Aniversariantes.</p>
        </div>
        <div className="flex gap-2">
          {canManage && <Button variant="ghost" onClick={() => setShowCampaigns(true)}>Campanhas</Button>}
          {canCreate && <Button variant="metal" onClick={() => setShowCreate(true)}>Nova doação</Button>}
        </div>
      </div>

      <div className="mt-5 flex gap-2">
        {[['all', 'Todas'], ['registered', 'Pendentes'], ['confirmed', 'Confirmadas'], ['cancelled', 'Canceladas']].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)} className={`rounded-lg px-3.5 py-1.5 text-sm font-medium ${filter === v ? 'bg-coal text-white' : 'bg-ink/5 text-ink/60'}`}>{l}</button>
        ))}
      </div>
      {canManage && <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label className="grid gap-1 text-xs text-ink/60">Campanha<select value={campaignFilter} onChange={(e) => setCampaignFilter(e.target.value)} className="rounded-lg border border-ink/15 bg-white p-2 text-sm"><option value="">Todas</option>{campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label className="grid gap-1 text-xs text-ink/60">Tipo de contribuição<select value={kindFilter} onChange={(e) => setKindFilter(e.target.value)} className="rounded-lg border border-ink/15 bg-white p-2 text-sm"><option value="">Todos</option><option value="money">Dinheiro</option><option value="food">Alimentos</option><option value="materials">Materiais</option><option value="service">Serviço</option></select></label><label className="grid gap-1 text-xs text-ink/60">De<input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="rounded-lg border border-ink/15 bg-white p-2 text-sm" /></label><label className="grid gap-1 text-xs text-ink/60">Até<input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="rounded-lg border border-ink/15 bg-white p-2 text-sm" /></label></div>}
      {formError && <p role="alert" className="mt-3 rounded-lg bg-danger/10 p-3 text-sm text-danger">{formError}</p>}
      {canManage && <div className="mt-4 grid gap-3 sm:grid-cols-3"><Card><p className="text-xs text-ink/55">Doações confirmadas</p><p className="mt-1 text-xl font-semibold">{confirmed.length}</p></Card><Card><p className="text-xs text-ink/55">Valor confirmado no filtro</p><p className="mt-1 text-xl font-semibold">R$ {confirmedAmount.toFixed(2)}</p></Card><Card><p className="text-xs text-ink/55">Campanhas ativas</p><p className="mt-1 text-xl font-semibold">{campaigns.filter((c) => c.active).length}</p></Card></div>}

      <Card className="mt-4 overflow-hidden !p-0">
        {loading ? <Loading /> : filtered.length === 0 ? (
          <EmptyState message="Nenhuma doação encontrada." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ink/10 bg-ink/[0.02] text-ink/50">
                <tr>
                  <th className="px-5 py-3 font-medium">Doador</th>
                  <th className="px-5 py-3 font-medium hidden sm:table-cell">Campanha</th>
                  <th className="px-5 py-3 font-medium">Data</th>
                  <th className="px-5 py-3 font-medium">Valor</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  {(canManage || canRemind) && <th className="px-5 py-3 font-medium">Ações</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id} className="border-b border-ink/5 last:border-0">
                    <td className="px-5 py-3.5 text-ink">{d.donorMember?.fullName || d.donorUser?.name || d.donorName || 'Anônimo'}</td>
                    <td className="px-5 py-3.5 text-ink/60 hidden sm:table-cell">{d.campaign?.name || '—'}</td>
                    <td className="px-5 py-3.5 text-ink/60">{formatDateBR(d.date)}</td>
                    <td className="px-5 py-3.5 font-medium text-ink">{d.kind === 'money' ? `R$ ${Number(d.amount || 0).toFixed(2)}` : d.kind === 'service' ? d.serviceDescription : `${Number(d.quantity || 0)} ${d.unit || ''}`}</td>
                    <td className="px-5 py-3.5"><Badge tone={STATUS_TONE[d.status]}>{STATUS_LABEL[d.status]}</Badge></td>
                    {(canManage || canRemind) && (
                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap gap-2">
                          {d.status === 'registered' && <>
                            {canRemind && d.donorUserId && <button onClick={() => handleReminder(d.id)} className="text-xs font-medium text-metal-dark hover:underline">lembrar</button>}
                            {canManage && <>
                            <button onClick={() => handleStatusChange(d.id, 'confirmed')} className="text-xs font-medium text-success hover:underline">confirmar</button>
                            <button onClick={() => handleStatusChange(d.id, 'cancelled')} className="text-xs font-medium text-danger hover:underline">cancelar</button>
                            </>}
                          </>}
                          {canManage && <button onClick={() => handleDeleteDonation(d)} className="text-xs font-medium text-danger hover:underline">Excluir</button>}
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

      {showCreate && (
        <DonationFormModal campaigns={campaigns.filter((c) => c.active)} donorUsers={donorUsers} onClose={() => setShowCreate(false)} onSubmit={handleCreate} submitting={submitting} error={formError} />
      )}
      {showCampaigns && (
        <CampaignsModal campaigns={campaigns} onClose={() => setShowCampaigns(false)} onChanged={loadData} canManageExpenses={hasPermission('donations.expenses.manage')} canPostFinancial={hasPermission('donations.finance_post') && hasPermission('finance.create')} />
      )}
    </div>
  );
}
