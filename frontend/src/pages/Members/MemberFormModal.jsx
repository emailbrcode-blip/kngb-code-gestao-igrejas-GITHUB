import { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { PhotoField } from '../../components/PhotoField';
import { formatRma } from '../../lib/cardDownload';

const STATUS_LABELS = {
  active: 'Ativo', inactive: 'Inativo', visitor: 'Visitante', transferred: 'Transferido', away: 'Afastado',
};

export function MemberFormModal({ initial, members, linkableUsers = [], onClose, onSubmit, submitting, error }) {
  const [form, setForm] = useState({
    fullName: initial?.fullName || '',
    userId: initial?.userId || initial?.user?.id || '',
    phone: initial?.phone || '',
    whatsapp: initial?.whatsapp || '',
    email: initial?.email || '',
    address: initial?.address || '',
    ministry: initial?.ministry || '',
    groupName: initial?.groupName || '',
    status: initial?.status || 'active',
    birthDate: initial?.birthDate ? initial.birthDate.slice(0, 10) : '',
    joinDate: initial?.joinDate ? initial.joinDate.slice(0, 10) : '',
    exitDate: initial?.exitDate ? initial.exitDate.slice(0, 10) : '',
    photoUrl: initial?.photoUrl || '',
    responsibleId: initial?.responsibleId || '',
    notes: initial?.notes || '',
  });

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const payload = { ...form };
    if (payload.birthDate) payload.birthDate = new Date(payload.birthDate).toISOString();
    else delete payload.birthDate;
    if (payload.joinDate) payload.joinDate = new Date(payload.joinDate).toISOString();
    else delete payload.joinDate;
    payload.exitDate = payload.exitDate ? new Date(payload.exitDate).toISOString() : ''; // '' limpa a data de saída
    if (!payload.responsibleId) delete payload.responsibleId;
    payload.userId = payload.userId || null;
    onSubmit(payload);
  }

  const availableUsers = [...linkableUsers, ...(initial?.user ? [initial.user] : [])]
    .filter((user, index, items) => items.findIndex((candidate) => candidate.id === user.id) === index);

  return (
    <Modal title={initial ? 'Editar membro' : 'Novo membro'} onClose={onClose} wide>
      <form onSubmit={handleSubmit} className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-ink/80">Conta de usuário vinculada</label>
          <select value={form.userId} onChange={(e) => {
            const userId = e.target.value;
            const account = availableUsers.find((user) => user.id === userId);
            setForm((current) => ({ ...current, userId, ...(account ? { fullName: account.name, email: account.email || current.email } : {}) }));
          }} className="mt-1.5 w-full rounded-lg border border-ink/15 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-coal">
            <option value="">Sem conta vinculada</option>
            {availableUsers.map((account) => <option key={account.id} value={account.id}>{account.name} — {account.email}</option>)}
          </select>
          <p className="mt-1 text-xs text-ink/50">Ao escolher uma conta, nome e e-mail são preenchidos. O vínculo é pela conta, não pelo telefone.</p>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-ink/80">Nome completo</label>
          <input required value={form.fullName} onChange={(e) => set('fullName', e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-ink/15 px-3.5 py-2.5 text-sm outline-none focus:border-coal" />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink/80">Telefone</label>
          <input value={form.phone} onChange={(e) => set('phone', e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-ink/15 px-3.5 py-2.5 text-sm outline-none focus:border-coal" />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink/80">WhatsApp</label>
          <input value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-ink/15 px-3.5 py-2.5 text-sm outline-none focus:border-coal" />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink/80">E-mail</label>
          <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-ink/15 px-3.5 py-2.5 text-sm outline-none focus:border-coal" />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink/80">Data de nascimento</label>
          <input type="date" value={form.birthDate} onChange={(e) => set('birthDate', e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-ink/15 px-3.5 py-2.5 text-sm outline-none focus:border-coal" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-ink/80">Endereço</label>
          <input value={form.address} onChange={(e) => set('address', e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-ink/15 px-3.5 py-2.5 text-sm outline-none focus:border-coal" />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink/80">Ministério</label>
          <input value={form.ministry} onChange={(e) => set('ministry', e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-ink/15 px-3.5 py-2.5 text-sm outline-none focus:border-coal" />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink/80">Grupo/Célula</label>
          <input value={form.groupName} onChange={(e) => set('groupName', e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-ink/15 px-3.5 py-2.5 text-sm outline-none focus:border-coal" />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink/80">Data de entrada</label>
          <input type="date" value={form.joinDate} onChange={(e) => set('joinDate', e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-ink/15 px-3.5 py-2.5 text-sm outline-none focus:border-coal" />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink/80">Data de saída</label>
          <input type="date" value={form.exitDate} onChange={(e) => set('exitDate', e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-ink/15 px-3.5 py-2.5 text-sm outline-none focus:border-coal" />
          <p className="mt-1 text-xs text-ink/50">Preencha só quando a pessoa deixar a igreja. Fica em branco para quem está ativo.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-ink/80">Situação</label>
          <select value={form.status} onChange={(e) => set('status', e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-ink/15 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-coal">
            {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <PhotoField value={form.photoUrl} onChange={(v) => set('photoUrl', v)} />
        </div>
        {initial?.rmaNumber && (
          <p className="sm:col-span-2 rounded-lg bg-ink/5 px-3.5 py-2.5 text-sm text-ink/70">Registro <strong>{formatRma(initial.rmaNumber)}</strong> — gerado automaticamente e permanente.</p>
        )}
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-ink/80">Responsável (se menor de idade)</label>
          <select value={form.responsibleId} onChange={(e) => set('responsibleId', e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-ink/15 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-coal">
            <option value="">Nenhum</option>
            {members.filter((m) => m.id !== initial?.id).map((m) => (
              <option key={m.id} value={m.id}>{m.fullName}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-ink/80">Observações</label>
          <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2}
            className="mt-1.5 w-full rounded-lg border border-ink/15 px-3.5 py-2.5 text-sm outline-none focus:border-coal" />
        </div>

        {error && <p className="sm:col-span-2 rounded-lg bg-danger/10 px-3.5 py-2.5 text-sm text-danger">{error}</p>}

        <div className="sm:col-span-2 mt-2 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={submitting}>{submitting ? 'Salvando…' : 'Salvar'}</Button>
        </div>
      </form>
    </Modal>
  );
}
