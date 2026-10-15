import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { formatDateLongBR } from '../../lib/dateUtils';

const STATUS_ICON = {
  confirmed: <span className="text-success">✓ Confirmado</span>,
  pending: <span className="text-metal-dark">⚠ Pendente</span>,
  declined: <span className="text-danger">✕ Não posso</span>,
  called: <span className="text-ink/50">Convocado</span>,
  substituted: <span className="text-ink/50">Substituído</span>,
};

export function ScheduleCard({ schedule, currentUserId, canManage, canConfirmOwn, canDelete, onDelete, onAddWorker, onConfirm, onRemoveAssignment }) {
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-display text-lg text-ink">{schedule.title}</p>
          <p className="text-sm text-ink/50">
            {formatDateLongBR(schedule.date, { weekday: 'short', month: 'short' })}{schedule.startTime && ` às ${schedule.startTime}`}
          </p>
        </div>
        <div className="flex gap-2">
          {canManage && <Button variant="ghost" onClick={() => onAddWorker(schedule)}>+ Obreiro</Button>}
          {canDelete && <Button variant="danger" onClick={() => onDelete(schedule)}>Excluir</Button>}
        </div>
      </div>

      {schedule.notes && <p className="mt-2 text-sm text-ink/50">{schedule.notes}</p>}

      <div className="mt-4 space-y-2">
        {schedule.assignments.length === 0 && <p className="text-sm text-ink/35">Nenhum obreiro escalado ainda.</p>}
        {schedule.assignments.map((a) => {
          const isMine = a.worker.userId === currentUserId;
          return (
            <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-ink/[0.03] px-3 py-2 text-sm">
              <div>
                <span className="font-medium text-ink">{a.worker.name}</span>
                {a.function && <span className="text-ink/50"> — {a.function.name}</span>}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium">{STATUS_ICON[a.status]}</span>
                {isMine && canConfirmOwn && a.status !== 'confirmed' && a.status !== 'declined' && (
                  <>
                    <button onClick={() => onConfirm(schedule.id, a.id, 'confirmed')} className="text-xs font-medium text-success hover:underline">Confirmar</button>
                    <button onClick={() => onConfirm(schedule.id, a.id, 'declined')} className="text-xs font-medium text-danger hover:underline">Não posso</button>
                  </>
                )}
                {isMine && canConfirmOwn && (a.status === 'confirmed' || a.status === 'declined') && (
                  <button onClick={() => onConfirm(schedule.id, a.id, a.status === 'confirmed' ? 'declined' : 'confirmed')} className="text-xs text-ink/40 hover:underline">
                    alterar
                  </button>
                )}
                {canManage && (
                  <button onClick={() => onRemoveAssignment(schedule.id, a.id)} className="text-xs text-ink/30 hover:text-danger">remover</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
