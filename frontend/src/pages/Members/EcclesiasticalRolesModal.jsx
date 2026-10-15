import { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { createEcclesiasticalRoleRequest, setEcclesiasticalRoleStatusRequest, deleteEcclesiasticalRoleRequest } from '../../lib/ecclesiasticalRolesService';

export function EcclesiasticalRolesModal({ roles, churchId, onClose, onChanged }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleAdd(e) {
    e.preventDefault();
    setSubmitting(true); setError('');
    try {
      await createEcclesiasticalRoleRequest({ name });
      setName('');
      onChanged();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Não foi possível criar o cargo.');
    } finally { setSubmitting(false); }
  }

  async function handleToggle(role) {
    try {
      await setEcclesiasticalRoleStatusRequest(role.id, role.status === 'active' ? 'inactive' : 'active');
      onChanged();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Não foi possível alterar o cargo.');
    }
  }
  async function handleDelete(role) {
    if (!window.confirm('Tem certeza que deseja excluir este registro? Esta ação não poderá ser desfeita.')) return;
    try { await deleteEcclesiasticalRoleRequest(role.id); onChanged(); }
    catch (err) { setError(err.response?.data?.error?.message || 'Não foi possível excluir o cargo.'); }
  }

  return (
    <Modal title="Cargos eclesiásticos" onClose={onClose}>
      <form onSubmit={handleAdd} className="mt-4 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Novo cargo (ex: Evangelista)"
          className="flex-1 rounded-lg border border-ink/15 px-3.5 py-2.5 text-sm outline-none focus:border-coal"
        />
        <Button type="submit" disabled={submitting || !name}>Adicionar</Button>
      </form>

      {error && <p className="mt-3 rounded-lg bg-danger/10 px-3.5 py-2.5 text-sm text-danger">{error}</p>}

      <div className="mt-4 max-h-64 overflow-y-auto divide-y divide-ink/5">
        {roles.map((r) => (
          <div key={r.id} className="flex items-center justify-between py-2.5 text-sm">
            <span>
              {r.name}
              {!r.churchId && <span className="ml-2 text-xs text-ink/35">(padrão)</span>}
            </span>
            <div className="flex items-center gap-3">
              <Badge tone={r.status === 'active' ? 'success' : 'neutral'}>{r.status === 'active' ? 'Ativo' : 'Inativo'}</Badge>
              <button onClick={() => handleToggle(r)} className="text-xs text-coal hover:underline">
                {r.status === 'active' ? 'desativar' : 'ativar'}
              </button>
              {r.churchId === churchId && <button onClick={() => handleDelete(r)} className="text-xs text-danger hover:underline">Excluir</button>}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 flex justify-end">
        <Button variant="ghost" onClick={onClose}>Fechar</Button>
      </div>
    </Modal>
  );
}
