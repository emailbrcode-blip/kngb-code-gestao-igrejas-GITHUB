import { prisma } from '../../config/database.js';
import {
  previousPeriod, autoGranularity, bucketKey, listBuckets, daysInclusive, addDays,
} from './finance.period.js';

// =============================================================================
// REGRAS FINANCEIRAS DO DASHBOARD (fonte única de verdade: tabela
// financial_entries — o mesmo cadastro do módulo Financeiro)
//
//  * Só entram nos totais lançamentos com status "paid" (receita efetivamente
//    recebida / despesa efetivamente paga). Pendentes são mostrados à parte,
//    nunca somados como receita ou despesa.
//  * Cada lançamento é contado UMA vez (agregação direta sobre a tabela, sem
//    junção com doações). Doações do módulo "Doações" só entram no caixa
//    quando repassadas (financial_entries com "Repasse da campanha"), então
//    não são somadas de novo. Doações de itens/alimentos nunca viram dinheiro.
//  * Saldo do período = receitas − despesas do período.
//    Saldo acumulado = receitas − despesas pagas de TODO o histórico até a data
//    final (não existe tabela de saldo inicial no sistema).
//  * Variação % só é calculada quando o período anterior tem base válida (> 0).
//  * Datas: calendário "YYYY-MM-DD" (lançamentos = meia-noite UTC).
// =============================================================================

export const GIVING_SLUGS = { tithes: 'dizimos', offerings: 'ofertas', donations: 'doacoes' };
const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

// ---- Consultas agregadas ----------------------------------------------------

// Uma linha por dia × categoria × tipo (já somada no banco).
export async function fetchDailyRows(churchId, from, to) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT to_char(e.date, 'YYYY-MM-DD') AS d, e.type::text AS type,
            c.id AS cid, c.slug AS slug, c.name AS cname,
            COUNT(*)::int AS n, COALESCE(SUM(e.amount), 0)::float8 AS total
       FROM financial_entries e
       LEFT JOIN financial_categories c ON c.id = e.category_id
      WHERE e.church_id = $1 AND e.status::text = 'paid'
        AND e.date::date BETWEEN $2::date AND $3::date
      GROUP BY 1, 2, 3, 4, 5`,
    churchId, from, to,
  );
  return rows.map((r) => ({ ...r, n: Number(r.n), total: Number(r.total) }));
}

// Saldo acumulado (receitas − despesas pagas) de todo o histórico até `date`.
export async function fetchBalanceUpTo(churchId, date) {
  const [row] = await prisma.$queryRawUnsafe(
    `SELECT COALESCE(SUM(CASE WHEN e.type::text = 'income' THEN e.amount ELSE -e.amount END), 0)::float8 AS bal
       FROM financial_entries e
      WHERE e.church_id = $1 AND e.status::text = 'paid' AND e.date::date <= $2::date`,
    churchId, date,
  );
  return round2(row?.bal || 0);
}

// Data do primeiro lançamento efetivado (para avisar quando o período anterior
// tem histórico apenas parcial — nesse caso a variação % engana).
export async function fetchFirstEntryDate(churchId) {
  const [row] = await prisma.$queryRawUnsafe(
    `SELECT to_char(MIN(e.date), 'YYYY-MM-DD') AS d FROM financial_entries e WHERE e.church_id = $1 AND e.status::text = 'paid'`, churchId);
  return row?.d || null;
}

export async function fetchPending(churchId, from, to) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT e.type::text AS type, COUNT(*)::int AS n, COALESCE(SUM(e.amount), 0)::float8 AS total
       FROM financial_entries e
      WHERE e.church_id = $1 AND e.status::text = 'pending'
        AND e.date::date BETWEEN $2::date AND $3::date
      GROUP BY 1`,
    churchId, from, to,
  );
  const out = { income: { count: 0, amount: 0 }, expense: { count: 0, amount: 0 } };
  for (const r of rows) out[r.type] = { count: Number(r.n), amount: round2(r.total) };
  return out;
}

// ---- Agregações em memória (sobre as linhas já agregadas) -------------------

export function summarize(rows) {
  const t = { income: 0, expense: 0, tithes: 0, offerings: 0, donations: 0, incomeCount: 0, expenseCount: 0, contributionsCount: 0 };
  for (const r of rows) {
    if (r.type === 'income') {
      t.income += r.total; t.incomeCount += r.n;
      if (r.slug === GIVING_SLUGS.tithes) { t.tithes += r.total; t.contributionsCount += r.n; }
      else if (r.slug === GIVING_SLUGS.offerings) { t.offerings += r.total; t.contributionsCount += r.n; }
      else if (r.slug === GIVING_SLUGS.donations) { t.donations += r.total; t.contributionsCount += r.n; }
    } else {
      t.expense += r.total; t.expenseCount += r.n;
    }
  }
  const contributionsTotal = t.tithes + t.offerings + t.donations;
  return {
    income: round2(t.income),
    expense: round2(t.expense),
    balance: round2(t.income - t.expense),
    tithes: round2(t.tithes),
    offerings: round2(t.offerings),
    donations: round2(t.donations),
    otherIncome: round2(t.income - contributionsTotal),
    incomeCount: t.incomeCount,
    expenseCount: t.expenseCount,
    // "Contribuições" = dízimos + ofertas + doações financeiras (não inclui
    // repasses de campanha nem outras receitas, para não distorcer a média).
    contributionsCount: t.contributionsCount,
    averageTicket: t.contributionsCount > 0 ? round2(contributionsTotal / t.contributionsCount) : null,
  };
}

// Variação percentual com proteção: sem base válida (anterior <= 0) não há %.
export function change(current, previous) {
  const cur = Number(current || 0);
  const prev = Number(previous || 0);
  const diff = round2(cur - prev);
  if (!(prev > 0)) {
    // Sem base de comparação válida: informamos só a diferença absoluta.
    return { percent: null, diff, trend: cur === prev ? 'stable' : 'na', hasBase: false };
  }
  const percent = round2(((cur - prev) / prev) * 100);
  const trend = Math.abs(percent) < 0.5 ? 'stable' : percent > 0 ? 'up' : 'down';
  return { percent, diff, trend, hasBase: true };
}

export function buildSeries(rows, from, to, granularity, openingBalance) {
  const buckets = listBuckets(from, to, granularity).map((b) => ({ ...b, income: 0, expense: 0, incomeCount: 0 }));
  const index = new Map(buckets.map((b, i) => [b.key, i]));
  for (const r of rows) {
    const b = buckets[index.get(bucketKey(r.d, granularity))];
    if (!b) continue;
    if (r.type === 'income') { b.income += r.total; b.incomeCount += r.n; } else b.expense += r.total;
  }
  let running = openingBalance;
  return buckets.map((b) => {
    const income = round2(b.income);
    const expense = round2(b.expense);
    const opening = round2(running);
    running += income - expense;
    return { key: b.key, label: b.label, income, expense, balance: round2(income - expense), opening, closing: round2(running), hasMovement: income > 0 || expense > 0 };
  });
}

export function buildCategories(rows, previousRows = []) {
  const make = (type) => {
    const map = new Map();
    for (const r of rows.filter((x) => x.type === type)) {
      const key = r.cid || 'none';
      const cur = map.get(key) || { id: r.cid || null, slug: r.slug || null, name: r.cname || 'Sem categoria', total: 0, count: 0, previousTotal: 0 };
      cur.total += r.total; cur.count += r.n; map.set(key, cur);
    }
    for (const r of previousRows.filter((x) => x.type === type)) {
      const key = r.cid || 'none';
      const cur = map.get(key) || { id: r.cid || null, slug: r.slug || null, name: r.cname || 'Sem categoria', total: 0, count: 0, previousTotal: 0 };
      cur.previousTotal += r.total; map.set(key, cur);
    }
    const list = [...map.values()];
    const sum = list.reduce((s, c) => s + c.total, 0);
    return list
      .map((c) => ({ ...c, total: round2(c.total), previousTotal: round2(c.previousTotal), average: c.count ? round2(c.total / c.count) : null, share: sum > 0 ? round2((c.total / sum) * 100) : 0 }))
      .sort((a, b) => b.total - a.total);
  };
  return { income: make('income'), expense: make('expense') };
}

function highlights(series) {
  const active = series.filter((s) => s.hasMovement);
  if (active.length === 0) return { highestIncome: null, lowestIncome: null, bestBalance: null, biggestExpenseIncrease: null };
  const pick = (arr, fn, cmp) => arr.reduce((best, s) => (cmp(fn(s), fn(best)) ? s : best), arr[0]);
  const brief = (s, field) => ({ key: s.key, label: s.label, value: s[field] });
  let biggest = null;
  for (let i = 1; i < series.length; i++) {
    const prev = series[i - 1].expense;
    const delta = series[i].expense - prev;
    if (prev > 0 && delta > 0 && (!biggest || delta > biggest.delta)) {
      biggest = { key: series[i].key, label: series[i].label, value: series[i].expense, previousValue: prev, delta: round2(delta), percent: round2((delta / prev) * 100) };
    }
  }
  return {
    highestIncome: brief(pick(active, (s) => s.income, (a, b) => a > b), 'income'),
    lowestIncome: brief(pick(active, (s) => s.income, (a, b) => a < b), 'income'),
    bestBalance: brief(pick(active, (s) => s.balance, (a, b) => a > b), 'balance'),
    biggestExpenseIncrease: biggest,
  };
}

// ---- Dashboard principal -----------------------------------------------------

export async function loadPeriodData(churchId, { from, to, compare = 'previous', granularity = 'auto' }) {
  const prev = previousPeriod({ from, to }, compare);
  const gran = granularity === 'auto' ? autoGranularity(from, to) : granularity;
  const [rows, prevRows, openingBalance, closingBalance, pending, firstEntryDate] = await Promise.all([
    fetchDailyRows(churchId, from, to),
    fetchDailyRows(churchId, prev.from, prev.to),
    fetchBalanceUpTo(churchId, addDays(from, -1)),
    fetchBalanceUpTo(churchId, to),
    fetchPending(churchId, from, to),
    fetchFirstEntryDate(churchId),
  ]);
  return { prev, gran, rows, prevRows, openingBalance, closingBalance, pending, firstEntryDate };
}

export async function getDashboard(churchId, query) {
  const { from, to, compare = 'previous' } = query;
  const d = await loadPeriodData(churchId, query);
  const current = summarize(d.rows);
  const previous = summarize(d.prevRows);
  const series = buildSeries(d.rows, from, to, d.gran, d.openingBalance);

  const changes = {};
  for (const k of ['income', 'expense', 'balance', 'tithes', 'offerings', 'donations', 'otherIncome', 'contributionsCount', 'averageTicket']) {
    changes[k] = change(current[k], previous[k]);
  }

  return {
    period: { from, to, days: daysInclusive(from, to), granularity: d.gran },
    // partial = o histórico do sistema começa depois do início do período anterior
    previousPeriod: { from: d.prev.from, to: d.prev.to, mode: compare, partial: Boolean(d.firstEntryDate && d.firstEntryDate > d.prev.from) },
    firstEntryDate: d.firstEntryDate,
    kpis: { current, previous, changes },
    // Sem saldo inicial cadastrado no sistema: o acumulado é a soma histórica
    // de recebimentos e pagamentos efetivados até a data final.
    balances: { opening: d.openingBalance, accumulated: d.closingBalance },
    pending: d.pending,
    series,
    categories: buildCategories(d.rows, d.prevRows),
    highlights: highlights(series),
    hasData: d.rows.length > 0,
  };
}

// ---- Tendência mensal (gráficos de evolução, dízimos, ofertas, comparativo anual) ----

export async function getTrend(churchId, { from, to }) {
  const rows = await fetchDailyRows(churchId, from, to);
  const months = listBuckets(from, to, 'month').map((b) => ({ ...b, income: 0, expense: 0, tithes: 0, offerings: 0, donations: 0, count: 0 }));
  const index = new Map(months.map((m, i) => [m.key, i]));
  for (const r of rows) {
    const m = months[index.get(bucketKey(r.d, 'month'))];
    if (!m) continue;
    if (r.type === 'income') {
      m.income += r.total;
      if (r.slug === GIVING_SLUGS.tithes) { m.tithes += r.total; m.count += r.n; }
      if (r.slug === GIVING_SLUGS.offerings) { m.offerings += r.total; m.count += r.n; }
      if (r.slug === GIVING_SLUGS.donations) { m.donations += r.total; m.count += r.n; }
    } else m.expense += r.total;
  }
  const points = months.map((m, i) => {
    const prev = months[i - 1];
    const base = (field) => (prev ? change(m[field], prev[field]) : { percent: null });
    return {
      key: m.key, label: m.label,
      income: round2(m.income), expense: round2(m.expense), balance: round2(m.income - m.expense),
      tithes: round2(m.tithes), offerings: round2(m.offerings), donations: round2(m.donations), contributionsCount: m.count,
      hasMovement: m.income > 0 || m.expense > 0,
      incomeGrowth: base('income').percent, expenseGrowth: base('expense').percent,
      tithesGrowth: base('tithes').percent, offeringsGrowth: base('offerings').percent,
    };
  });
  const active = points.filter((p) => p.hasMovement);
  const pick = (field, cmp) => (active.length ? active.reduce((b, p) => (cmp(p[field], b[field]) ? p : b), active[0]) : null);
  const brief = (p, field) => (p ? { key: p.key, label: p.label, value: p[field] } : null);
  return {
    from, to, points,
    highlights: {
      highestIncome: brief(pick('income', (a, b) => a > b), 'income'),
      lowestIncome: brief(pick('income', (a, b) => a < b), 'income'),
      highestTithes: brief(pick('tithes', (a, b) => a > b), 'tithes'),
      highestOfferings: brief(pick('offerings', (a, b) => a > b), 'offerings'),
    },
  };
}

// ---- Tabela de movimentações ---------------------------------------------------

const SORT_COLUMNS = { date: 'e.date', amount: 'e.amount', category: 'c.name', type: 'e.type::text', description: 'e.description', status: 'e.status::text' };

export async function listMovements(churchId, q) {
  const { from, to, page = 1, pageSize = 20, sort = 'date', dir = 'desc', search = '', type = 'all', status = 'paid', categoryId = '' } = q;
  const params = [churchId, from, to];
  const where = ['e.church_id = $1', 'e.date::date BETWEEN $2::date AND $3::date'];
  if (status !== 'all') where.push(`e.status::text = '${status === 'pending' ? 'pending' : 'paid'}'`);
  if (type === 'income' || type === 'expense') where.push(`e.type::text = '${type}'`);
  if (categoryId) { params.push(categoryId); where.push(`e.category_id = $${params.length}`); }
  if (search.trim()) {
    params.push(`%${search.trim().replace(/[%_\\]/g, (c) => `\\${c}`)}%`);
    where.push(`(e.description ILIKE $${params.length} OR c.name ILIKE $${params.length} OR e.payment_method ILIKE $${params.length})`);
  }
  const whereSql = where.join(' AND ');
  const orderCol = SORT_COLUMNS[sort] || SORT_COLUMNS.date;
  const orderDir = dir === 'asc' ? 'ASC' : 'DESC';

  const [{ n }] = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*)::int AS n FROM financial_entries e LEFT JOIN financial_categories c ON c.id = e.category_id WHERE ${whereSql}`, ...params);
  const totals = await prisma.$queryRawUnsafe(
    `SELECT e.type::text AS type, COALESCE(SUM(e.amount),0)::float8 AS total
       FROM financial_entries e LEFT JOIN financial_categories c ON c.id = e.category_id WHERE ${whereSql} GROUP BY 1`, ...params);

  const limit = Math.min(Math.max(Number(pageSize) || 20, 1), 100);
  const offset = (Math.max(Number(page) || 1, 1) - 1) * limit;
  const items = await prisma.$queryRawUnsafe(
    `SELECT e.id, to_char(e.date, 'YYYY-MM-DD') AS date, e.description, e.type::text AS type, e.amount::float8 AS amount,
            e.status::text AS status, e.payment_method AS "paymentMethod", c.name AS "categoryName", c.slug AS "categorySlug"
       FROM financial_entries e LEFT JOIN financial_categories c ON c.id = e.category_id
      WHERE ${whereSql}
      ORDER BY ${orderCol} ${orderDir} NULLS LAST, e.id ASC
      LIMIT ${limit} OFFSET ${offset}`, ...params);

  const sumOf = (t) => round2(totals.find((x) => x.type === t)?.total || 0);
  return {
    items: items.map((i) => ({ ...i, amount: Number(i.amount) })),
    total: Number(n), page: Math.max(Number(page) || 1, 1), pageSize: limit,
    totalPages: Math.max(Math.ceil(Number(n) / limit), 1),
    sums: { income: sumOf('income'), expense: sumOf('expense') },
  };
}
