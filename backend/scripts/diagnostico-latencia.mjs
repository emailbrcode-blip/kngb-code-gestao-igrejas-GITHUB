// DIAGNÓSTICO DE LATÊNCIA — SOMENTE LEITURA.
// Rodar na MESMA máquina onde o backend roda, dentro da pasta do backend:
//     node scripts/diagnostico-latencia.mjs
//
// O que faz: só consultas SELECT / EXPLAIN ANALYZE de SELECT / contagens e testes de CPU com dados fictícios.
// NÃO escreve, NÃO altera e NÃO apaga nada. NÃO imprime senhas, tokens, e-mails, nomes nem o conteúdo das linhas
// (só tempos, contagens e o formato do endereço do banco sem usuário/senha).
import 'dotenv/config';
import os from 'node:os';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({ log: [{ emit: 'event', level: 'query' }] });
let qlog = [];
prisma.$on('query', (e) => qlog.push({ q: String(e.query).trim().slice(0, 40), ms: Number(e.duration), at: new Date(e.timestamp).getTime() }));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const now = () => performance.now();
const stats = (a) => { const s = [...a].sort((x, y) => x - y); const p = (q) => s[Math.min(s.length - 1, Math.floor(q * s.length))]; return { min: s[0], mediana: p(0.5), p95: p(0.95), max: s[s.length - 1] }; };
const f = (n) => `${Math.round(n)} ms`;
const line = (t = '') => console.log(t);
const h = (t) => { line(); line(`=== ${t} ===`); };

async function timed(label, fn, times = 5) {
  const walls = []; const counts = []; const sums = []; const begins = [];
  for (let i = 0; i < times; i++) {
    qlog = []; const t0 = now(); await fn(); const wall = now() - t0; await sleep(30);
    walls.push(wall); counts.push(qlog.length); sums.push(qlog.reduce((s, x) => s + x.ms, 0));
    begins.push(qlog.filter((x) => /^(BEGIN|COMMIT)/i.test(x.q)).length);
  }
  const st = stats(walls);
  line(`${label}: mediana ${f(st.mediana)} (min ${f(st.min)}, p95 ${f(st.p95)}) | consultas por execução: ${counts[counts.length - 1]} (BEGIN/COMMIT: ${begins[begins.length - 1]}) | soma das durações Prisma: ${f(sums[sums.length - 1])}`);
  return { st, queries: counts[counts.length - 1], sum: sums[sums.length - 1] };
}

line('DIAGNÓSTICO (somente leitura) — BrCode >_');
h('1. Ambiente');
try {
  const u = new URL(process.env.DATABASE_URL);
  line(`Banco: ${u.protocol}//<usuário>@${u.hostname}:${u.port || 5432}  parâmetros: ${u.search || '(nenhum)'}`);
} catch { line('DATABASE_URL não pôde ser lida.'); }
line(`Node ${process.version} | NODE_ENV=${process.env.NODE_ENV || '(vazio)'} | CPUs: ${os.cpus().length} | plataforma: ${process.platform}`);
line(`Limite padrão do pool do Prisma (se não houver connection_limit na URL): ${os.cpus().length * 2 + 1}`);

h('2. Latência pura até o banco (ida e volta)');
const r1 = await timed('SELECT 1', () => prisma.$queryRaw`SELECT 1`, 20);
const r2 = await timed('church.count()', () => prisma.church.count(), 10);
line('  → Se SELECT 1 já leva centenas de ms, o tempo é de REDE até o banco (e não de SQL).');

h('3. Paralelismo / espera por conexão');
{
  const t0 = now(); await prisma.$queryRaw`SELECT 1`; const single = now() - t0;
  const t1 = now(); await Promise.all(Array.from({ length: 6 }, () => prisma.$queryRaw`SELECT 1`)); const six = now() - t1;
  line(`1 consulta: ${f(single)} | 6 consultas em paralelo: ${f(six)} (razão ${(six / single).toFixed(1)}x)`);
  line('  → razão perto de 1x = paralelismo funciona; perto de 6x = as consultas estão sendo serializadas (pool/pgbouncer).');
}

h('4. Cadeia de autenticação (authenticate) — como está hoje × em 1 consulta');
const user = await prisma.user.findFirst({ where: { status: 'active' }, select: { id: true, churchId: true } });
if (!user) { line('Nenhum usuário ativo encontrado.'); } else {
  const cur = await timed('ATUAL  user.findUnique + include role/permissões', () => prisma.user.findUnique({ where: { id: user.id }, include: { role: { include: { rolePermissions: { include: { permission: true } } } } } }), 8);
  const one = await timed('1 CONSULTA  (JOIN único em SQL)', () => prisma.$queryRaw`
    SELECT u.id, u.status, r.slug AS role, COALESCE(array_agg(p.slug) FILTER (WHERE p.slug IS NOT NULL), '{}') AS permissions
      FROM users u JOIN roles r ON r.id = u.role_id
      LEFT JOIN role_permissions rp ON rp.role_id = r.id LEFT JOIN permissions p ON p.id = rp.permission_id
     WHERE u.id = ${user.id} GROUP BY u.id, u.status, r.slug`, 8);
  line(`  → ganho estimado por requisição autenticada: ~${f(cur.st.mediana - one.st.mediana)}`);

  h('5. Notificações (o que cada chamada do sino faz depois do authenticate)');
  await timed('lista(50) + contagem de não lidas em paralelo', () => Promise.all([
    prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 50 }),
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
  ]), 8);

  h('6. Dashboard — o ponto mais pesado (listSchedules)');
  const all = await timed('ATUAL  todas as escalas + designações + obreiros + funções', () => prisma.schedule.findMany({
    where: { churchId: user.churchId },
    include: { assignments: { include: { worker: { select: { id: true, name: true, userId: true } }, function: { select: { id: true, name: true, slug: true } } } } },
    orderBy: { date: 'asc' },
  }), 3);
  const total = await prisma.schedule.count({ where: { churchId: user.churchId } });
  const rows = await prisma.scheduleAssignment.count({ where: { schedule: { churchId: user.churchId } } });
  line(`  escalas: ${total} | designações: ${rows}  (o dashboard só mostra 5)`);
  await timed('ALTERNATIVA  só as 5 próximas (sem carregar tudo)', () => prisma.schedule.findMany({
    where: { churchId: user.churchId, date: { gte: new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z') } },
    orderBy: { date: 'asc' }, take: 5, select: { id: true, title: true, type: true, date: true, startTime: true, endTime: true },
  }), 5);
  line(`  → ganho estimado: ~${f(all.st.mediana)} − o custo da alternativa.`);

  h('7. Tamanho das tabelas (apenas contagens)');
  const counts = await prisma.$queryRaw`
    SELECT (SELECT COUNT(*) FROM refresh_tokens)::int AS refresh_tokens, (SELECT COUNT(*) FROM audit_logs)::int AS audit_logs,
           (SELECT COUNT(*) FROM notifications)::int AS notifications, (SELECT COUNT(*) FROM users)::int AS users,
           (SELECT COUNT(*) FROM refresh_tokens WHERE revoked_at IS NOT NULL OR expires_at < now())::int AS refresh_tokens_inuteis`;
  line(JSON.stringify(counts[0]));

  h('8. Planos de execução (EXPLAIN ANALYZE de SELECTs — não altera dados)');
  const plan = async (label, sqlText) => {
    try {
      const rows = await prisma.$queryRawUnsafe(`EXPLAIN (ANALYZE, BUFFERS) ${sqlText}`);
      const text = rows.map((r) => r['QUERY PLAN']).join('\n').replace(/[0-9a-f]{8}-[0-9a-f-]{27}/gi, '<uuid>');
      const nodes = text.split('\n').filter((l) => /Scan|Sort|Execution Time|Planning Time/.test(l)).map((l) => '    ' + l.trim().slice(0, 140));
      line(`${label}:`); nodes.forEach((l) => line(l));
    } catch (e) { line(`${label}: não foi possível (${String(e.message).split('\n')[0].slice(0, 100)})`); }
  };
  await plan('refresh_tokens por token_hash (usado no refresh)', `SELECT * FROM refresh_tokens WHERE token_hash = 'x' AND revoked_at IS NULL LIMIT 1`);
  await plan('audit_logs últimos 8 da igreja (usado no dashboard)', `SELECT * FROM audit_logs WHERE church_id = '${user.churchId}' ORDER BY created_at DESC LIMIT 8`);
  await plan('notifications do usuário (usado no sino)', `SELECT * FROM notifications WHERE user_id = '${user.id}' ORDER BY created_at DESC LIMIT 50`);
  line('  → "Seq Scan" em tabela grande = falta de índice; "Index Scan" = ok.');
}

h('9. CPU do bcrypt (custo 12, com senha fictícia)');
{
  const t = []; let hash;
  for (let i = 0; i < 3; i++) { const t0 = now(); hash = await bcrypt.hash('senha-ficticia', 12); t.push(now() - t0); }
  const c = []; for (let i = 0; i < 3; i++) { const t0 = now(); await bcrypt.compare('senha-ficticia', hash); c.push(now() - t0); }
  line(`hash: mediana ${f(stats(t).mediana)} | compare (o que o login usa): mediana ${f(stats(c).mediana)}`);
}

h('Como ler');
line('• SELECT 1 alto  = latência de rede ao banco (principal suspeita).');
line('• Seção 4: quantas consultas o authenticate faz hoje × 1.');
line('• Seção 3: se 6 em paralelo ≈ 6x, há serialização por pool/pgbouncer.');
line('• Seção 6: custo de carregar todas as escalas só para mostrar 5.');
line('• Seção 8: índices ausentes (Seq Scan) em refresh_tokens / audit_logs.');
line('Cole a saída completa na conversa. Nada sensível é impresso.');

await prisma.$disconnect();
process.exit(0);
