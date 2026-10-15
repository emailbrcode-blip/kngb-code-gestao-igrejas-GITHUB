import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Loading } from '../../components/ui/Loading';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { WorkerFormModal } from './WorkerFormModal';
import { WorkerFunctionsModal } from './WorkerFunctionsModal';
import {
  listWorkersRequest,
  listWorkerLinkableUsersRequest,
  createWorkerRequest,
  updateWorkerRequest,
  deactivateWorkerRequest,
  archiveWorkerRequest,
  deleteWorkerPermanentlyRequest,
  listWorkerFunctionsRequest,
} from '../../lib/workersService';

export function Workers() {
  const { hasPermission, user } = useAuthStore();
  const [workers, setWorkers] = useState([]);
  const [linkableUsers, setLinkableUsers] = useState([]);
  const [functions, setFunctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [modal, setModal] = useState(null);
  const [showFunctions, setShowFunctions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [confirmDeactivate, setConfirmDeactivate] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [confirmDelete, setConfirmDelete] = useState(null);

  const canCreate = hasPermission('workers.create');
  const canEdit = hasPermission('workers.edit');
  const canDelete = hasPermission('workers.delete');
  const canManageFunctions = hasPermission('workers.manage_functions');

  async function loadData() {
    setLoading(true); setLoadError('');
    try {
      const usersPromise = canCreate || canEdit ? listWorkerLinkableUsersRequest() : Promise.resolve([]);
      const [w, f, users] = await Promise.all([listWorkersRequest(), listWorkerFunctionsRequest(), usersPromise]);
      setWorkers(w); setFunctions(f); setLinkableUsers(users);
    } catch (err) {
      setLoadError(err.response?.data?.error?.message || 'Não foi possível carregar os obreiros.');
    } finally { setLoading(false); }
  }

  useEffect(() => { loadData(); }, []);

  async function handleCreate(payload) {
    setSubmitting(true); setFormError('');
    try {
      await createWorkerRequest(payload);
      setModal(null); loadData();
    } catch (err) {
      setFormError(err.response?.data?.error?.message || 'Não foi possível cadastrar o obreiro.');
    } finally { setSubmitting(false); }
  }

  async function handleEdit(payload) {
    setSubmitting(true); setFormError('');
    try {
      await updateWorkerRequest(modal.worker.id, payload);
      setModal(null); loadData();
    } catch (err) {
      setFormError(err.response?.data?.error?.message || 'Não foi possível atualizar o obreiro.');
    } finally { setSubmitting(false); }
  }

  async function handleDeactivate() {
    await deactivateWorkerRequest(confirmDeactivate.id);
    setConfirmDeactivate(null); loadData();
  }
  async function handleArchive(worker) { if (!confirm(`Arquivar ${worker.name}? O histórico será preservado.`)) return; try { await archiveWorkerRequest(worker.id); await loadData(); } catch (err) { setLoadError(err.response?.data?.error?.message || 'Não foi possível arquivar o obreiro.'); } }
  async function handlePermanentDelete() { try { await deleteWorkerPermanentlyRequest(confirmDelete.id); setConfirmDelete(null); await loadData(); } catch (err) { setLoadError(err.response?.data?.error?.message || 'Não foi possível excluir o obreiro.'); } }
  const visibleWorkers = workers.filter((worker) => statusFilter === 'all' || worker.status === statusFilter);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-medium text-ink">Obreiros</h1>
          <p className="mt-1 text-sm text-ink/60">Cadastro, funções e disponibilidade.</p>
        </div>
        <div className="flex gap-2">
          {canManageFunctions && <Button variant="ghost" onClick={() => setShowFunctions(true)}>Funções</Button>}
          {canCreate && <Button variant="metal" onClick={() => setModal({ mode: 'create' })}>Novo obreiro</Button>}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">{[['all','Todos'],['active','Ativos'],['inactive','Inativos'],['archived','Arquivados']].map(([value,label]) => <button key={value} onClick={() => setStatusFilter(value)} className={`rounded-lg px-3 py-1.5 text-sm ${statusFilter === value ? 'bg-coal text-white' : 'bg-ink/5 text-ink/60'}`}>{label}</button>)}</div>
      <Card className="mt-3 overflow-hidden !p-0">
        {loading ? <Loading /> : loadError ? (
          <p className="p-6 text-sm text-danger">{loadError}</p>
        ) : visibleWorkers.length === 0 ? (
          <EmptyState message="Nenhum obreiro cadastrado." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ink/10 bg-ink/[0.02] text-ink/50">
                <tr>
                  <th className="px-5 py-3 font-medium">Nome</th>
                  <th className="px-5 py-3 font-medium">Função</th>
                  <th className="px-5 py-3 font-medium hidden sm:table-cell">Conta vinculada</th>
                  <th className="px-5 py-3 font-medium">Situação</th>
                  <th className="px-5 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {visibleWorkers.map((w) => (
                  <tr key={w.id} className="border-b border-ink/5 last:border-0">
                    <td className="px-5 py-3.5 font-medium text-ink">
                      <Link to={`/obreiros/${w.id}`} className="hover:underline">{w.name}</Link>
                    </td>
                    <td className="px-5 py-3.5 text-ink/60">{w.function?.name || '—'}</td>
                    <td className="px-5 py-3.5 hidden sm:table-cell">
                      <Badge tone={w.userId ? 'success' : 'neutral'}>{w.user?.email || (w.userId ? 'Sim' : 'Não')}</Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge tone={w.status === 'active' ? 'success' : w.status === 'archived' ? 'danger' : 'neutral'}>{w.status === 'active' ? 'Ativo' : w.status === 'archived' ? 'Arquivado' : 'Inativo'}</Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex gap-3">
                        <Link to={`/obreiros/${w.id}`} className="text-sm font-medium text-coal hover:underline">Ver</Link>
                        {canEdit && <button onClick={() => setModal({ mode: 'edit', worker: w })} className="text-sm font-medium text-coal hover:underline">Editar</button>}
                        {canDelete && w.status === 'active' && (
                          <button onClick={() => setConfirmDeactivate(w)} className="text-sm font-medium text-ink/50 hover:underline">Desativar</button>
                        )}
                        {canEdit && w.status !== 'active' && <button onClick={async () => { await updateWorkerRequest(w.id, { status: 'active' }); await loadData(); }} className="text-sm font-medium text-coal hover:underline">Reativar</button>}
                        {canDelete && w.status !== 'archived' && <button onClick={() => handleArchive(w)} className="text-sm font-medium text-danger hover:underline">Arquivar</button>}
                        {canDelete && <button onClick={() => setConfirmDelete(w)} className="text-sm font-medium text-danger hover:underline">Excluir</button>}
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
        <WorkerFormModal functions={functions} linkableUsers={linkableUsers} onClose={() => setModal(null)} onSubmit={handleCreate} submitting={submitting} error={formError} />
      )}
      {modal?.mode === 'edit' && (
        <WorkerFormModal initial={modal.worker} functions={functions} linkableUsers={linkableUsers} onClose={() => setModal(null)} onSubmit={handleEdit} submitting={submitting} error={formError} />
      )}
      {showFunctions && (
        <WorkerFunctionsModal
          functions={functions}
          churchId={user?.churchId}
          onClose={() => setShowFunctions(false)}
          onChanged={loadData}
        />
      )}
      {confirmDeactivate && (
        <ConfirmDialog
          title="Desativar obreiro"
          message={`Desativar ${confirmDeactivate.name}?`}
          onCancel={() => setConfirmDeactivate(null)}
          onConfirm={handleDeactivate}
          confirmLabel="Desativar"
          danger
        />
      )}
      {confirmDelete && <ConfirmDialog title="Excluir obreiro definitivamente" message="Tem certeza que deseja excluir este registro? Esta ação não poderá ser desfeita. As disponibilidades e designações em escalas deste obreiro também serão removidas." onCancel={() => setConfirmDelete(null)} onConfirm={handlePermanentDelete} confirmLabel="Excluir" danger />}
    </div>
  );
}
