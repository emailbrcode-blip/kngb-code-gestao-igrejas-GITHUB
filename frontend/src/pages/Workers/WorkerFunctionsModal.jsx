import { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { createWorkerFunctionRequest, deleteWorkerFunctionRequest } from '../../lib/workersService';

export function WorkerFunctionsModal({ functions, churchId, onClose, onChanged }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleAdd(e) {
    e.preventDefault();
    setSubmitting(true); setError('');
    try {
      await createWorkerFunctionRequest({ name });
      setName('');
      onChanged();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Não foi possível criar a função.');
    } finally { setSubmitting(false); }
  }

  async function handleDelete(id) {
    try {
      await deleteWorkerFunctionRequest(id);
      onChanged();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Não foi possível remover — pode ser uma função padrão do sistema.');
    }
  }

  return (
    <Modal title="Funções de obreiro" onClose={onClose}>
      <form onSubmit={handleAdd} className="mt-4 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nova função (ex: Evangelismo)"
          className="flex-1 rounded-lg border border-ink/15 px-3.5 py-2.5 text-sm outline-none focus:border-coal"
        />
        <Button type="submit" disabled={submitting || !name}>Adicionar</Button>
      </form>

      {error && <p className="mt-3 rounded-lg bg-danger/10 px-3.5 py-2.5 text-sm text-danger">{error}</p>}

      <div className="mt-4 max-h-64 overflow-y-auto divide-y divide-ink/5">
        {functions.map((f) => (
          <div key={f.id} className="flex items-center justify-between py-2.5 text-sm">
            <span>{f.name}{!f.churchId && <span className="ml-2 text-xs text-ink/35">(padrão)</span>}</span>
            {f.churchId === churchId && (
              <button onClick={() => handleDelete(f.id)} className="text-xs text-danger hover:underline">remover</button>
            )}
          </div>
        ))}
      </div>

      <div className="mt-5 flex justify-end">
        <Button variant="ghost" onClick={onClose}>Fechar</Button>
      </div>
    </Modal>
  );
}
