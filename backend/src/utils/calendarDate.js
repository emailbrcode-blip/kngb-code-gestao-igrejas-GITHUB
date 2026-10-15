const CHURCH_TIME_ZONE = 'America/Sao_Paulo';

// Escalas, eventos e cultos usam datas de calendário, armazenadas como
// meia-noite UTC. Não compare esses valores com o horário atual do dia.
export function churchDateKey(value = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: CHURCH_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value);
  const values = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function churchStartOfTodayUtc(now = new Date()) {
  return new Date(`${churchDateKey(now)}T00:00:00.000Z`);
}

export function formatCalendarDateBR(value, options = { dateStyle: 'short' }) {
  return new Intl.DateTimeFormat('pt-BR', { ...options, timeZone: 'UTC' }).format(value);
}
