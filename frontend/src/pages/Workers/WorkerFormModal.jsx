import { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { PhotoField } from '../../components/PhotoField';
import { formatRma } from '../../lib/cardDownload';

export function WorkerFormModal({ initial, functions, linkableUsers = [], onClose, onSubmit, submitting, error }) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    userId: initial?.userId || initial?.user?.id || '',
    phone: initial?.phone || '',
    whatsapp: initial?.whatsapp || '',
    email: initial?.email || '',
    ministry: initial?.ministry || '',
    functionSlug: initial?.function?.slug || '',
    status: initial?.status || 'active',
    photoUrl: initial?.photoUrl || '',
  });

  function set(field, value) { setForm((f) => ({ ...f, [field]: value })); }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({ ...form, userId: form.userId || null });
  }

  const availableUsers = [...linkableUsers, ...(initial?.user ? [initial.user] : [])]
    .filter((user, index, items) => items.findIndex((candidate) => candidate.id === user.id) === index);

  return (
    <Modal title={initial ? 'Editar obreiro' : 'Novo obreiro'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-ink/80">Conta de usuário vinculada</label>
          <select value={form.userId} onChange={(e) => {
            const userId = e.target.value;
            const account = availableUsers.find((user) => user.id === userId);
            setForm((current) => ({ ...current, userId, ...(account ? { name: account.name, email: account.email || current.email } : {}) }));
          }} className="mt-1.5 w-full rounded-lg border border-ink/15 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-coal">
            <option value="">Sem conta vinculada</option>
            {availableUsers.map((account) => <option key={account.id} value={account.id}>{account.name} — {account.email}</option>)}
          </select>
          <p className="mt-1 text-xs text-ink/50">A conta fica ligada ao cadastro do obreiro. Para acessar “Minha Disponibilidade” e “Minhas Escalas”, a conta também precisa ter a função Obreiro. Complete abaixo os dados que estiverem faltando.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-ink/80">Nome</label>
          <input required value={form.name} onChange={(e) => set('name', e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-ink/15 px-3.5 py-2.5 text-sm outline-none focus:border-coal" />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink/80">Telefone</label>
          <input value={form.phone} onChange={(e) => set('phone', e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-ink/15 px-3.5 py-2.5 text-sm outline-none focus:border-coal" />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink/80">E-mail</label>
          <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-ink/15 px-3.5 py-2.5 text-sm outline-none focus:border-coal" />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink/80">Ministério</label>
          <input value={form.ministry} onChange={(e) => set('ministry', e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-ink/15 px-3.5 py-2.5 text-sm outline-none focus:border-coal" />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink/80">Função</label>
          <select value={form.functionSlug} onChange={(e) => set('functionSlug', e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-ink/15 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-coal">
            <option value="">Sem função definida</option>
            {functions.map((f) => <option key={f.slug} value={f.slug}>{f.name}</option>)}
          </select>
        </div>
        <PhotoField value={form.photoUrl} onChange={(v) => set('photoUrl', v)} />
        {initial?.rmaNumber && <p className="rounded-lg bg-ink/5 px-3.5 py-2.5 text-sm text-ink/70">Registro <strong>{formatRma(initial.rmaNumber)}</strong> — permanente.</p>}
        {initial && (
          <div>
            <label className="block text-sm font-medium text-ink/80">Situação</label>
            <select value={form.status} onChange={(e) => set('status', e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-ink/15 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-coal">
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
            </select>
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
