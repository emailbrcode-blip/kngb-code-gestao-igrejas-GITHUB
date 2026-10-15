import { Modal } from './Modal';
import { Button } from './Button';

export function ConfirmDialog({ title, message, onConfirm, onCancel, confirmLabel = 'Confirmar', danger = false }) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="mt-3 text-sm text-ink/70">{message}</p>
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    </Modal>
  );
}
