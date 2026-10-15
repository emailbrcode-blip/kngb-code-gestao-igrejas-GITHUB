import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { AppError } from '../../utils/AppError.js';

// Modelos dos relatórios em PDF (membros, financeiro e participação de obreiros).
// Cada relatório = fetch (Prisma) + build (função pura → modelo de blocos do pdf.kit.js).

// O nome da igreja é preenchido pelas rotas (pdf.routes.js) a partir do cadastro da igreja.
const CHURCH_DISPLAY_NAME = '';
const iso = (d) => (d ? new Date(d).toISOString().slice(0, 10) : null);
const brDate = (s) => (s ? `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}` : '—');
const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (use AAAA-MM-DD).').refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) && new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v, 'Data inválida.');
const monthStr = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Mês inválido (use AAAA-MM).');
function parse(schema, query) {
  const r = schema.safeParse(query);
  if (!r.success) throw new AppError(r.error.issues[0].message, 422, 'VALIDATION_ERROR');
  return r.data;
}
function checkOrder(v, ctx, a = 'from', b = 'to') {
  if (v[a] && v[b] && v[a] > v[b]) ctx.addIssue({ code: 'custom', path: [a], message: 'A data inicial não pode ser maior que a final.' });
}
const monthBounds = (m) => { const [y, mo] = m.split('-').map(Number); const last = new Date(Date.UTC(y, mo, 0)).getUTCDate(); return { from: `${m}-01`, to: `${m}-${String(last).padStart(2, '0')}` }; };

// ============================================================================
// 1) MEMBROS
// ============================================================================
export const MEMBER_STATUS_LABEL = { active: 'Ativo', inactive: 'Inativo', visitor: 'Visitante', transferred: 'Transferido', away: 'Afastado' };
const membersQuery = z.object({
  status: z.enum(['all', 'active', 'inactive', 'visitor', 'transferred', 'away']).optional(),
  from: dateStr.optional(), to: dateStr.optional(), // data de entrada na igreja
  roleId: z.string().uuid().optional(), ministry: z.string().max(100).optional(), q: z.string().max(100).optional(),
}).strict().superRefine((v, c) => checkOrder(v, c));

export function parseMembersFilters(query) { return parse(membersQuery, query); }

export async function fetchMembers(churchId, f) {
  const where = { churchId };
  if (f.status && f.status !== 'all') where.status = f.status;
  if (f.from || f.to) { where.joinDate = {}; if (f.from) where.joinDate.gte = new Date(`${f.from}T00:00:00Z`); if (f.to) where.joinDate.lte = new Date(`${f.to}T23:59:59.999Z`); }
  if (f.ministry) where.ministry = { contains: f.ministry, mode: 'insensitive' };
  if (f.q) where.fullName = { contains: f.q, mode: 'insensitive' };
  if (f.roleId) where.ecclesiasticalRoles = { some: { ecclesiasticalRoleId: f.roleId, endDate: null } };
  const [members, role] = await Promise.all([
    prisma.member.findMany({
      where, orderBy: { fullName: 'asc' },
      select: { id: true, fullName: true, rmaNumber: true, status: true, joinDate: true, exitDate: true, ministry: true, ecclesiasticalRoles: { where: { endDate: null }, select: { ecclesiasticalRole: { select: { name: true } } } } },
    }),
    f.roleId ? prisma.ecclesiasticalRole.findFirst({ where: { id: f.roleId, churchId }, select: { name: true } }) : null,
  ]);
  return { members, roleName: role?.name || null };
}

export function buildMembersReport({ members, roleName }, f, now = new Date()) {
  const label = (s) => MEMBER_STATUS_LABEL[s] || s;
  const counts = {};
  for (const m of members) counts[m.status] = (counts[m.status] || 0) + 1;
  const filters = [];
  filters.push(`Situação: ${f.status && f.status !== 'all' ? label(f.status) : 'todas'}`);
  if (f.from || f.to) filters.push(`Entrada: ${f.from ? brDate(f.from) : '…'} a ${f.to ? brDate(f.to) : '…'}`);
  if (roleName) filters.push(`Cargo: ${roleName}`);
  if (f.ministry) filters.push(`Ministério: ${f.ministry}`);
  if (f.q) filters.push(`Busca: “${f.q}”`);

  const rows = members.map((m) => {
    const exit = iso(m.exitDate);
    const roles = m.ecclesiasticalRoles.map((r) => r.ecclesiasticalRole.name);
    return {
      name: m.fullName, rma: `RMA-${String(m.rmaNumber).padStart(6, '0')}`, category: roles.join(' • ') || 'Membro',
      join: iso(m.joinDate), exit: exit ? brDate(exit) : (m.status === 'active' ? 'Não se aplica' : 'Não informada'),
      status: label(m.status), _tone: m.status === 'active' ? undefined : 'muted',
    };
  });

  const kpis = [{ label: 'Total de registros', value: members.length, format: 'int', tone: 'neutral' }];
  for (const key of ['active', 'inactive', 'transferred', 'away', 'visitor']) if (counts[key]) kpis.push({ label: label(key) + (key === 'active' ? 's' : ''), value: counts[key], format: 'int', tone: key === 'active' ? 'pos' : 'neutral' });

  return {
    churchName: CHURCH_DISPLAY_NAME, title: 'Relatório de Membros',
    periodLabel: `Total de registros incluídos: ${members.length}`, filtersLabel: `Filtros: ${filters.join(' • ')}`,
    generatedAt: now.toISOString(),
    blocks: [
      { kind: 'kpis', items: kpis },
      members.length === 0 ? { kind: 'text', text: 'Nenhum membro encontrado com os filtros selecionados.' } : {
        kind: 'table', title: 'Membros', fontSize: 7.6,
        columns: [
          { key: 'name', label: 'Nome completo', w: 2.6 }, { key: 'rma', label: 'RMA', w: 1.25 }, { key: 'category', label: 'Cargo / categoria', w: 1.7 },
          { key: 'join', label: 'Entrada', format: 'date', w: 1.0 }, { key: 'exit', label: 'Saída', w: 1.15 }, { key: 'status', label: 'Situação', w: 1.0 },
        ], rows,
      },
      { kind: 'text', text: 'Saída: informada no cadastro do membro. Para quem está ativo e sem data de saída consta “Não se aplica”.' },
    ],
  };
}

// ============================================================================
// 2) FINANCEIRO (lançamentos do módulo Financeiro)
// ============================================================================
const financeQuery = z.object({
  from: dateStr.optional(), to: dateStr.optional(), month: monthStr.optional(),
  type: z.enum(['all', 'income', 'expense']).optional(), status: z.enum(['all', 'paid', 'pending']).optional(), categorySlug: z.string().max(80).regex(/^[a-z0-9_]*$/).optional(),
}).strict().superRefine((v, c) => { checkOrder(v, c); if (v.month && (v.from || v.to)) c.addIssue({ code: 'custom', path: ['month'], message: 'Use o mês OU o intervalo de datas.' }); });

export function parseFinanceFilters(query) {
  const f = parse(financeQuery, query);
  if (f.month) { const b = monthBounds(f.month); return { ...f, from: b.from, to: b.to, monthRef: f.month }; }
  // mês de referência quando o intervalo é exatamente um mês cheio
  if (f.from && f.to && f.from.slice(0, 7) === f.to.slice(0, 7) && f.from.endsWith('-01') && f.to === monthBounds(f.from.slice(0, 7)).to) return { ...f, monthRef: f.from.slice(0, 7) };
  return f;
}

export async function fetchFinance(churchId, f) {
  // Mesmo critério de período do resumo financeiro existente (campo "date").
  const where = { churchId };
  if (f.from || f.to) { where.date = {}; if (f.from) where.date.gte = new Date(`${f.from}T00:00:00Z`); if (f.to) where.date.lte = new Date(`${f.to}T00:00:00Z`); }
  if (f.type && f.type !== 'all') where.type = f.type;
  if (f.status && f.status !== 'all') where.status = f.status;
  if (f.categorySlug) where.category = { slug: f.categorySlug };
  const entries = await prisma.financialEntry.findMany({
    where, orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    select: { id: true, type: true, description: true, amount: true, date: true, dueDate: true, status: true, createdAt: true, category: { select: { name: true } } },
  });
  return { entries };
}

export function buildFinanceReport({ entries }, f, now = new Date()) {
  const rows = entries.map((e) => ({
    date: iso(e.date), registered: iso(e.createdAt), due: e.dueDate ? iso(e.dueDate) : null, description: e.description,
    category: e.category?.name || 'Sem categoria', type: e.type === 'income' ? 'Entrada' : 'Saída',
    status: e.status === 'paid' ? (e.type === 'income' ? 'Recebido' : 'Pago') : 'Pendente',
    amount: Number(e.amount), _kind: e.type, _paid: e.status === 'paid', _tone: e.status === 'paid' ? undefined : 'muted',
  }));
  const sum = (arr) => Math.round(arr.reduce((s, r) => s + r.amount, 0) * 100) / 100;
  const inc = rows.filter((r) => r._kind === 'income'); const exp = rows.filter((r) => r._kind === 'expense');
  const totalIn = sum(inc); const totalOut = sum(exp);
  const paidIn = sum(inc.filter((r) => r._paid)); const paidOut = sum(exp.filter((r) => r._paid));
  const pending = rows.filter((r) => !r._paid);

  // por categoria
  const byCat = new Map();
  for (const r of rows) { const k = `${r._kind}|${r.category}`; const cur = byCat.get(k) || { category: r.category, type: r.type, count: 0, total: 0 }; cur.count += 1; cur.total += r.amount; byCat.set(k, cur); }
  const catRows = [...byCat.values()].map((c) => ({ ...c, total: Math.round(c.total * 100) / 100 })).sort((a, b) => a.type.localeCompare(b.type, 'pt') || b.total - a.total);

  const filters = [];
  if (f.type && f.type !== 'all') filters.push(`Tipo: ${f.type === 'income' ? 'entradas' : 'saídas'}`);
  if (f.status && f.status !== 'all') filters.push(`Situação: ${f.status === 'paid' ? 'efetivados' : 'pendentes'}`);
  if (f.categorySlug) filters.push(`Categoria: ${entries[0]?.category?.name || f.categorySlug}`);
  const period = f.from || f.to ? `Período: ${f.from ? brDate(f.from) : 'início'} a ${f.to ? brDate(f.to) : 'hoje'}` : 'Período: todo o histórico';
  const ref = f.monthRef ? ` — Referência: ${MONTHS[Number(f.monthRef.slice(5)) - 1]}/${f.monthRef.slice(0, 4)}` : '';

  return {
    churchName: CHURCH_DISPLAY_NAME, title: 'Relatório Financeiro', periodLabel: period + ref,
    filtersLabel: filters.length ? `Filtros: ${filters.join(' • ')}` : `${rows.length} lançamento(s) no período`, generatedAt: now.toISOString(),
    totals: { totalIn, totalOut, balance: Math.round((totalIn - totalOut) * 100) / 100, paidIn, paidOut, pending: pending.length },
    blocks: [
      { kind: 'heading', text: 'Totais do período', sub: 'Todos os lançamentos do período (mesmo critério do relatório financeiro da tela, inclui pendentes).' },
      { kind: 'kpis', items: [
        { label: 'Total de entradas', value: totalIn, format: 'money', tone: 'pos' },
        { label: 'Total de saídas', value: totalOut, format: 'money', tone: 'neg' },
        { label: 'Saldo do período', value: Math.round((totalIn - totalOut) * 100) / 100, format: 'money', tone: totalIn - totalOut >= 0 ? 'pos' : 'neg' },
      ] },
      { kind: 'heading', text: 'Somente efetivados', sub: 'Recebidos e pagos (mesmo critério do Dashboard Financeiro).' },
      { kind: 'kpis', items: [
        { label: 'Entradas recebidas', value: paidIn, format: 'money', tone: 'pos' },
        { label: 'Saídas pagas', value: paidOut, format: 'money', tone: 'neg' },
        { label: 'Saldo efetivado', value: Math.round((paidIn - paidOut) * 100) / 100, format: 'money', tone: paidIn - paidOut >= 0 ? 'pos' : 'neg' },
        { label: 'Lançamentos pendentes', value: pending.length, format: 'int', tone: 'neutral' },
      ] },
      rows.length === 0 ? { kind: 'text', text: 'Nenhum lançamento encontrado para os filtros selecionados.' } : { kind: 'table', title: 'Resumo por categoria', columns: [
        { key: 'category', label: 'Categoria' }, { key: 'type', label: 'Tipo' }, { key: 'count', label: 'Lanç.', align: 'right', format: 'int' }, { key: 'total', label: 'Valor total', align: 'right', format: 'money' },
      ], rows: catRows },
      ...(rows.length === 0 ? [] : [{ kind: 'table', title: 'Lançamentos', fontSize: 7.2, columns: [
        { key: 'date', label: 'Data', format: 'date', w: 0.95 }, { key: 'registered', label: 'Registro', format: 'date', w: 0.95 }, { key: 'due', label: 'Venc.', format: 'date', w: 0.95 },
        { key: 'description', label: 'Descrição', w: 2.4 }, { key: 'category', label: 'Categoria', w: 1.35 }, { key: 'type', label: 'Tipo', w: 0.8 }, { key: 'status', label: 'Situação', w: 0.9 },
        { key: 'amount', label: 'Valor', align: 'right', format: 'money', w: 1.2 },
      ], rows, footer: { description: 'Saldo (entradas − saídas)', amount: Math.round((totalIn - totalOut) * 100) / 100 } }]),
      { kind: 'text', text: 'Data = data do lançamento no sistema; Registro = dia em que o lançamento foi cadastrado; Venc. = vencimento (quando informado). O sistema não guarda uma data de pagamento separada.' },
    ],
  };
}

// ============================================================================
// 3) PARTICIPAÇÃO DE OBREIROS (escalas e confirmações registradas)
// ============================================================================
export const ASSIGNMENT_STATUS_LABEL = { pending: 'Pendente', called: 'Convocada', confirmed: 'Confirmada', declined: 'Recusada', substituted: 'Substituída' };
const workersQuery = z.object({
  workerId: z.string().uuid().optional(), ministry: z.string().max(100).optional(),
  from: dateStr.optional(), to: dateStr.optional(), status: z.enum(['all', 'pending', 'called', 'confirmed', 'declined', 'substituted']).optional(),
  detail: z.enum(['true', 'false']).optional(),
}).strict().superRefine((v, c) => checkOrder(v, c));
export function parseWorkerFilters(query) { return parse(workersQuery, query); }

export async function fetchWorkerParticipation(churchId, f) {
  const workerWhere = { churchId };
  if (f.workerId) workerWhere.id = f.workerId; else workerWhere.status = 'active';
  if (f.ministry) workerWhere.ministry = { contains: f.ministry, mode: 'insensitive' };
  const scheduleWhere = {};
  if (f.from || f.to) { scheduleWhere.date = {}; if (f.from) scheduleWhere.date.gte = new Date(`${f.from}T00:00:00Z`); if (f.to) scheduleWhere.date.lte = new Date(`${f.to}T23:59:59.999Z`); }
  const assignmentWhere = { schedule: scheduleWhere };
  if (f.status && f.status !== 'all') assignmentWhere.status = f.status;

  const workers = await prisma.worker.findMany({
    where: workerWhere, orderBy: { name: 'asc' },
    select: {
      id: true, name: true, rmaNumber: true, ministry: true, function: { select: { name: true } },
      assignments: {
        where: assignmentWhere,
        select: { id: true, status: true, function: { select: { name: true } }, schedule: { select: { id: true, title: true, type: true, date: true, startTime: true, endTime: true } } },
      },
    },
  });
  if (f.workerId && workers.length === 0) throw new AppError('Obreiro não encontrado.', 404, 'NOT_FOUND');

  // Data da confirmação = último registro de auditoria que gravou o status "confirmed".
  const ids = workers.flatMap((w) => w.assignments.filter((a) => a.status === 'confirmed').map((a) => a.id));
  const confirmedAt = new Map();
  for (let i = 0; i < ids.length; i += 500) {
    const logs = await prisma.auditLog.findMany({
      where: { churchId, targetId: { in: ids.slice(i, i + 500) }, action: { in: ['schedule.assignment_confirmed_by_worker', 'schedule.assignment_updated'] } },
      orderBy: { createdAt: 'asc' }, select: { targetId: true, metadata: true, createdAt: true },
    });
    for (const l of logs) if (l.metadata && l.metadata.status === 'confirmed') confirmedAt.set(l.targetId, l.createdAt);
  }
  return { workers, confirmedAt };
}

const WEEKDAYS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const weekdayOf = (d) => WEEKDAYS[new Date(d).getUTCDay()];
const timeRange = (s, e) => (s && e ? `${s}–${e}` : (s || '—'));

export function buildWorkerReport({ workers, confirmedAt }, f, now = new Date()) {
  const individual = Boolean(f.workerId);
  const wantDetail = f.detail ? f.detail === 'true' : true;
  const countBy = (list, st) => list.filter((a) => a.status === st).length;

  const summaryRows = workers.map((w) => ({
    name: w.name, rma: `RMA-${String(w.rmaNumber).padStart(6, '0')}`, ministry: w.ministry || '—', total: w.assignments.length,
    confirmed: countBy(w.assignments, 'confirmed'), pending: countBy(w.assignments, 'pending'), called: countBy(w.assignments, 'called'),
    declined: countBy(w.assignments, 'declined'), substituted: countBy(w.assignments, 'substituted'),
  }));
  const all = workers.flatMap((w) => w.assignments);

  const filters = [];
  filters.push(individual ? `Obreiro: ${workers[0].name}` : 'Todos os obreiros ativos');
  if (f.ministry) filters.push(`Ministério: ${f.ministry}`);
  if (f.status && f.status !== 'all') filters.push(`Situação da escala: ${ASSIGNMENT_STATUS_LABEL[f.status]}`);
  const period = f.from || f.to ? `Período: ${f.from ? brDate(f.from) : 'início'} a ${f.to ? brDate(f.to) : 'hoje'}` : 'Período: todo o histórico';

  const blocks = [
    { kind: 'kpis', items: [
      { label: 'Obreiros no relatório', value: workers.length, format: 'int', tone: 'neutral' },
      { label: 'Escalas atribuídas', value: all.length, format: 'int', tone: 'neutral' },
      { label: 'Confirmadas', value: countBy(all, 'confirmed'), format: 'int', tone: 'pos' },
      { label: 'Pendentes', value: countBy(all, 'pending'), format: 'int', tone: 'neutral' },
      { label: 'Convocadas (aguardando resposta)', value: countBy(all, 'called'), format: 'int', tone: 'neutral' },
      { label: 'Recusadas / substituídas', value: countBy(all, 'declined') + countBy(all, 'substituted'), format: 'int', tone: 'neutral' },
    ] },
  ];
  if (workers.length === 0) blocks.push({ kind: 'text', text: 'Nenhum obreiro encontrado com os filtros selecionados.' });
  else if (!individual) blocks.push({ kind: 'table', title: 'Resumo por obreiro', fontSize: 7.6, columns: [
    { key: 'name', label: 'Obreiro', w: 2.4 }, { key: 'rma', label: 'RMA', w: 1.2 }, { key: 'ministry', label: 'Ministério', w: 1.5 },
    { key: 'total', label: 'Escalas', align: 'right', format: 'int', w: 0.8 }, { key: 'confirmed', label: 'Confirm.', align: 'right', format: 'int', w: 0.85 },
    { key: 'pending', label: 'Pend.', align: 'right', format: 'int', w: 0.7 }, { key: 'called', label: 'Conv.', align: 'right', format: 'int', w: 0.7 },
    { key: 'declined', label: 'Recus.', align: 'right', format: 'int', w: 0.75 }, { key: 'substituted', label: 'Subst.', align: 'right', format: 'int', w: 0.75 },
  ], rows: summaryRows });

  if (wantDetail) {
    workers.forEach((w, i) => {
      const s = summaryRows[i];
      blocks.push({ kind: 'heading', text: `${w.name} — RMA-${String(w.rmaNumber).padStart(6, '0')}`, sub: `${w.ministry || 'Sem ministério'}${w.function?.name ? ` • ${w.function.name}` : ''} • ${s.total} escala(s): ${s.confirmed} confirmada(s), ${s.pending} pendente(s), ${s.called} convocada(s), ${s.declined} recusada(s), ${s.substituted} substituída(s)` });
      if (w.assignments.length === 0) { blocks.push({ kind: 'text', text: 'Nenhuma escala registrada no período.' }); return; }
      const list = [...w.assignments].sort((a, b) => new Date(a.schedule.date) - new Date(b.schedule.date) || String(a.schedule.startTime).localeCompare(String(b.schedule.startTime)));
      blocks.push({ kind: 'table', fontSize: 7.4, columns: [
        { key: 'date', label: 'Data', format: 'date', w: 0.95 }, { key: 'day', label: 'Dia', w: 1.15 }, { key: 'time', label: 'Horário', w: 0.95 },
        { key: 'title', label: 'Culto / evento', w: 2.4 }, { key: 'fn', label: 'Função', w: 1.3 }, { key: 'status', label: 'Situação', w: 1.0 }, { key: 'confirmedOn', label: 'Confirmação', format: 'date', w: 1.05 },
      ], rows: list.map((a) => ({
        date: iso(a.schedule.date), day: weekdayOf(a.schedule.date), time: timeRange(a.schedule.startTime, a.schedule.endTime), title: a.schedule.title,
        fn: a.function?.name || w.function?.name || '—', status: ASSIGNMENT_STATUS_LABEL[a.status] || a.status, confirmedOn: a.status === 'confirmed' && confirmedAt.get(a.id) ? iso(confirmedAt.get(a.id)) : null,
      })) });
    });
  }
  blocks.push({ kind: 'text', text: 'Este relatório mostra o volume e a situação das escalas registradas no sistema; não é um ranking de desempenho. O sistema registra confirmação, mas não registra presença/conclusão do serviço, por isso “confirmada” não significa “realizada”. A data de confirmação vem do histórico (auditoria) e aparece como “—” quando não foi registrada.' });

  return { churchName: CHURCH_DISPLAY_NAME, title: individual ? 'Participação do Obreiro nas Escalas' : 'Participação dos Obreiros nas Escalas', periodLabel: period, filtersLabel: `Filtros: ${filters.join(' • ')}`, generatedAt: now.toISOString(), blocks };
}
