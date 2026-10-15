import { prisma } from '../../config/database.js';
import { AppError } from '../../utils/AppError.js';
import { registerAudit } from '../../utils/audit.js';
import { notifyChurchUsers } from '../notifications/notifications.service.js';

function normalize(data) {
  const payload = { ...data };
  if (payload.imageUrl === '') payload.imageUrl = null;
  if (payload.date) payload.date = new Date(payload.date);
  return payload;
}

export async function listEvents(churchId) {
  return prisma.event.findMany({ where: { churchId }, orderBy: { date: 'asc' } });
}

export async function listUpcomingEvents(churchId, limit = 5) {
  return prisma.event.findMany({
    where: { churchId, date: { gte: new Date() }, status: 'scheduled' },
    orderBy: { date: 'asc' },
    take: limit,
  });
}

export async function getEventById(id, churchId) {
  const event = await prisma.event.findFirst({ where: { id, churchId } });
  if (!event) throw new AppError('Evento não encontrado.', 404, 'NOT_FOUND');
  return event;
}

export async function createEvent(data, actor, ipAddress) {
  const event = await prisma.event.create({ data: { ...normalize(data), churchId: actor.churchId } });

  if (event.isPublic) {
    await notifyChurchUsers(actor.churchId, {
      churchId: actor.churchId,
      type: 'event',
      title: 'Novo evento da igreja',
      body: `${event.name} foi publicado para todos os usuários.`,
      relatedType: 'event',
      relatedId: event.id,
      link: '/agenda',
    });
  }

  await registerAudit({
    userId: actor.id,
    churchId: actor.churchId,
    action: 'event.created',
    module: 'events',
    targetId: event.id,
    metadata: { name: event.name },
    ipAddress,
  });

  return event;
}

export async function updateEvent(id, data, actor, ipAddress) {
  const existing = await prisma.event.findFirst({ where: { id, churchId: actor.churchId } });
  if (!existing) throw new AppError('Evento não encontrado.', 404, 'NOT_FOUND');

  const updated = await prisma.event.update({ where: { id }, data: normalize(data) });

  if (!existing.isPublic && updated.isPublic && updated.status === 'scheduled') {
    await notifyChurchUsers(actor.churchId, {
      churchId: actor.churchId,
      type: 'event',
      title: 'Evento publicado',
      body: `${updated.name} foi publicado para todos os usuários.`,
      relatedType: 'event',
      relatedId: updated.id,
      link: '/agenda',
    });
  }

  await registerAudit({
    userId: actor.id,
    churchId: actor.churchId,
    action: 'event.updated',
    module: 'events',
    targetId: id,
    metadata: data,
    ipAddress,
  });

  return updated;
}

export async function deleteEvent(id, actor, ipAddress) {
  const existing = await prisma.event.findFirst({ where: { id, churchId: actor.churchId } });
  if (!existing) throw new AppError('Evento não encontrado.', 404, 'NOT_FOUND');

  await prisma.event.delete({ where: { id } });

  await registerAudit({
    userId: actor.id,
    churchId: actor.churchId,
    action: 'event.deleted',
    module: 'events',
    targetId: id,
    ipAddress,
  });
}
