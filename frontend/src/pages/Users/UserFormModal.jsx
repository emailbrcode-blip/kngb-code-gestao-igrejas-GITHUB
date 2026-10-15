import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';

const ROLE_LABELS = {
  admin_geral: 'Administrador Geral',
  admin_financeiro: 'Administrador Financeiro',
  admin_obreiros: 'Administrador de Obreiros',
  membresia: 'Membresia',
  obreiro: 'Obreiro',
  membro: 'Membro',
};

export function UserFormModal({ mode, initialUser, roles, onClose, onSubmit, submitting, error, canCreateMember = false, canCreateWorker = false, canLinkMember = false, canLinkWorker = false, members = [], workers = [] }) {
  const [name, setName] = useState(initialUser?.name || '');
  const [email, setEmail] = useState(initialUser?.email || '');
  const [password, setPassword] = useState('');
  const [roleSlug, setRoleSlug] = useState(initialUser?.role?.slug || roles[0]?.slug || '');
  const [status, setStatus] = useState(initialUser?.status || 'active');
  const [createMemberProfile, setCreateMemberProfile] = useState(canCreateMember && ['membro', 'obreiro'].includes(initialUser?.role?.slug || roles[0]?.slug));
  const [createWorkerProfile, setCreateWorkerProfile] = useState(canCreateWorker && (initialUser?.role?.slug || roles[0]?.slug) === 'obreiro');
  const [memberId, setMemberId] = useState('');
  const [workerId, setWorkerId] = useState('');

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  function handleSubmit(event) {
    event.preventDefault();
    if (mode === 'create') {
      onSubmit({ name, email, password, roleSlug, createMemberProfile: memberId ? false : createMemberProfile, createWorkerProfile: workerId ? false : createWorkerProfile, ...(memberId ? { memberId } : {}), ...(workerId ? { workerId } : {}) });
    } else {
      onSubmit({ name, roleSlug, status });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />

      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
      >
        <h2 className="font-display text-lg font-medium text-ink">
          {mode === 'create' ? 'Novo usuário' : 'Editar usuário'}
        </h2>

        <div className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink/80">Nome completo</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-ink/15 px-3.5 py-2.5 text-sm outline-none focus:border-coal"
            />
          </div>

          {mode === 'create' && (
            <div>
              <label className="block text-sm font-medium text-ink/80">E-mail</label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-ink/15 px-3.5 py-2.5 text-sm outline-none focus:border-coal"
              />
            </div>
          )}

          {mode === 'create' && (
            <div>
              <label className="block text-sm font-medium text-ink/80">Senha provisória</label>
              <input
                required
                type="password"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-ink/15 px-3.5 py-2.5 text-sm outline-none focus:border-coal"
                placeholder="Mínimo 8 caracteres"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-ink/80">Função</label>
            <select
              value={roleSlug}
              onChange={(e) => {
                const nextRole = e.target.value;
                setRoleSlug(nextRole);
                setCreateMemberProfile(canCreateMember && ['membro', 'obreiro'].includes(nextRole));
                setCreateWorkerProfile(canCreateWorker && nextRole === 'obreiro');
              }}
              className="mt-1.5 w-full rounded-lg border border-ink/15 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-coal"
            >
              {roles.map((role) => (
                <option key={role.slug} value={role.slug}>
                  {ROLE_LABELS[role.slug] || role.name}
                </option>
              ))}
            </select>
          </div>

          {mode === 'create' && (canCreateMember || canCreateWorker) && (
            <fieldset className="rounded-lg border border-ink/10 p-3">
              <legend className="px-1 text-sm font-medium text-ink/80">Cadastros vinculados</legend>
              <p className="mb-2 text-xs text-ink/55">Os dados de nome e e-mail desta conta serão usados. Se já existir um cadastro com o mesmo e-mail, ele será vinculado em vez de duplicado.</p>
              {canCreateMember && <label className="flex items-center gap-2 py-1 text-sm"><input type="checkbox" checked={createMemberProfile} onChange={(e) => setCreateMemberProfile(e.target.checked)} /> Criar/vincular cadastro em Membros</label>}
              {canCreateWorker && <label className="flex items-center gap-2 py-1 text-sm"><input type="checkbox" checked={createWorkerProfile} onChange={(e) => setCreateWorkerProfile(e.target.checked)} /> Criar/vincular cadastro em Obreiros e habilitar vínculo às escalas</label>}
            </fieldset>
          )}

          {mode === 'create' && (canLinkMember || canLinkWorker) && (members.length > 0 || workers.length > 0) && (
            <fieldset className="rounded-lg border border-ink/10 p-3">
              <legend className="px-1 text-sm font-medium text-ink/80">Vincular cadastro existente</legend>
              <p className="mb-2 text-xs text-ink/55">Selecione um cadastro ainda sem conta. O nome e o e-mail serão aproveitados; os demais dados permanecem no cadastro existente.</p>
              {canLinkMember && members.length > 0 && <label className="mb-3 block text-sm text-ink/80">Membro
                <select value={memberId} onChange={(event) => {
                  const id = event.target.value;
                  setMemberId(id);
                  const selected = members.find((item) => item.id === id);
                  if (selected) { setName(selected.fullName || name); setEmail(selected.email || email); setCreateMemberProfile(false); }
                }} className="mt-1 block w-full rounded-lg border border-ink/15 bg-white px-3.5 py-2.5 text-sm">
                  <option value="">Não selecionar</option>
                  {members.map((member) => <option key={member.id} value={member.id}>{member.fullName}{member.email ? ` — ${member.email}` : ''}</option>)}
                </select>
              </label>}
              {canLinkWorker && workers.length > 0 && <label className="block text-sm text-ink/80">Obreiro
                <select value={workerId} onChange={(event) => {
                  const id = event.target.value;
                  setWorkerId(id);
                  const selected = workers.find((item) => item.id === id);
                  if (selected) { setName(selected.fullName || name); setEmail(selected.email || email); setCreateWorkerProfile(false); }
                }} className="mt-1 block w-full rounded-lg border border-ink/15 bg-white px-3.5 py-2.5 text-sm">
                  <option value="">Não selecionar</option>
                  {workers.map((worker) => <option key={worker.id} value={worker.id}>{worker.name}{worker.email ? ` — ${worker.email}` : ''}</option>)}
                </select>
              </label>}
            </fieldset>
          )}

          {mode === 'edit' && (
            <div>
              <label className="block text-sm font-medium text-ink/80">Situação</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-ink/15 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-coal"
              >
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </select>
            </div>
          )}
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Salvando…' : 'Salvar'}
          </Button>
        </div>
      </form>
    </div>
  );
}
