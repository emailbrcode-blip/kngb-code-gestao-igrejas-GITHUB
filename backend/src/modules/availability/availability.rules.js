const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export function weekdayForDate(date) {
  return WEEKDAYS[new Date(date).getUTCDay()];
}

export function evaluateAvailability(rows, { startTime, endTime }) {
  if (!startTime || !endTime) return { status: 'conflict', reason: 'Defina o horário da escala para conferir a disponibilidade.' };
  const exact = rows.filter((row) => row.startTime && row.endTime && row.startTime < endTime && row.endTime > startTime);
  const blocking = exact.find((row) => row.status === 'unavailable');
  if (blocking) return { status: 'unavailable', reason: blocking.notes || `Indisponível ${blocking.startTime}–${blocking.endTime}.` };
  const explicitUnavailable = rows.find((row) => row.status === 'unavailable' && !row.startTime && !row.endTime);
  if (explicitUnavailable) return { status: 'unavailable', reason: explicitUnavailable.notes || 'Indisponível durante todo o dia.' };
  const allDay = rows.some((row) => row.status === 'available' && !row.startTime && !row.endTime);
  const coverage = rows.some((row) => ['available', 'partial'].includes(row.status) && row.startTime && row.endTime && row.startTime <= startTime && row.endTime >= endTime);
  if (allDay || coverage) return { status: 'available', reason: '' };
  return {
    status: 'unavailable',
    reason: rows.length ? 'Não há disponibilidade cadastrada cobrindo todo este horário.' : 'Não informou disponibilidade para este dia e horário.',
  };
}

export function evaluateAvailabilityWithExceptions(weekly, exceptions, { startTime, endTime }) {
  const applicable = exceptions.filter((entry) => !entry.startTime || (startTime && endTime && entry.startTime < endTime && entry.endTime > startTime));
  const unavailable = applicable.find((entry) => entry.status === 'unavailable');
  if (unavailable) return { status: 'unavailable', reason: unavailable.notes || `Indisponível nesta data${unavailable.startTime ? ` das ${unavailable.startTime} às ${unavailable.endTime}` : ' durante todo o dia'}.` };
  const available = applicable.find((entry) => entry.status === 'available' && (!entry.startTime || (startTime && endTime && entry.startTime <= startTime && entry.endTime >= endTime)));
  if (available) return { status: 'available', reason: 'Disponibilidade específica informada para esta data.' };
  return evaluateAvailability(weekly, { startTime, endTime });
}
