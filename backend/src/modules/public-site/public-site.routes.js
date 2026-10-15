import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { AppError } from '../../utils/AppError.js';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { registerAudit } from '../../utils/audit.js';

export const publicSiteRouter = Router();

// --- Conteúdo extra do site público (publicExtras) -------------------------
// JSON opcional com imagens/vídeos/ministérios etc. Só aceitamos chaves
// conhecidas (as demais são descartadas) e bloqueamos esquemas perigosos
// (javascript:, data:, vbscript:) em qualquer link.
const MAX_EXTRAS_BYTES = 100_000;
const safeUrl = z.string().max(2000).refine((v) => !/^\s*(javascript|vbscript|data):/i.test(v), 'Link inválido.');
const text = (max) => z.string().max(max);
const extrasSchema = z.object({
  siteName: text(200), logoUrl: safeUrl, heroTitle: text(300), heroMessage: text(1000), heroImage: safeUrl,
  heroButtonLabel: text(80), heroButtonUrl: safeUrl, verseText: text(500), verseReference: text(100),
  churchImage: safeUrl, commitment: text(2000), donationsIntro: text(2000), mapEmbedUrl: safeUrl,
  worshipImages: z.array(safeUrl).max(12),
  eventImages: z.record(z.string().max(100), safeUrl),
  campaignImages: z.record(z.string().max(100), safeUrl),
  videos: z.array(z.object({ title: text(200).optional(), url: safeUrl, preacher: text(200).optional(), date: text(40).optional(), thumbnailUrl: safeUrl.optional() })).max(50),
  ministries: z.array(z.object({ name: text(120), description: text(500).optional(), leader: text(120).optional(), imageUrl: safeUrl.optional() })).max(30),
  links: z.array(z.object({ label: text(80).optional(), url: safeUrl })).max(20),
}).partial();


publicSiteRouter.get('/church/:slug', async (req, res, next) => {
  try {
    const church = await prisma.church.findFirst({
      where: { slug: req.params.slug, status: 'active', publicSiteEnabled: true },
      select: { id: true, name: true, slug: true, publicDescription: true, publicAddress: true, publicPhone: true, publicEmail: true, publicServiceTimes: true, publicHistory: true, publicMission: true, publicVision: true, publicValues: true, publicWhatsapp: true, publicInstagram: true, publicFacebook: true, publicYoutube: true, publicPixKey: true, publicPixInstructions: true, publicExtras: true },
    });
    if (!church) throw new AppError('Página pública não encontrada.', 404, 'NOT_FOUND');
    const [events, worships, campaigns] = await Promise.all([
      prisma.event.findMany({ where: { churchId: church.id, isPublic: true, status: 'scheduled', date: { gte: new Date() } }, orderBy: { date: 'asc' }, take: 20 }),
      prisma.worship.findMany({ where: { churchId: church.id, date: { gte: new Date() } }, select: { id: true, date: true, startTime: true, type: true, theme: true }, orderBy: { date: 'asc' }, take: 20 }),
      // Campanhas publicadas aparecem no site mesmo antes da data de início,
      // para que possam ser divulgadas antecipadamente. A participação segue
      // respeitando a janela configurada no endpoint autenticado.
      prisma.donationCampaign.findMany({ where: { churchId: church.id, active: true, isPublic: true, OR: [{ endDate: null }, { endDate: { gte: new Date() } }] }, include: { items: { where: { active: true } } }, orderBy: { createdAt: 'desc' } }),
    ]);
    res.json({ church, events, worships, campaigns });
  } catch (err) { next(err); }
});

publicSiteRouter.get('/members/card/verify', async (req, res, next) => {
  try {
    const claims = jwt.verify(String(req.query.token || ''), env.jwt.accessSecret);
    if (claims.purpose !== 'member_card' || !claims.sub || !claims.churchId) throw new Error('Invalid card token');
    const member = await prisma.member.findFirst({ where: { id: claims.sub, churchId: claims.churchId }, select: { fullName: true, status: true, church: { select: { name: true } } } });
    if (!member) throw new AppError('Carteirinha não encontrada.', 404, 'NOT_FOUND');
    res.json({ valid: member.status === 'active', name: member.fullName, church: member.church.name, status: member.status });
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError' || err.message === 'Invalid card token') return next(new AppError('QR code inválido ou expirado.', 400, 'INVALID_CARD'));
    next(err);
  }
});

publicSiteRouter.use(authenticate);
publicSiteRouter.get('/settings', authorize('public_site.manage'), async (req, res, next) => {
  try {
    const church = await prisma.church.findUnique({ where: { id: req.user.churchId }, select: { id: true, name: true, slug: true, publicSiteEnabled: true, publicDescription: true, publicAddress: true, publicPhone: true, publicEmail: true, publicServiceTimes: true, publicHistory: true, publicMission: true, publicVision: true, publicValues: true, publicWhatsapp: true, publicInstagram: true, publicFacebook: true, publicYoutube: true, publicPixKey: true, publicPixInstructions: true, publicExtras: true } });
    res.json({ church });
  } catch (err) { next(err); }
});
publicSiteRouter.patch('/church', authorize('public_site.manage'), async (req, res, next) => {
  try {
    const parsed = z.object({ enabled: z.boolean().optional(), description: z.string().max(10000).nullable().optional(), address: z.string().max(500).nullable().optional(), phone: z.string().max(100).nullable().optional(), email: z.string().email().nullable().optional(), serviceTimes: z.string().max(3000).nullable().optional(), history: z.string().max(10000).nullable().optional(), mission: z.string().max(5000).nullable().optional(), vision: z.string().max(5000).nullable().optional(), values: z.string().max(5000).nullable().optional(), whatsapp: z.string().max(100).nullable().optional(), instagram: z.string().max(300).nullable().optional(), facebook: z.string().max(300).nullable().optional(), youtube: z.string().max(300).nullable().optional(), pixKey: z.string().max(200).nullable().optional(), pixInstructions: z.string().max(2000).nullable().optional(), extras: extrasSchema.nullable().optional() }).strict().safeParse(req.body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const message = issue.path[0] === 'extras' ? `Conteúdo extra inválido (${issue.path.slice(1).join('.') || 'extras'}): ${issue.message}` : issue.message;
      throw new AppError(message, 422, 'VALIDATION_ERROR');
    }
    const { enabled, description, address, phone, email, serviceTimes } = parsed.data;
    const data = {};
    if (enabled !== undefined) data.publicSiteEnabled = enabled;
    if (description !== undefined) data.publicDescription = description;
    if (address !== undefined) data.publicAddress = address;
    if (phone !== undefined) data.publicPhone = phone;
    if (email !== undefined) data.publicEmail = email;
    if (serviceTimes !== undefined) data.publicServiceTimes = serviceTimes;
    for (const field of ['history', 'mission', 'vision', 'values', 'whatsapp', 'instagram', 'facebook', 'youtube', 'pixKey', 'pixInstructions']) if (parsed.data[field] !== undefined) data[`public${field[0].toUpperCase()}${field.slice(1)}`] = parsed.data[field];
    // extras: mescla (nível superior) com o que já está salvo — nunca apaga os
    // campos public* existentes. `extras: null` volta o conteúdo extra ao padrão.
    if (parsed.data.extras !== undefined) {
      if (parsed.data.extras === null) {
        data.publicExtras = {};
      } else {
        if (Buffer.byteLength(JSON.stringify(parsed.data.extras)) > MAX_EXTRAS_BYTES) throw new AppError('Conteúdo extra muito grande.', 422, 'VALIDATION_ERROR');
        const current = await prisma.church.findUnique({ where: { id: req.user.churchId }, select: { publicExtras: true } });
        const base = current?.publicExtras && typeof current.publicExtras === 'object' && !Array.isArray(current.publicExtras) ? current.publicExtras : {};
        data.publicExtras = { ...base, ...parsed.data.extras };
      }
    }
    const church = await prisma.church.update({ where: { id: req.user.churchId }, data, select: { id: true, name: true, slug: true, publicSiteEnabled: true, publicDescription: true, publicAddress: true, publicPhone: true, publicEmail: true, publicServiceTimes: true, publicHistory: true, publicMission: true, publicVision: true, publicValues: true, publicWhatsapp: true, publicInstagram: true, publicFacebook: true, publicYoutube: true, publicPixKey: true, publicPixInstructions: true, publicExtras: true } });
    await registerAudit({ userId: req.user.id, churchId: req.user.churchId, action: 'public_site.updated', module: 'public_site', targetId: church.id, metadata: { fields: Object.keys(data) }, ipAddress: req.ip });
    res.json({ church });
  } catch (err) { next(err); }
});
