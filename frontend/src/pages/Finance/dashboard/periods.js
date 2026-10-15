import { todayISODate } from '../../../lib/dateUtils';

// Períodos do dashboard. Tudo em datas de calendário "YYYY-MM-DD" (sem Date
// local nem toISOString), então não há deslocamento de um dia por fuso.
const pad = (n) => String(n).padStart(2, '0');
const iso = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const lastDay = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const parts = (s) => { const [y, m, d] = s.split('-').map(Number); return { y, m, d }; };
const addDays = (s, n) => { const { y, m, d } = parts(s); const dt = new Date(Date.UTC(y, m - 1, d + n)); return iso(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate()); };
const dow = (s) => { const { y, m, d } = parts(s); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); };
const shiftMonth = (y, m, n) => { const idx = y * 12 + (m - 1) + n; return { y: Math.floor(idx / 12), m: (idx % 12) + 1 }; };

export const PRESETS = [
  { id: 'today', label: 'Hoje' },
  { id: 'this_week', label: 'Esta semana' },
  { id: 'prev_week', label: 'Semana anterior' },
  { id: 'this_month', label: 'Este mês' },
  { id: 'prev_month', label: 'Mês anterior' },
  { id: 'last_3m', label: 'Últimos 3 meses' },
  { id: 'last_6m', label: 'Últimos 6 meses' },
  { id: 'this_semester', label: 'Semestre atual' },
  { id: 'prev_semester', label: 'Semestre anterior' },
  { id: 'this_year', label: 'Ano atual' },
  { id: 'prev_year', label: 'Ano anterior' },
  { id: 'month_year', label: 'Mês e ano…' },
  { id: 'custom', label: 'Personalizado…' },
];

export const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

// Semana de domingo a sábado (a semana da igreja começa no culto de domingo).
export function resolvePreset(id, { month, year, customFrom, customTo, today = todayISODate() } = {}) {
  const t = parts(today);
  switch (id) {
    case 'today': return { from: today, to: today };
    case 'this_week': { const start = addDays(today, -dow(today)); return { from: start, to: addDays(start, 6) }; }
    case 'prev_week': { const start = addDays(today, -dow(today) - 7); return { from: start, to: addDays(start, 6) }; }
    case 'this_month': return { from: iso(t.y, t.m, 1), to: today };
    case 'prev_month': { const p = shiftMonth(t.y, t.m, -1); return { from: iso(p.y, p.m, 1), to: iso(p.y, p.m, lastDay(p.y, p.m)) }; }
    case 'last_3m': { const p = shiftMonth(t.y, t.m, -2); return { from: iso(p.y, p.m, 1), to: today }; }
    case 'last_6m': { const p = shiftMonth(t.y, t.m, -5); return { from: iso(p.y, p.m, 1), to: today }; }
    case 'this_semester': return { from: iso(t.y, t.m <= 6 ? 1 : 7, 1), to: today };
    case 'prev_semester': return t.m <= 6 ? { from: iso(t.y - 1, 7, 1), to: iso(t.y - 1, 12, 31) } : { from: iso(t.y, 1, 1), to: iso(t.y, 6, 30) };
    case 'this_year': return { from: iso(t.y, 1, 1), to: today };
    case 'prev_year': return { from: iso(t.y - 1, 1, 1), to: iso(t.y - 1, 12, 31) };
    case 'month_year': { const m = Number(month || t.m); const y = Number(year || t.y); return { from: iso(y, m, 1), to: iso(y, m, lastDay(y, m)) }; }
    case 'custom': return { from: customFrom || '', to: customTo || '' };
    default: return { from: iso(t.y, t.m, 1), to: today };
  }
}

// Últimos 12 meses (mês atual incluído), do dia 1 até hoje.
export function last12Months(today = todayISODate()) {
  const t = parts(today); const p = shiftMonth(t.y, t.m, -11);
  return { from: iso(p.y, p.m, 1), to: today };
}
export const yearRange = (year) => ({ from: iso(year, 1, 1), to: iso(year, 12, 31) });
export const currentYear = () => parts(todayISODate()).y;
export const yearOfISO = (s) => parts(s).y;
