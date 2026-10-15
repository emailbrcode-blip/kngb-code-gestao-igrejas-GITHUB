import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Loading } from '../../components/ui/Loading';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { MemberFormModal } from './MemberFormModal';
import { EcclesiasticalRolesModal } from './EcclesiasticalRolesModal';
import { listEcclesiasticalRolesRequest } from '../../lib/ecclesiasticalRolesService';
import {
  listMembersRequest,
  listMemberLinkableUsersRequest,
  createMemberRequest,
  updateMemberRequest,
  deactivateMemberRequest,
  deleteMemberPermanentlyRequest,
} from '../../lib/membersService';

const STATUS_LABELS = { active: 'Ativo', inactive: 'Inativo', visitor: 'Visitante', transferred: 'Transferido', away: 'Afastado' };
const STATUS_TONE = { active: 'success', inactive: 'neutral', visitor: 'warning', transferred: 'neutral', away: 'neutral' };

export function Members() {
  const { hasPermission, user } = useAuthStore();
  const [members, setMembers] = useState([]);
  const [linkableUsers, setLinkableUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [modal, setModal] = useState(null); // { mode: 'create' | 'edit', member? }
  const [showRoles, setShowRoles] = useState(false);
  const [ecclesiasticalRoles, setEcclesiasticalRoles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [confirmDeactivate, setConfirmDeactivate] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const canCreate = hasPermission('members.create');
  const canEdit = hasPermission('members.edit');
  const canDelete = hasPermission('members.delete');
  const canManageRoles = hasPermission('ecclesiastical_roles.manage');

  async function loadData() {
    setLoading(true);
    setLoadError('');
    try {
      const rolesPromise = hasPermission('ecclesiastical_roles.view')
        ? listEcclesiasticalRolesRequest()
        : Promise.resolve([]);
      const linkableUsersPromise = canCreate || canEdit ? listMemberLinkableUsersRequest() : Promise.resolve([]);
      const [membersData, rolesData, usersData] = await Promise.all([listMembersRequest(), rolesPromise, linkableUsersPromise]);
      setMembers(membersData);
      setEcclesiasticalRoles(rolesData);
      setLinkableUsers(usersData);
    } catch (err) {
      setLoadError(err.response?.data?.error?.message || 'Não foi possível carregar os membros.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  const filtered = useMemo(() => {
    return members.filter((m) => {
      const term = search.toLowerCase().trim();
      const matchesSearch = m.fullName.toLowerCase().includes(term) || `rma-${String(m.rmaNumber).padStart(6, '0')}`.includes(term) || String(m.rmaNumber) === term;
      const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [members, search, statusFilter]);

  async function handleCreate(payload) {
    setSubmitting(true); setFormError('');
    try {
      await createMemberRequest(payload);
      setModal(null);
      loadData();
    } catch (err) {
      setFormError(err.response?.data?.error?.message || 'Não foi possível cadastrar o membro.');
    } finally { setSubmitting(false); }
  }

  async function handleEdit(payload) {
    setSubmitting(true); setFormError('');
    try {
      await updateMemberRequest(modal.member.id, payload);
      setModal(null);
      loadData();
    } catch (err) {
      setFormError(err.response?.data?.error?.message || 'Não foi possível atualizar o membro.');
    } finally { setSubmitting(false); }
  }

  async function handleDeactivate() {
    await deactivateMemberRequest(confirmDeactivate.id);
    setConfirmDeactivate(null);
    loadData();
  }
  async function handleDelete() {
    try { await deleteMemberPermanentlyRequest(confirmDelete.id); setConfirmDelete(null); await loadData(); }
    catch (err) { setLoadError(err.response?.data?.error?.message || 'Não foi possível excluir o membro.'); }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-medium text-ink">Membros</h1>
          <p className="mt-1 text-sm text-ink/60">Cadastro e acompanhamento da membresia.</p>
        </div>
        <div className="flex gap-2">
          {canManageRoles && <Button variant="ghost" onClick={() => setShowRoles(true)}>Cargos</Button>}
          {canCreate && <Button variant="metal" onClick={() => setModal({ mode: 'create' })}>Novo membro</Button>}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar por nome…"
          className="w-full max-w-xs rounded-lg border border-ink/15 px-3.5 py-2.5 text-sm outline-none focus:border-coal"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-ink/15 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-coal"
        >
          <option value="all">Todas as situações</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      <Card className="mt-5 overflow-hidden !p-0">
        {loading ? <Loading /> : loadError ? (
          <p className="p-6 text-sm text-danger">{loadError}</p>
        ) : filtered.length === 0 ? (
          <EmptyState message="Nenhum membro cadastrado." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ink/10 bg-ink/[0.02] text-ink/50">
                <tr>
                  <th className="px-5 py-3 font-medium">Nome</th>
                  <th className="px-5 py-3 font-medium hidden sm:table-cell">Contato</th>
                  <th className="px-5 py-3 font-medium">Situação</th>
                  <th className="px-5 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr key={m.id} className="border-b border-ink/5 last:border-0">
                    <td className="px-5 py-3.5 font-medium text-ink">
                      <Link to={`/membros/${m.id}`} className="hover:underline">{m.fullName}</Link>
                      <span className="ml-2 text-xs text-ink/40">{`RMA-${String(m.rmaNumber).padStart(6, '0')}`}</span>
                      <p className="mt-0.5 text-xs font-normal text-ink/45">{m.user ? `Conta vinculada: ${m.user.email}` : 'Sem conta vinculada'}</p>
                    </td>
                    <td className="px-5 py-3.5 text-ink/60 hidden sm:table-cell">{m.phone || m.email || '—'}</td>
                    <td className="px-5 py-3.5"><Badge tone={STATUS_TONE[m.status]}>{STATUS_LABELS[m.status]}</Badge></td>
                    <td className="px-5 py-3.5">
                      <div className="flex gap-3">
                        <Link to={`/membros/${m.id}`} className="text-sm font-medium text-coal hover:underline">Ver</Link>
                        {canEdit && (
                          <button onClick={() => setModal({ mode: 'edit', member: m })} className="text-sm font-medium text-coal hover:underline">Editar</button>
                        )}
                        {canDelete && m.status !== 'inactive' && (
                          <button onClick={() => setConfirmDeactivate(m)} className="text-sm font-medium text-ink/50 hover:underline">Desativar</button>
                        )}
                        {canDelete && <button onClick={() => setConfirmDelete(m)} className="text-sm font-medium text-danger hover:underline">Excluir</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {modal?.mode === 'create' && (
        <MemberFormModal members={members} linkableUsers={linkableUsers} onClose={() => setModal(null)} onSubmit={handleCreate} submitting={submitting} error={formError} />
      )}
      {modal?.mode === 'edit' && (
        <MemberFormModal initial={modal.member} members={members} linkableUsers={linkableUsers} onClose={() => setModal(null)} onSubmit={handleEdit} submitting={submitting} error={formError} />
      )}
      {confirmDeactivate && (
        <ConfirmDialog
          title="Desativar membro"
          message={`Desativar ${confirmDeactivate.fullName}?`}
          onCancel={() => setConfirmDeactivate(null)}
          onConfirm={handleDeactivate}
          confirmLabel="Desativar"
          danger
        />
      )}
      {confirmDelete && <ConfirmDialog title="Excluir membro definitivamente" message="Tem certeza que deseja excluir este registro? Esta ação não poderá ser desfeita." onCancel={() => setConfirmDelete(null)} onConfirm={handleDelete} confirmLabel="Excluir" danger />}
      {showRoles && (
        <EcclesiasticalRolesModal
          roles={ecclesiasticalRoles}
          churchId={user?.churchId}
          onClose={() => setShowRoles(false)}
          onChanged={loadData}
        />
      )}
    </div>
  );
}
