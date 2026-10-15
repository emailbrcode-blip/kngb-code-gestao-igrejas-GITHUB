import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { prisma } from '../../config/database.js';
import { listUpcomingEvents } from '../events/events.service.js';
import { getSummary as getFinanceSummary } from '../finance/finance.service.js';
import { listUpcomingSchedules } from '../schedules/schedules.service.js';

export const dashboardRouter = Router();

dashboardRouter.use(authenticate);

// Um único endpoint agregando o que cada permissão do usuário autoriza
// ver — evita várias chamadas do frontend e mantém a decisão de "o que
// esse usuário pode ver" no backend, não no cliente.
dashboardRouter.get('/summary', async (req, res, next) => {
  try {
    const { churchId, permissions } = req.user;
    const can = (permission) => permissions.includes(permission);
    // Executa a consulta só se o usuário tem a permissão; senão resolve vazio.
    const ifCan = (permission, fn) => (can(permission) ? fn() : Promise.resolve(undefined));

    const now = new Date();
    const today = new Date();
    const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    // Mesma regra de datas de antes: "hoje" no calendário do servidor; datas de escala em UTC.
    const todayCalendar = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const scheduleFrom = new Date(`${todayCalendar}T00:00:00.000Z`);

    // TODAS as consultas independentes saem juntas (antes eram ~20 etapas em sequência, cada uma
    // pagando a latência até o banco). Cada bloco continua respeitando as mesmas permissões.
    const [
      churchAnnouncements, publicEvents, churchWorships, churchSchedules, publicCampaigns, recentNotifications,
      totalMembers, allMembers, totalWorkers, upcomingSchedules, upcomingEvents, announcements, upcomingWorships,
      donationParticipation, donations, finance, recentActivity,
    ] = await Promise.all([
      // Comunicados da igreja são conteúdo comum a todos os usuários ativos da própria igreja;
      // não expõe dados financeiros nem designações pessoais.
      prisma.announcement.findMany({ where: { churchId, archived: false, publishedAt: { not: null }, OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] }, orderBy: { publishedAt: 'desc' }, take: 5 }),
      prisma.event.findMany({ where: { churchId, isPublic: true, status: 'scheduled', date: { gte: now } }, orderBy: { date: 'asc' }, take: 5, select: { id: true, name: true, date: true, startTime: true, location: true } }),
      prisma.worship.findMany({ where: { churchId, date: { gte: now } }, orderBy: { date: 'asc' }, take: 5, select: { id: true, date: true, startTime: true, type: true, theme: true } }),
      prisma.schedule.findMany({ where: { churchId, date: { gte: now } }, orderBy: { date: 'asc' }, take: 5, select: { id: true, title: true, type: true, date: true, startTime: true, endTime: true } }),
      prisma.donationCampaign.findMany({ where: { churchId, active: true, isPublic: true, OR: [{ endDate: null }, { endDate: { gte: now } }] }, orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, name: true, description: true, startDate: true, endDate: true } }),
      prisma.notification.findMany({ where: { churchId, userId: req.user.id }, orderBy: { createdAt: 'desc' }, take: 8 }),

      ifCan('members.view', () => prisma.member.count({ where: { churchId, status: 'active' } })),
      // Aniversariantes próximos — comparação simples por mês/dia (ok para o protótipo; não trata
      // virada de ano em janelas > 1 mês).
      ifCan('members.view', () => prisma.member.findMany({ where: { churchId, status: 'active', birthDate: { not: null } }, select: { id: true, fullName: true, birthDate: true, phone: true } })),
      ifCan('workers.view', () => prisma.worker.count({ where: { churchId, status: 'active' } })),
      ifCan('schedule.view', () => listUpcomingSchedules(req.user, { fromDate: scheduleFrom, limit: 5 })),
      ifCan('events.view', () => listUpcomingEvents(churchId, 5)),
      ifCan('announcements.view', () => prisma.announcement.findMany({ where: { churchId, archived: false, publishedAt: { not: null } }, orderBy: [{ priority: 'desc' }, { publishedAt: 'desc' }], take: 5 })),
      ifCan('worships.view', () => prisma.worship.findMany({ where: { churchId, date: { gte: new Date() } }, select: { id: true, date: true, startTime: true, type: true, theme: true }, orderBy: { date: 'asc' }, take: 5 })),
      ifCan('donations.participate', async () => {
        const [openCampaigns, myPending, myConfirmed] = await Promise.all([
          prisma.donationCampaign.count({ where: { churchId, active: true, AND: [{ OR: [{ startDate: null }, { startDate: { lte: new Date() } }] }, { OR: [{ endDate: null }, { endDate: { gte: new Date() } }] }] } }),
          prisma.donation.count({ where: { churchId, donorUserId: req.user.id, status: 'registered' } }),
          prisma.donation.count({ where: { churchId, donorUserId: req.user.id, status: 'confirmed' } }),
        ]);
        return { openCampaigns, myPending, myConfirmed };
      }),
      ifCan('donations.view', async () => {
        const [pending, confirmed] = await Promise.all([
          prisma.donation.count({ where: { churchId, status: 'registered' } }),
          prisma.donation.aggregate({ where: { churchId, status: 'confirmed', kind: 'money' }, _sum: { amount: true }, _count: true }),
        ]);
        return { pending, confirmedCount: confirmed._count, confirmedAmount: Number(confirmed._sum.amount || 0) };
      }),
      ifCan('finance.view', () => getFinanceSummary(churchId)),
      ifCan('audit.view', () => prisma.auditLog.findMany({ where: { churchId }, include: { user: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, take: 8 })),
    ]);

    // Monta a resposta com os mesmos campos (e mesma ordem) de antes.
    const summary = {};
    summary.churchUpdates = { announcements: churchAnnouncements, events: publicEvents, worships: churchWorships, schedules: churchSchedules, campaigns: publicCampaigns };
    summary.recentNotifications = recentNotifications;

    if (can('members.view')) {
      summary.totalMembers = totalMembers;
      summary.upcomingBirthdays = allMembers
        .map((m) => {
          const bd = new Date(m.birthDate);
          // Usa getters/construtor UTC: birthDate é armazenado como meia-noite UTC do dia escolhido
          // pelo usuário. Usar getMonth()/getDate() (locais) dependeria do fuso do servidor.
          const next = new Date(Date.UTC(today.getUTCFullYear(), bd.getUTCMonth(), bd.getUTCDate()));
          if (next < today) next.setUTCFullYear(today.getUTCFullYear() + 1);
          return { ...m, nextBirthday: next };
        })
        .filter((m) => m.nextBirthday <= in30Days)
        .sort((a, b) => a.nextBirthday - b.nextBirthday)
        .slice(0, 5);
    }
    if (can('workers.view')) summary.totalWorkers = totalWorkers;
    if (can('schedule.view')) summary.upcomingSchedules = upcomingSchedules;
    if (can('events.view')) summary.upcomingEvents = upcomingEvents;
    if (can('announcements.view')) summary.announcements = announcements;
    if (can('worships.view')) summary.upcomingWorships = upcomingWorships;
    if (can('donations.participate')) summary.donationParticipation = donationParticipation;
    if (can('donations.view')) summary.donations = donations;
    if (can('finance.view')) summary.finance = finance;
    if (can('audit.view')) summary.recentActivity = recentActivity;

    res.status(200).json({ summary });
  } catch (err) {
    next(err);
  }
});
