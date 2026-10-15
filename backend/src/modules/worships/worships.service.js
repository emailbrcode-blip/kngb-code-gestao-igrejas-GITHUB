import { prisma } from '../../config/database.js';
import { AppError } from '../../utils/AppError.js';
import { registerAudit } from '../../utils/audit.js';
import { notifyChurchUsers } from '../notifications/notifications.service.js';

const worshipInclude = {
  sermon: { include: { preacherWorker: { select: { id: true, name: true } } } },
  songs: { orderBy: { position: 'asc' } },
  schedule: { select: { id: true, title: true } },
};

function normalize(data) {
  const payload = { ...data };
  if (payload.date) payload.date = new Date(payload.date);
  return payload;
}

export async function listWorships(churchId) {
  return prisma.worship.findMany({ where: { churchId }, include: worshipInclude, orderBy: { date: 'desc' } });
}

export async function getWorshipById(id, churchId) {
  const worship = await prisma.worship.findFirst({ where: { id, churchId }, include: worshipInclude });
  if (!worship) throw new AppError('Culto não encontrado.', 404, 'NOT_FOUND');
  return worship;
}

export async function createWorship(data, actor, ipAddress) {
  if (data.scheduleId) {
    const schedule = await prisma.schedule.findFirst({ where: { id: data.scheduleId, churchId: actor.churchId } });
    if (!schedule) throw new AppError('Escala informada não encontrada.', 422, 'INVALID_SCHEDULE');
  }

  const worship = await prisma.worship.create({
    data: { ...normalize(data), churchId: actor.churchId },
    include: worshipInclude,
  });

  const dateText = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(worship.date);
  await notifyChurchUsers(actor.churchId, {
    churchId: actor.churchId,
    type: 'worship',
    title: 'Novo culto publicado',
    body: `${worship.theme || worship.type} em ${dateText}${worship.startTime ? ` às ${worship.startTime}` : ''}.`,
    relatedType: 'worship',
    relatedId: worship.id,
    link: '/cultos',
  });

  await registerAudit({
    userId: actor.id, churchId: actor.churchId,
    action: 'worship.created', module: 'worships',
    targetId: worship.id, metadata: { type: worship.type, date: worship.date }, ipAddress,
  });

  return worship;
}

export async function updateWorship(id, data, actor, ipAddress) {
  const existing = await prisma.worship.findFirst({ where: { id, churchId: actor.churchId } });
  if (!existing) throw new AppError('Culto não encontrado.', 404, 'NOT_FOUND');

  const updated = await prisma.worship.update({ where: { id }, data: normalize(data), include: worshipInclude });

  await registerAudit({
    userId: actor.id, churchId: actor.churchId,
    action: 'worship.updated', module: 'worships',
    targetId: id, metadata: data, ipAddress,
  });

  return updated;
}

export async function deleteWorship(id, actor, ipAddress) {
  const existing = await prisma.worship.findFirst({ where: { id, churchId: actor.churchId } });
  if (!existing) throw new AppError('Culto não encontrado.', 404, 'NOT_FOUND');

  await prisma.worship.delete({ where: { id } });

  await registerAudit({
    userId: actor.id, churchId: actor.churchId,
    action: 'worship.deleted', module: 'worships',
    targetId: id, ipAddress,
  });
}

// --- Palavra (Sermon, 1:1 com Worship) ---

export async function upsertSermon(worshipId, data, actor, ipAddress) {
  const worship = await prisma.worship.findFirst({ where: { id: worshipId, churchId: actor.churchId } });
  if (!worship) throw new AppError('Culto não encontrado.', 404, 'NOT_FOUND');

  if (data.preacherWorkerId) {
    const worker = await prisma.worker.findFirst({ where: { id: data.preacherWorkerId, churchId: actor.churchId } });
    if (!worker) throw new AppError('Obreiro (pregador) não encontrado.', 422, 'INVALID_WORKER');
  }

  const sermon = await prisma.sermon.upsert({
    where: { worshipId },
    update: { ...data, churchId: actor.churchId },
    create: { ...data, worshipId, churchId: actor.churchId },
    include: { preacherWorker: { select: { id: true, name: true } } },
  });

  await registerAudit({
    userId: actor.id, churchId: actor.churchId,
    action: 'sermon.saved', module: 'worships',
    targetId: sermon.id, metadata: { worshipId, title: data.title }, ipAddress,
  });

  return sermon;
}

// --- Louvor (WorshipSong, repertório) ---

export async function addSong(worshipId, data, actor, ipAddress) {
  const worship = await prisma.worship.findFirst({ where: { id: worshipId, churchId: actor.churchId } });
  if (!worship) throw new AppError('Culto não encontrado.', 404, 'NOT_FOUND');

  const song = await prisma.worshipSong.create({ data: { ...data, worshipId } });

  await registerAudit({
    userId: actor.id, churchId: actor.churchId,
    action: 'worship_song.added', module: 'worships',
    targetId: song.id, metadata: { worshipId, title: data.title }, ipAddress,
  });

  return song;
}

export async function removeSong(worshipId, songId, actor, ipAddress) {
  const song = await prisma.worshipSong.findFirst({ where: { id: songId, worshipId, worship: { churchId: actor.churchId } } });
  if (!song) throw new AppError('Música não encontrada.', 404, 'NOT_FOUND');

  await prisma.worshipSong.delete({ where: { id: songId } });

  await registerAudit({
    userId: actor.id, churchId: actor.churchId,
    action: 'worship_song.removed', module: 'worships',
    targetId: songId, ipAddress,
  });
}

// --- Palavra: histórico de pregações com filtros ---

export async function listSermons(churchId, { preacher, theme, from, to } = {}) {
  const and = [];
  if (preacher) {
    and.push({ OR: [
      { preacherName: { contains: preacher, mode: 'insensitive' } },
      { preacherWorker: { name: { contains: preacher, mode: 'insensitive' } } },
    ] });
  }
  if (theme) {
    and.push({ OR: [
      { theme: { contains: theme, mode: 'insensitive' } },
      { title: { contains: theme, mode: 'insensitive' } },
    ] });
  }
  if (from || to) {
    const date = {};
    if (from) date.gte = new Date(from);
    if (to) date.lte = new Date(to);
    and.push({ worship: { date } });
  }

  return prisma.sermon.findMany({
    where: { churchId, ...(and.length ? { AND: and } : {}) },
    include: {
      worship: { select: { id: true, date: true, type: true, startTime: true } },
      preacherWorker: { select: { id: true, name: true } },
    },
    orderBy: { worship: { date: 'desc' } },
  });
}

// --- Recepção / Saudação / qualquer função: visão por culto ---
// Não é uma tabela nova: lê as designações (ScheduleAssignment) da
// função pedida, agrupadas pela escala/culto, com contagem de pessoas.

export async function listTeamByFunction(churchId, functionSlug, { from, to } = {}) {
  const fn = await prisma.workerFunction.findFirst({
    where: { slug: functionSlug, OR: [{ churchId: null }, { churchId }] },
    select: { id: true, name: true, slug: true },
  });
  if (!fn) throw new AppError('Função não encontrada.', 404, 'NOT_FOUND');

  const where = { churchId, assignments: { some: { functionId: fn.id } } };
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = new Date(from);
    if (to) where.date.lte = new Date(to);
  }

  const schedules = await prisma.schedule.findMany({
    where,
    select: {
      id: true, title: true, date: true, startTime: true, endTime: true, notes: true,
      assignments: {
        where: { functionId: fn.id },
        select: { id: true, status: true, notes: true, worker: { select: { id: true, name: true } } },
      },
    },
    orderBy: { date: 'desc' },
  });

  return {
    function: fn,
    schedules: schedules.map((s) => ({ ...s, peopleCount: s.assignments.length })),
  };
}
