import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { roleLabel } from '../../components/layout/Sidebar';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { UserFormModal } from './UserFormModal';
import {
  listUsersRequest,
  createUserRequest,
  updateUserRequest,
  deactivateUserRequest,
  archiveUserRequest,
  deleteUserPermanentlyRequest,
  listRolesRequest,
} from '../../lib/usersService';
import { listMembersRequest } from '../../lib/membersService';
import { listWorkersRequest } from '../../lib/workersService';

export function Users() {
  const { hasPermission, user: currentUser } = useAuthStore();

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [members, setMembers] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [modal, setModal] = useState(null); // { mode: 'create' | 'edit', user? }
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const canCreate = hasPermission('users.create');
  const canEdit = hasPermission('users.edit');
  const canDelete = hasPermission('users.delete');

  async function loadData() {
    setLoading(true);
    setLoadError('');
    try {
      const usersPromise = listUsersRequest();
      // Só busca roles se o usuário puder de fato criar/editar — evita um
      // 403 desnecessário para quem só tem users.view.
      const rolesPromise = canCreate || canEdit ? listRolesRequest() : Promise.resolve([]);
      const membersPromise = hasPermission('members.view') && hasPermission('members.edit') ? listMembersRequest() : Promise.resolve([]);
      const workersPromise = hasPermission('workers.view') && hasPermission('workers.edit') ? listWorkersRequest() : Promise.resolve([]);
      const [usersData, rolesData, membersData, workersData] = await Promise.all([usersPromise, rolesPromise, membersPromise, workersPromise]);
      setUsers(usersData);
      setRoles(rolesData);
      setMembers(membersData);
      setWorkers(workersData);
    } catch (err) {
      setLoadError(err.response?.data?.error?.message || 'Não foi possível carregar os usuários.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(payload) {
    setSubmitting(true);
    setFormError('');
    try {
      await createUserRequest(payload);
      setModal(null);
      loadData();
    } catch (err) {
      setFormError(err.response?.data?.error?.message || 'Não foi possível criar o usuário.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEdit(payload) {
    setSubmitting(true);
    setFormError('');
    try {
      await updateUserRequest(modal.user.id, payload);
      setModal(null);
      loadData();
    } catch (err) {
      setFormError(err.response?.data?.error?.message || 'Não foi possível atualizar o usuário.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleStatus(user) {
    if (user.status === 'active') {
      if (!confirm(`Desativar o acesso de ${user.name}?`)) return;
      await deactivateUserRequest(user.id);
    } else {
      await updateUserRequest(user.id, { status: 'active' });
    }
    loadData();
  }
  async function handleArchive(user) { if (!confirm(`Arquivar ${user.name}? O histórico será preservado.`)) return; try { await archiveUserRequest(user.id); await loadData(); } catch (err) { setLoadError(err.response?.data?.error?.message || 'Não foi possível arquivar o usuário.'); } }
  async function handlePermanentDelete(user) { if (!window.confirm('Tem certeza que deseja excluir este registro? Esta ação não poderá ser desfeita.')) return; try { await deleteUserPermanentlyRequest(user.id); await loadData(); } catch (err) { setLoadError(err.response?.data?.error?.message || 'Não foi possível excluir o usuário.'); } }
  const visibleUsers = users.filter((user) => statusFilter === 'all' || user.status === statusFilter);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-medium text-ink">Usuários</h1>
          <p className="mt-1 text-sm text-ink/60">Gerencie quem tem acesso ao sistema.</p>
        </div>

        {canCreate && (
          <Button variant="metal" onClick={() => setModal({ mode: 'create' })}>
            Novo usuário
          </Button>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">{[['all','Todos'],['active','Ativos'],['inactive','Inativos'],['archived','Arquivados']].map(([value,label]) => <button key={value} onClick={() => setStatusFilter(value)} className={`rounded-lg px-3 py-1.5 text-sm ${statusFilter === value ? 'bg-coal text-white' : 'bg-ink/5 text-ink/60'}`}>{label}</button>)}</div>
      <Card className="mt-3 overflow-hidden !p-0">
        {loading ? (
          <p className="p-6 text-sm text-ink/50">Carregando usuários…</p>
        ) : loadError ? (
          <p className="p-6 text-sm text-danger">{loadError}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ink/10 bg-ink/[0.02] text-ink/50">
                <tr>
                  <th className="px-5 py-3 font-medium">Nome</th>
                  <th className="px-5 py-3 font-medium">E-mail</th>
                  <th className="px-5 py-3 font-medium">Função</th>
                  <th className="px-5 py-3 font-medium">Situação</th>
                  {(canEdit || canDelete) && <th className="px-5 py-3 font-medium">Ações</th>}
                </tr>
              </thead>
              <tbody>
                {visibleUsers.map((user) => (
                  <tr key={user.id} className="border-b border-ink/5 last:border-0">
                    <td className="px-5 py-3.5 font-medium text-ink">{user.name}</td>
                    <td className="px-5 py-3.5 text-ink/70">{user.email}</td>
                    <td className="px-5 py-3.5 text-ink/70">{roleLabel(user.role?.slug)}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          user.status === 'active' ? 'bg-success/10 text-success' : user.status === 'archived' ? 'bg-danger/10 text-danger' : 'bg-ink/10 text-ink/50'
                        }`}
                      >
                        {user.status === 'active' ? 'Ativo' : user.status === 'archived' ? 'Arquivado' : 'Inativo'}
                      </span>
                    </td>
                    {(canEdit || canDelete) && (
                      <td className="px-5 py-3.5">
                        <div className="flex gap-2">
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => setModal({ mode: 'edit', user })}
                              className="text-sm font-medium text-coal hover:underline"
                            >
                              Editar
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(user)}
                              className="text-sm font-medium text-ink/50 hover:underline"
                            >
                              {user.status === 'active' ? 'Desativar' : 'Reativar'}
                            </button>
                          )}
                          {canDelete && user.status !== 'archived' && <button type="button" onClick={() => handleArchive(user)} className="text-sm font-medium text-danger hover:underline">Arquivar</button>}
                          {canDelete && user.id !== currentUser?.id && <button type="button" onClick={() => handlePermanentDelete(user)} className="text-sm font-medium text-danger hover:underline">Excluir</button>}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}

                {visibleUsers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-ink/40">
                      Nenhum usuário cadastrado ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {modal?.mode === 'create' && (
        <UserFormModal
          mode="create"
          roles={roles}
          canCreateMember={hasPermission('members.create')}
          canCreateWorker={hasPermission('workers.create')}
          canLinkMember={hasPermission('members.edit')}
          canLinkWorker={hasPermission('workers.edit')}
          members={members.filter((member) => !member.userId)}
          workers={workers.filter((worker) => !worker.userId)}
          onClose={() => setModal(null)}
          onSubmit={handleCreate}
          submitting={submitting}
          error={formError}
        />
      )}

      {modal?.mode === 'edit' && (
        <UserFormModal
          mode="edit"
          initialUser={modal.user}
          roles={roles.length ? roles : [modal.user.role]}
          onClose={() => setModal(null)}
          onSubmit={handleEdit}
          submitting={submitting}
          error={formError}
        />
      )}
    </div>
  );
}
