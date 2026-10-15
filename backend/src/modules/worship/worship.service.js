import { prisma } from '../../config/database.js';
import { AppError } from '../../utils/AppError.js';
import { registerAudit } from '../../utils/audit.js';

function normalize(data) {
  const payload = { ...data };
  if (payload.date) payload.date = new Date(payload.date);
  return payload;
}

const includeDetails = {
  sermon: true,
  songs: { orderBy: { position: 'asc' } },
  receptions: { include: { worker: { select: { id: true, name: true, function: { select: { id: true, name: true } } } } } },
  greetings: { include: { worker: { select: { id: true, name: true, function: { select: { id: true, name: true } } } } } },
};

export async function listWorships(churchId) {
  return prisma.worship.findMany({
    where: { churchId },
    include: includeDetails,
    orderBy: [{ date: 'desc' }, { startTime: 'asc' }],
  });
}

export async function getWorship(id, churchId) {
  const worship = await prisma.worship.findFirst({ where: { id, churchId }, include: includeDetails });
  if (!worship) throw new AppError('Culto não encontrado.', 404, 'NOT_FOUND');
  return worship;
}

export async function createWorship(data, actor, ipAddress) {
  const worship = await prisma.worship.create({
    data: { ...normalize(data), churchId: actor.churchId },
    include: includeDetails,
  });
  await registerAudit({
    userId: actor.id, churchId: actor.churchId,
    action: 'worship.created', module: 'worship', targetId: worship.id,
    metadata: { title: worship.title, date: worship.date }, ipAddress,
  });
  return worship;
}

export async function updateWorship(id, data, actor, ipAddress) {
  await getWorship(id, actor.churchId);
  const worship = await prisma.worship.update({
    where: { id }, data: normalize(data), include: includeDetails,
  });
  await registerAudit({
    userId: actor.id, churchId: actor.churchId,
    action: 'worship.updated', module: 'worship', targetId: id,
    metadata: data, ipAddress,
  });
  return worship;
}

export async function deleteWorship(id, actor, ipAddress) {
  await getWorship(id, actor.churchId);
  await prisma.worship.delete({ where: { id } });
  await registerAudit({
    userId: actor.id, churchId: actor.churchId,
    action: 'worship.deleted', module: 'worship', targetId: id, ipAddress,
  });
}

export async function upsertSermon(worshipId, data, actor, ipAddress) {
  await getWorship(worshipId, actor.churchId);
  const sermon = await prisma.sermon.upsert({
    where: { worshipId },
    create: { ...data, worshipId, churchId: actor.churchId },
    update: data,
  });
  await registerAudit({
    userId: actor.id, churchId: actor.churchId,
    action: 'sermon.saved', module: 'worship', targetId: worshipId,
    metadata: { sermonId: sermon.id }, ipAddress,
  });
  return sermon;
}

export async function addSong(worshipId, data, actor, ipAddress) {
  await getWorship(worshipId, actor.churchId);
  const song = await prisma.worshipSong.create({
    data: { ...data, worshipId, churchId: actor.churchId },
  });
  await registerAudit({
    userId: actor.id, churchId: actor.churchId,
    action: 'worship_song.created', module: 'worship', targetId: song.id,
    metadata: { worshipId, title: song.title }, ipAddress,
  });
  return song;
}

export async function removeSong(id, actor, ipAddress) {
  const song = await prisma.worshipSong.findFirst({ where: { id, churchId: actor.churchId } });
  if (!song) throw new AppError('Louvor não encontrado.', 404, 'NOT_FOUND');
  await prisma.worshipSong.delete({ where: { id } });
  await registerAudit({
    userId: actor.id, churchId: actor.churchId,
    action: 'worship_song.deleted', module: 'worship', targetId: id, ipAddress,
  });
}

async function assignWorker(model, worshipId, workerId, notes, actor, ipAddress, label) {
  await getWorship(worshipId, actor.churchId);
  const worker = await prisma.worker.findFirst({ where: { id: workerId, churchId: actor.churchId, status: 'active' } });
  if (!worker) throw new AppError('Obreiro não encontrado ou inativo.', 404, 'WORKER_NOT_FOUND');
  try {
    const row = await prisma[model].create({ data: { worshipId, workerId, notes, churchId: actor.churchId } });
    await registerAudit({
      userId: actor.id, churchId: actor.churchId,
      action: `${label}.assigned`, module: 'worship', targetId: row.id,
      metadata: { worshipId, workerId }, ipAddress,
    });
    return row;
  } catch (err) {
    if (err.code === 'P2002') throw new AppError('Este obreiro já está designado para este culto.', 409, 'ALREADY_ASSIGNED');
    throw err;
  }
}

export async function assignReception(worshipId, data, actor, ipAddress) {
  return assignWorker('reception', worshipId, data.workerId, data.notes, actor, ipAddress, 'reception');
}

export async function assignGreeting(worshipId, data, actor, ipAddress) {
  return assignWorker('greeting', worshipId, data.workerId, data.notes, actor, ipAddress, 'greeting');
}

async function removeAssignment(model, id, actor, ipAddress, label) {
  const row = await prisma[model].findFirst({ where: { id, churchId: actor.churchId } });
  if (!row) throw new AppError('Designação não encontrada.', 404, 'NOT_FOUND');
  await prisma[model].delete({ where: { id } });
  await registerAudit({
    userId: actor.id, churchId: actor.churchId,
    action: `${label}.removed`, module: 'worship', targetId: id, ipAddress,
  });
}

export async function removeReception(id, actor, ipAddress) {
  return removeAssignment('reception', id, actor, ipAddress, 'reception');
}

export async function removeGreeting(id, actor, ipAddress) {
  return removeAssignment('greeting', id, actor, ipAddress, 'greeting');
}
