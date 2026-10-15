import { prisma } from '../../config/database.js';
import { AppError } from '../../utils/AppError.js';
import { registerAudit } from '../../utils/audit.js';

const include = {
  worship: { select: { id: true, date: true, type: true, theme: true } },
  worker: { select: { id: true, name: true, function: { select: { id: true, name: true } } } },
};

export async function listGreetings(churchId, worshipId) {
  return prisma.greeting.findMany({
    where: { churchId, ...(worshipId ? { worshipId } : {}) },
    include,
    orderBy: { createdAt: 'desc' },
  });
}

export async function createGreeting(data, actor, ipAddress) {
  const worship = await prisma.worship.findFirst({ where: { id: data.worshipId, churchId: actor.churchId } });
  if (!worship) throw new AppError('Culto não encontrado.', 422, 'INVALID_WORSHIP');
  const worker = await prisma.worker.findFirst({ where: { id: data.workerId, churchId: actor.churchId } });
  if (!worker) throw new AppError('Obreiro não encontrado.', 422, 'INVALID_WORKER');

  const existing = await prisma.greeting.findFirst({ where: { worshipId: data.worshipId, workerId: data.workerId } });
  if (existing) throw new AppError('Este obreiro já está designado neste culto.', 409, 'ALREADY_ASSIGNED');

  const item = await prisma.greeting.create({ data: { ...data, churchId: actor.churchId }, include });
  await registerAudit({ userId: actor.id, churchId: actor.churchId, action: 'greeting.created', module: 'greetings', targetId: item.id, metadata: { worshipId: item.worshipId, workerId: item.workerId }, ipAddress });
  return item;
}

export async function updateGreeting(id, data, actor, ipAddress) {
  const existing = await prisma.greeting.findFirst({ where: { id, churchId: actor.churchId } });
  if (!existing) throw new AppError('Registro não encontrado.', 404, 'NOT_FOUND');
  const item = await prisma.greeting.update({ where: { id }, data, include });
  await registerAudit({ userId: actor.id, churchId: actor.churchId, action: 'greeting.updated', module: 'greetings', targetId: id, metadata: data, ipAddress });
  return item;
}

export async function deleteGreeting(id, actor, ipAddress) {
  const existing = await prisma.greeting.findFirst({ where: { id, churchId: actor.churchId } });
  if (!existing) throw new AppError('Registro não encontrado.', 404, 'NOT_FOUND');
  await prisma.greeting.delete({ where: { id } });
  await registerAudit({ userId: actor.id, churchId: actor.churchId, action: 'greeting.deleted', module: 'greetings', targetId: id, ipAddress });
}
