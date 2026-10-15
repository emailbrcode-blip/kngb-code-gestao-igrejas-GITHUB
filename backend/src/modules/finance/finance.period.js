// Utilitários de PERÍODO do Dashboard Financeiro.
//
// Todas as datas aqui são datas de CALENDÁRIO no formato "YYYY-MM-DD" (os
// lançamentos são guardados como meia-noite UTC do dia escolhido). Nunca
// usamos o fuso local do servidor: toda a aritmética é feita em UTC, o que
// evita o erro clássico de "deslocar um dia".

const pad = (n) => String(n).padStart(2, '0');
const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export function isValidISODate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

const parts = (s) => { const [y, m, d] = s.split('-').map(Number); return { y, m, d }; };
export const iso = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const utc = (s) => { const { y, m, d } = parts(s); return Date.UTC(y, m - 1, d); };
const fromUtc = (ms) => { const dt = new Date(ms); return iso(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate()); };

export const addDays = (s, n) => fromUtc(utc(s) + n * 86400000);
export const daysInclusive = (from, to) => Math.round((utc(to) - utc(from)) / 86400000) + 1;
export const lastDayOfMonth = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
export const isMonthEnd = (s) => { const { y, m, d } = parts(s); return d === lastDayOfMonth(y, m); };

// Soma `n` meses ao (ano, mês), devolvendo { y, m }.
function shiftMonth(y, m, n) {
  const idx = y * 12 + (m - 1) + n;
  return { y: Math.floor(idx / 12), m: (idx % 12) + 1 };
}

export const formatBR = (s) => { const { y, m, d } = parts(s); return `${pad(d)}/${pad(m)}/${y}`; };

// Período anterior EQUIVALENTE (compara período parcial com período parcial,
// nunca "15 dias" contra "mês inteiro").
//  - mode 'year': mesmas datas do ano anterior.
//  - mode 'previous' (padrão):
//      * começa no dia 1 → desloca pelo nº de meses abrangidos (mês → mês
//        anterior; trimestre → trimestre anterior; semestre ou acumulado do
//        semestre → semestre anterior; ano ou acumulado do ano → ano
//        anterior), mantendo o mesmo nº de dias decorridos quando o período
//        ainda não terminou;
//      * caso contrário → janela imediatamente anterior com o mesmo nº de dias.
export function previousPeriod({ from, to }, mode = 'previous') {
  const f = parts(from);
  const t = parts(to);

  const shiftBy = (months) => {
    const nf = shiftMonth(f.y, f.m, -months);
    const nt = shiftMonth(t.y, t.m, -months);
    const toDay = isMonthEnd(to) ? lastDayOfMonth(nt.y, nt.m) : Math.min(t.d, lastDayOfMonth(nt.y, nt.m));
    const fromDay = Math.min(f.d, lastDayOfMonth(nf.y, nf.m));
    return { from: iso(nf.y, nf.m, fromDay), to: iso(nt.y, nt.m, toDay) };
  };

  if (mode === 'year') return shiftBy(12);

  const spanned = (t.y - f.y) * 12 + (t.m - f.m) + 1;
  if (f.d === 1) {
    if (f.m === 1 && spanned >= 7) return shiftBy(12); // ano / acumulado do ano
    if ((f.m === 1 || f.m === 7) && spanned >= 4 && spanned <= 6) return shiftBy(6); // semestre / acumulado do semestre
    return shiftBy(spanned);
  }
  const len = daysInclusive(from, to);
  const prevTo = addDays(from, -1);
  return { from: addDays(prevTo, -(len - 1)), to: prevTo };
}

// ---- Agrupamento (buckets) -------------------------------------------------

export function autoGranularity(from, to) {
  const days = daysInclusive(from, to);
  if (days <= 45) return 'day';
  if (days <= 150) return 'week';
  if (days <= 365 * 4) return 'month';
  return 'year';
}

// Semana de DOMINGO a SÁBADO (a semana da igreja começa no domingo).
function weekStart(s) {
  const dow = new Date(utc(s)).getUTCDay(); // 0 = domingo
  return addDays(s, -dow);
}

export function bucketKey(dateStr, granularity) {
  const { y, m } = parts(dateStr);
  switch (granularity) {
    case 'day': return dateStr;
    case 'week': return weekStart(dateStr);
    case 'month': return `${y}-${pad(m)}`;
    case 'semester': return `${y}-S${m <= 6 ? 1 : 2}`;
    case 'year': return String(y);
    default: throw new Error(`Granularidade inválida: ${granularity}`);
  }
}

export function bucketLabel(key, granularity) {
  switch (granularity) {
    case 'day': { const { m, d } = parts(key); return `${pad(d)}/${pad(m)}`; }
    case 'week': { const e = addDays(key, 6); const a = parts(key); const b = parts(e); return `${pad(a.d)}/${pad(a.m)}–${pad(b.d)}/${pad(b.m)}`; }
    case 'month': { const [y, m] = key.split('-').map(Number); return `${MONTHS_SHORT[m - 1]}/${String(y).slice(2)}`; }
    case 'semester': { const [y, s] = key.split('-S'); return `${s}º sem/${y}`; }
    default: return key;
  }
}

// Lista TODOS os buckets entre from e to (inclusive), em ordem — períodos sem
// movimentação aparecem com zero (zero real, não valor inventado).
export function listBuckets(from, to, granularity) {
  const keys = [];
  let cursor = from;
  while (cursor <= to) {
    const k = bucketKey(cursor, granularity);
    if (keys[keys.length - 1] !== k) keys.push(k);
    cursor = addDays(cursor, granularity === 'day' ? 1 : granularity === 'week' ? 7 : 1);
    if (keys.length > 4000) break; // proteção
  }
  return keys.map((key) => ({ key, label: bucketLabel(key, granularity) }));
}

export function monthStartOf(dateStr) { const { y, m } = parts(dateStr); return iso(y, m, 1); }
export function monthEndOf(dateStr) { const { y, m } = parts(dateStr); return iso(y, m, lastDayOfMonth(y, m)); }
export function yearOf(dateStr) { return parts(dateStr).y; }
