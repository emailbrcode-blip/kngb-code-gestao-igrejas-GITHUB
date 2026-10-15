import { Router } from 'express';
import { prisma } from '../../config/database.js';
import { authenticate } from '../../middlewares/authenticate.js';

export const searchRouter = Router();
searchRouter.use(authenticate);
searchRouter.get('/', async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim().slice(0, 100);
    if (q.length < 2) return res.json({ results: [] });
    const { churchId, permissions } = req.user;
    const contains = { contains: q, mode: 'insensitive' };
    const jobs = [];
    if (permissions.includes('members.view')) jobs.push(prisma.member.findMany({ where: { churchId, fullName: contains }, select: { id: true, fullName: true, phone: true }, take: 8 }).then((rows) => rows.map((r) => ({ type: 'member', title: r.fullName, subtitle: r.phone || 'Membro', url: `/membros/${r.id}` }))));
    if (permissions.includes('workers.view')) jobs.push(prisma.worker.findMany({ where: { churchId, name: contains }, select: { id: true, name: true, ministry: true }, take: 8 }).then((rows) => rows.map((r) => ({ type: 'worker', title: r.name, subtitle: r.ministry || 'Obreiro', url: `/obreiros/${r.id}` }))));
    if (permissions.includes('events.view')) jobs.push(prisma.event.findMany({ where: { churchId, name: contains }, select: { id: true, name: true, date: true }, take: 8 }).then((rows) => rows.map((r) => ({ type: 'event', title: r.name, subtitle: new Date(r.date).toLocaleDateString('pt-BR'), url: '/eventos' }))));
    if (permissions.includes('announcements.view')) jobs.push(prisma.announcement.findMany({ where: { churchId, title: contains, archived: false }, select: { id: true, title: true }, take: 8 }).then((rows) => rows.map((r) => ({ type: 'announcement', title: r.title, subtitle: 'Aviso', url: '/avisos' }))));
    if (permissions.includes('donations.view')) jobs.push(prisma.donationCampaign.findMany({ where: { churchId, name: contains }, select: { id: true, name: true }, take: 8 }).then((rows) => rows.map((r) => ({ type: 'campaign', title: r.name, subtitle: 'Campanha de doação', url: '/doacoes' }))));
    res.json({ results: (await Promise.all(jobs)).flat() });
  } catch (err) { next(err); }
});
