import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { prisma } from '../../config/database.js';
import { getSummary as getFinanceSummary } from '../finance/finance.service.js';

export const reportsRouter = Router();
reportsRouter.use(authenticate);

function dateRange(query) {
  const where = {};
  if (query.from || query.to) {
    where.gte = query.from ? new Date(query.from) : undefined;
    where.lte = query.to ? new Date(query.to) : undefined;
  }
  return where;
}

// Relatório de membros — permissão members.view
reportsRouter.get('/members', authorize('members.view'), async (req, res, next) => {
  try {
    const churchId = req.user.churchId;
    const [byStatus, total] = await Promise.all([
      prisma.member.groupBy({ by: ['status'], where: { churchId }, _count: true }),
      prisma.member.count({ where: { churchId } }),
    ]);
    res.status(200).json({ report: { total, byStatus } });
  } catch (err) { next(err); }
});

// Aniversariantes por mês — permissão members.view
reportsRouter.get('/birthdays', authorize('members.view'), async (req, res, next) => {
  try {
    const month = Number(req.query.month) || new Date().getMonth() + 1; // 1-12
    const members = await prisma.member.findMany({
      where: { churchId: req.user.churchId, status: 'active', birthDate: { not: null } },
      select: { id: true, fullName: true, birthDate: true, phone: true, ministry: true },
    });
    const filtered = members
      .filter((m) => new Date(m.birthDate).getUTCMonth() + 1 === month)
      .sort((a, b) => new Date(a.birthDate).getUTCDate() - new Date(b.birthDate).getUTCDate());
    res.status(200).json({ report: filtered });
  } catch (err) { next(err); }
});

// Participação de obreiros — permissão workers.view (ou schedule.create,
// já que quem monta escala também precisa enxergar equilíbrio de carga)
reportsRouter.get('/worker-participation', authorize('workers.view'), async (req, res, next) => {
  try {
    const churchId = req.user.churchId;
    const dateFilter = dateRange(req.query);

    const workers = await prisma.worker.findMany({
      where: { churchId, status: 'active' },
      select: {
        id: true, name: true,
        assignments: {
          where: { schedule: { date: Object.keys(dateFilter).length ? dateFilter : undefined } },
          select: { status: true, schedule: { select: { id: true, date: true } } },
        },
      },
    });

    // Indicador administrativo de distribuição de escala — nunca um
    // ranking de "melhor obreiro", só volume de participação.
    const report = workers.map((w) => ({
      workerId: w.id,
      name: w.name,
      totalAssignments: w.assignments.length,
      confirmed: w.assignments.filter((a) => a.status === 'confirmed').length,
      pending: w.assignments.filter((a) => a.status === 'pending').length,
      declined: w.assignments.filter((a) => a.status === 'declined').length,
    })).sort((a, b) => b.totalAssignments - a.totalAssignments);

    res.status(200).json({ report });
  } catch (err) { next(err); }
});

// Relatório financeiro — reaproveita o resumo já existente do módulo finance
reportsRouter.get('/financial', authorize('finance.view'), async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const summary = await getFinanceSummary(req.user.churchId, { from, to });
    res.status(200).json({ report: summary });
  } catch (err) { next(err); }
});

// Relatório de doações — permissão donations.view
reportsRouter.get('/donations', authorize('donations.view'), async (req, res, next) => {
  try {
    const churchId = req.user.churchId;
    const dateFilter = dateRange(req.query);
    const where = { churchId, status: 'confirmed' };
    if (Object.keys(dateFilter).length) where.date = dateFilter;

    const [byType, total] = await Promise.all([
      prisma.donation.groupBy({ by: ['type'], where, _sum: { amount: true }, _count: true }),
      prisma.donation.aggregate({ where, _sum: { amount: true }, _count: true }),
    ]);

    res.status(200).json({
      report: {
        totalAmount: Number(total._sum.amount || 0),
        totalCount: total._count,
        byType: byType.map((t) => ({ type: t.type, amount: Number(t._sum.amount || 0), count: t._count })),
      },
    });
  } catch (err) { next(err); }
});

// Relatório de escalas — permissão schedule.create (visão administrativa)
reportsRouter.get('/schedules', authorize('schedule.create'), async (req, res, next) => {
  try {
    const churchId = req.user.churchId;
    const dateFilter = dateRange(req.query);
    const where = { churchId };
    if (Object.keys(dateFilter).length) where.date = dateFilter;

    const schedules = await prisma.schedule.findMany({
      where,
      include: { assignments: { select: { status: true } } },
      orderBy: { date: 'desc' },
    });

    res.status(200).json({
      report: schedules.map((s) => ({
        id: s.id, title: s.title, date: s.date,
        totalAssignments: s.assignments.length,
        confirmed: s.assignments.filter((a) => a.status === 'confirmed').length,
      })),
    });
  } catch (err) { next(err); }
});
