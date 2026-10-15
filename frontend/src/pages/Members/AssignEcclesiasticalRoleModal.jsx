import { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';

export function AssignEcclesiasticalRoleModal({ roles, onClose, onSubmit, submitting, error }) {
  const [roleSlug, setRoleSlug] = useState('');
  const [notes, setNotes] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({ ecclesiasticalRoleSlug: roleSlug, notes: notes || undefined });
  }

  const activeRoles = roles.filter((r) => r.status === 'active');

  return (
    <Modal title="Atribuir cargo eclesiástico" onClose={onClose}>
      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-ink/80">Cargo</label>
          <select required value={roleSlug} onChange={(e) => setRoleSlug(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-ink/15 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-coal">
            <option value="">Selecione…</option>
            {activeRoles.map((r) => <option key={r.slug} value={r.slug}>{r.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-ink/80">Observação</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
            className="mt-1.5 w-full rounded-lg border border-ink/15 px-3.5 py-2.5 text-sm outline-none focus:border-coal" />
        </div>

        <p className="text-xs text-ink/40">O cargo atual (se houver) será encerrado automaticamente e este novo cargo entra no histórico.</p>

        {error && <p className="rounded-lg bg-danger/10 px-3.5 py-2.5 text-sm text-danger">{error}</p>}

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={submitting || !roleSlug}>{submitting ? 'Salvando…' : 'Atribuir'}</Button>
        </div>
      </form>
    </Modal>
  );
}
