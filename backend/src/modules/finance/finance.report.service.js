import { prisma } from '../../config/database.js';
import { AppError } from '../../utils/AppError.js';
import { formatBR } from './finance.period.js';
import {
  loadPeriodData, summarize, change, buildSeries, buildCategories, GIVING_SLUGS,
} from './finance.dashboard.service.js';

// Modelo de relatório ÚNICO usado pela pré-visualização (tela) e pelo PDF.
// Os dois consomem exatamente os mesmos números (mesmas consultas e regras do
// dashboard), então tela e documento nunca divergem.

export const REPORT_TYPES = {
  complete: 'Relatório Financeiro Completo',
  income: 'Relatório de Receitas',
  expense: 'Relatório de Despesas',
  tithes: 'Relatório de Dízimos',
  offerings: 'Relatório de Ofertas',
  cashflow: 'Relatório de Fluxo de Caixa',
  comparative: 'Relatório Comparativo entre Períodos',
  annual: 'Relatório Anual',
  semiannual: 'Relatório Semestral',
  monthly: 'Relatório Mensal',
  categories: 'Relatório de Categorias Financeiras',
};

const MOVEMENTS_LIMIT = 1500;
const C = { income: '#1D4ED8', expense: '#6B7280', balance: '#111827', prev: '#93C5FD' };

function pctText(ch, partial) {
  if (!ch || !ch.hasBase) return 'sem base de comparação';
  if (partial) return `${ch.percent > 0 ? '+' : ''}${ch.percent.toFixed(1).replace('.', ',')}% (base parcial)`;
  const sign = ch.percent > 0 ? '+' : '';
  return `${sign}${ch.percent.toFixed(1).replace('.', ',')}% vs. período anterior`;
}

async function fetchMovements(churchId, { from, to, type, slug }) {
  const params = [churchId, from, to];
  const where = ["e.church_id = $1", "e.status::text = 'paid'", 'e.date::date BETWEEN $2::date AND $3::date'];
  if (type === 'income' || type === 'expense') where.push(`e.type::text = '${type}'`);
  if (slug) { params.push(slug); where.push(`c.slug = $${params.length}`); }
  const rows = await prisma.$queryRawUnsafe(
    `SELECT to_char(e.date,'YYYY-MM-DD') AS date, e.description, COALESCE(c.name,'Sem categoria') AS category,
            e.type::text AS type, e.amount::float8 AS amount, e.payment_method AS "paymentMethod"
       FROM financial_entries e LEFT JOIN financial_categories c ON c.id = e.category_id
      WHERE ${where.join(' AND ')}
      ORDER BY e.date ASC, e.created_at ASC, e.id ASC
      LIMIT ${MOVEMENTS_LIMIT + 1}`, ...params);
  return rows.map((r) => ({ ...r, amount: Number(r.amount) }));
}

export async function buildReport(churchId, opts) {
  const { type = 'complete', from, to, categorySlug = '', compare = false, compareMode = 'previous' } = opts;
  if (!REPORT_TYPES[type]) throw new AppError('Tipo de relatório inválido.', 422, 'VALIDATION_ERROR');

  const church = await prisma.church.findUnique({ where: { id: churchId }, select: { name: true } });

  // Filtros do relatório (tipo de movimento e/ou categoria).
  let typeFilter = null;
  let slug = categorySlug || '';
  if (type === 'income') typeFilter = 'income';
  if (type === 'expense') typeFilter = 'expense';
  if (type === 'tithes') { typeFilter = 'income'; slug = GIVING_SLUGS.tithes; }
  if (type === 'offerings') { typeFilter = 'income'; slug = GIVING_SLUGS.offerings; }

  const granularity = type === 'annual' || type === 'semiannual' ? 'month' : type === 'monthly' ? 'week' : 'auto';
  const data = await loadPeriodData(churchId, { from, to, compare: compareMode, granularity });
  const showCompare = compare || type === 'comparative';
  const partialPrev = Boolean(data.firstEntryDate && data.firstEntryDate > data.prev.from);

  const keep = (r) => (!typeFilter || r.type === typeFilter) && (!slug || r.slug === slug);
  const rows = data.rows.filter(keep);
  const prevRows = data.prevRows.filter(keep);
  const filtered = Boolean(typeFilter || slug);

  const cur = summarize(rows);
  const prev = summarize(prevRows);
  const series = buildSeries(rows, from, to, data.gran, filtered ? 0 : data.openingBalance);
  const cats = buildCategories(rows, showCompare ? prevRows : []);
  const catLabel = slug ? (rows[0]?.cname || prevRows[0]?.cname || slug) : null;

  const blocks = [];
  const kpi = (label, value, format, tone, ch) => ({ label, value, format, tone, note: showCompare && ch ? pctText(ch, partialPrev) : undefined });
  const ch = (k) => change(cur[k], prev[k]);

  // ----- KPIs por tipo
  const kpis = [];
  if (['complete', 'cashflow', 'comparative', 'annual', 'semiannual', 'monthly', 'categories'].includes(type) && !typeFilter) {
    kpis.push(kpi('Total de receitas', cur.income, 'money', 'pos', ch('income')));
    kpis.push(kpi('Total de despesas', cur.expense, 'money', 'neg', ch('expense')));
    kpis.push(kpi('Saldo do período', cur.balance, 'money', cur.balance >= 0 ? 'pos' : 'neg', ch('balance')));
    if (!filtered) kpis.push(kpi('Saldo acumulado', data.closingBalance, 'money', 'neutral'));
  } else if (typeFilter === 'expense') {
    kpis.push(kpi('Total de despesas', cur.expense, 'money', 'neg', ch('expense')));
    kpis.push(kpi('Nº de lançamentos', cur.expenseCount, 'int', 'neutral'));
    kpis.push(kpi('Despesa média', cur.expenseCount ? Math.round((cur.expense / cur.expenseCount) * 100) / 100 : null, 'money', 'neutral'));
  } else {
    kpis.push(kpi(type === 'tithes' ? 'Total de dízimos' : type === 'offerings' ? 'Total de ofertas' : 'Total de receitas', cur.income, 'money', 'pos', ch('income')));
    kpis.push(kpi('Nº de lançamentos', cur.incomeCount, 'int', 'neutral'));
    kpis.push(kpi('Valor médio', cur.incomeCount ? Math.round((cur.income / cur.incomeCount) * 100) / 100 : null, 'money', 'neutral'));
  }
  if (type === 'complete' && !filtered) {
    kpis.push(kpi('Dízimos', cur.tithes, 'money', 'neutral', ch('tithes')));
    kpis.push(kpi('Ofertas', cur.offerings, 'money', 'neutral', ch('offerings')));
    kpis.push(kpi('Doações financeiras', cur.donations, 'money', 'neutral', ch('donations')));
    kpis.push(kpi('Outras receitas', cur.otherIncome, 'money', 'neutral', ch('otherIncome')));
  }
  blocks.push({ kind: 'kpis', items: kpis });

  const noData = rows.length === 0;
  if (noData) blocks.push({ kind: 'text', text: 'Nenhuma movimentação efetivada encontrada para os filtros selecionados.' });

  // ----- Gráficos
  const labels = series.map((s) => s.label);
  if (!noData) {
    if (type === 'cashflow') {
      blocks.push({ kind: 'chart', chart: 'line', title: 'Evolução do saldo (saldo final de cada período)', labels, series: [{ name: 'Saldo final', color: C.income, values: series.map((s) => s.closing) }] });
    } else if (typeFilter === 'income') {
      blocks.push({ kind: 'chart', chart: 'bars', title: `Evolução — ${type === 'tithes' ? 'dízimos' : type === 'offerings' ? 'ofertas' : 'receitas'}`, labels, series: [{ name: 'Receitas', color: C.income, values: series.map((s) => s.income) }] });
    } else if (typeFilter === 'expense') {
      blocks.push({ kind: 'chart', chart: 'bars', title: 'Evolução das despesas', labels, series: [{ name: 'Despesas', color: C.expense, values: series.map((s) => s.expense) }] });
    } else if (type === 'comparative') {
      blocks.push({ kind: 'chart', chart: 'bars', title: 'Período atual × período anterior', labels: ['Receitas', 'Despesas', 'Saldo'], series: [
        { name: 'Período atual', color: C.income, values: [cur.income, cur.expense, cur.balance] },
        { name: 'Período anterior', color: C.prev, values: [prev.income, prev.expense, prev.balance] },
      ] });
    } else if (type !== 'categories') {
      blocks.push({ kind: 'chart', chart: 'bars', title: 'Receitas × despesas por período', labels, series: [
        { name: 'Receitas', color: C.income, values: series.map((s) => s.income) },
        { name: 'Despesas', color: C.expense, values: series.map((s) => s.expense) },
      ] });
    }
    if (type === 'categories' || type === 'complete' || type === 'income' || type === 'expense') {
      if (!typeFilter || typeFilter === 'income') {
        const inc = cats.income.filter((c) => c.total > 0);
        if (inc.length) blocks.push({ kind: 'chart', chart: 'share', title: 'Composição das receitas', items: inc.map((c) => ({ label: c.name, value: c.total, share: c.share })) });
      }
      if (!typeFilter || typeFilter === 'expense') {
        const exp = cats.expense.filter((c) => c.total > 0);
        if (exp.length) blocks.push({ kind: 'chart', chart: 'share', title: 'Despesas por categoria', items: exp.map((c) => ({ label: c.name, value: c.total, share: c.share })) });
      }
    }
  }

  // ----- Tabelas
  if (type === 'comparative') {
    const rowsCmp = [
      ['Receitas', 'income', 'money'], ['Despesas', 'expense', 'money'], ['Saldo do período', 'balance', 'money'],
      ['Dízimos', 'tithes', 'money'], ['Ofertas', 'offerings', 'money'], ['Doações financeiras', 'donations', 'money'],
      ['Outras receitas', 'otherIncome', 'money'], ['Nº de contribuições', 'contributionsCount', 'int'],
    ].map(([label, k, f]) => {
      const c = change(cur[k], prev[k]);
      return { label, current: cur[k], previous: prev[k], diff: c.diff, percent: c.hasBase ? c.percent : null, _format: f };
    });
    blocks.push({ kind: 'table', title: `Comparativo: ${formatBR(from)} a ${formatBR(to)} × ${formatBR(data.prev.from)} a ${formatBR(data.prev.to)}`, columns: [
      { key: 'label', label: 'Indicador' }, { key: 'current', label: 'Período atual', align: 'right', format: 'money' },
      { key: 'previous', label: 'Período anterior', align: 'right', format: 'money' }, { key: 'diff', label: 'Diferença', align: 'right', format: 'money' },
      { key: 'percent', label: 'Variação', align: 'right', format: 'percent' }], rows: rowsCmp });
  }

  if (type === 'cashflow') {
    blocks.push({ kind: 'table', title: 'Fluxo de caixa por período', columns: [
      { key: 'label', label: 'Período' }, { key: 'opening', label: 'Saldo inicial', align: 'right', format: 'money' },
      { key: 'income', label: 'Entradas', align: 'right', format: 'money' }, { key: 'expense', label: 'Saídas', align: 'right', format: 'money' },
      { key: 'closing', label: 'Saldo final', align: 'right', format: 'money' }], rows: series,
    footer: { label: 'Total do período', opening: series[0]?.opening ?? 0, income: cur.income, expense: cur.expense, closing: series.length ? series[series.length - 1].closing : 0 } });
  } else if (type !== 'categories' && type !== 'comparative' && !noData) {
    blocks.push({ kind: 'table', title: 'Resumo por período', columns: [
      { key: 'label', label: 'Período' }, ...(typeFilter !== 'expense' ? [{ key: 'income', label: 'Receitas', align: 'right', format: 'money' }] : []),
      ...(typeFilter !== 'income' ? [{ key: 'expense', label: 'Despesas', align: 'right', format: 'money' }] : []),
      ...(!typeFilter ? [{ key: 'balance', label: 'Saldo', align: 'right', format: 'money' }] : [])], rows: series,
    footer: { label: 'Total', income: cur.income, expense: cur.expense, balance: cur.balance } });
  }

  const catColumns = (withPrev) => [
    { key: 'name', label: 'Categoria' }, { key: 'count', label: 'Lanç.', align: 'right', format: 'int' },
    { key: 'total', label: 'Valor total', align: 'right', format: 'money' }, { key: 'average', label: 'Média', align: 'right', format: 'money' },
    { key: 'share', label: '% do total', align: 'right', format: 'percent' },
    ...(withPrev ? [{ key: 'previousTotal', label: 'Período anterior', align: 'right', format: 'money' }] : [])];
  if (!noData && ['complete', 'income', 'categories', 'comparative'].includes(type) && !(typeFilter === 'expense')) {
    const list = cats.income.filter((c) => c.total > 0 || c.previousTotal > 0);
    if (list.length) blocks.push({ kind: 'table', title: 'Receitas por categoria', columns: catColumns(showCompare), rows: list, footer: { name: 'Total', count: cur.incomeCount, total: cur.income, share: 100 } });
  }
  if (!noData && ['complete', 'expense', 'categories', 'comparative'].includes(type) && !(typeFilter === 'income')) {
    const list = cats.expense.filter((c) => c.total > 0 || c.previousTotal > 0);
    if (list.length) blocks.push({ kind: 'table', title: 'Despesas por categoria', columns: catColumns(showCompare), rows: list, footer: { name: 'Total', count: cur.expenseCount, total: cur.expense, share: 100 } });
  }

  // ----- Detalhamento das movimentações (somente efetivadas)
  let truncated = false;
  if (!['comparative', 'categories', 'cashflow'].includes(type) && !noData) {
    let movements = await fetchMovements(churchId, { from, to, type: typeFilter, slug });
    if (movements.length > MOVEMENTS_LIMIT) { truncated = true; movements = movements.slice(0, MOVEMENTS_LIMIT); }
    blocks.push({ kind: 'table', title: 'Detalhamento das movimentações (efetivadas)', columns: [
      { key: 'date', label: 'Data', format: 'date' }, { key: 'description', label: 'Descrição' }, { key: 'category', label: 'Categoria' },
      { key: 'typeLabel', label: 'Tipo' }, { key: 'amount', label: 'Valor', align: 'right', format: 'money' }],
    rows: movements.map((m) => ({ ...m, typeLabel: m.type === 'income' ? 'Receita' : 'Despesa' })) });
    if (truncated) blocks.push({ kind: 'text', text: `Exibindo as primeiras ${MOVEMENTS_LIMIT} movimentações do período. Reduza o período para ver todas.` });
  }

  const pendingNote = (data.pending.income.count || data.pending.expense.count) && !filtered
    ? `Não incluídos nos totais (pendentes no período): ${data.pending.income.count} receita(s) e ${data.pending.expense.count} despesa(s).` : null;
  if (pendingNote) blocks.push({ kind: 'text', text: pendingNote });

  const periodLabel = `Período: ${formatBR(from)} a ${formatBR(to)}`
    + (showCompare ? ` — comparado com ${formatBR(data.prev.from)} a ${formatBR(data.prev.to)}` : '')
    + (catLabel ? ` — Categoria: ${catLabel}` : '');

  return {
    type, title: REPORT_TYPES[type], churchName: church?.name || 'Igreja',
    periodLabel, generatedAt: new Date().toISOString(),
    filters: { from, to, categorySlug: slug || null, compare: showCompare, granularity: data.gran },
    blocks,
  };
}
