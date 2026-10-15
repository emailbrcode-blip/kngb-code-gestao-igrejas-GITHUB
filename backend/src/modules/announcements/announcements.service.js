import { prisma } from '../../config/database.js';
import { AppError } from '../../utils/AppError.js';
import { registerAudit } from '../../utils/audit.js';
import { notifyChurchUsers } from '../notifications/notifications.service.js';

async function notifyRecipients(announcement) {
  await notifyChurchUsers(announcement.churchId, {
    churchId: announcement.churchId,
    type: 'announcement',
    title: announcement.priority === 'urgent' ? `Urgente: ${announcement.title}` : announcement.title,
    body: announcement.body.slice(0, 200),
    relatedType: 'announcement',
    relatedId: announcement.id,
  });
}

export async function listAnnouncements(churchId) {
  return prisma.announcement.findMany({
    where: { churchId, archived: false },
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
  });
}

export async function getAnnouncementById(id, churchId) {
  const announcement = await prisma.announcement.findFirst({ where: { id, churchId } });
  if (!announcement) throw new AppError('Aviso não encontrado.', 404, 'NOT_FOUND');
  return announcement;
}

export async function createAnnouncement(data, actor, ipAddress) {
  const { publishNow, expiresAt, ...rest } = data;

  const announcement = await prisma.announcement.create({
    data: {
      ...rest,
      churchId: actor.churchId,
      authorId: actor.id,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      publishedAt: publishNow ? new Date() : null,
    },
  });

  if (publishNow) await notifyRecipients(announcement);

  await registerAudit({
    userId: actor.id,
    churchId: actor.churchId,
    action: 'announcement.created',
    module: 'announcements',
    targetId: announcement.id,
    metadata: { title: announcement.title, published: Boolean(publishNow) },
    ipAddress,
  });

  return announcement;
}

export async function updateAnnouncement(id, data, actor, ipAddress) {
  const existing = await prisma.announcement.findFirst({ where: { id, churchId: actor.churchId } });
  if (!existing) throw new AppError('Aviso não encontrado.', 404, 'NOT_FOUND');

  const { publishNow, expiresAt, ...rest } = data;
  const payload = { ...rest };
  if (expiresAt !== undefined) payload.expiresAt = expiresAt ? new Date(expiresAt) : null;

  const wasUnpublished = !existing.publishedAt;
  if (publishNow && wasUnpublished) payload.publishedAt = new Date();

  const updated = await prisma.announcement.update({ where: { id }, data: payload });

  if (publishNow && wasUnpublished) await notifyRecipients(updated);

  await registerAudit({
    userId: actor.id,
    churchId: actor.churchId,
    action: 'announcement.updated',
    module: 'announcements',
    targetId: id,
    metadata: data,
    ipAddress,
  });

  return updated;
}

export async function archiveAnnouncement(id, actor, ipAddress) {
  const existing = await prisma.announcement.findFirst({ where: { id, churchId: actor.churchId } });
  if (!existing) throw new AppError('Aviso não encontrado.', 404, 'NOT_FOUND');

  const updated = await prisma.announcement.update({ where: { id }, data: { archived: true } });

  await registerAudit({
    userId: actor.id,
    churchId: actor.churchId,
    action: 'announcement.archived',
    module: 'announcements',
    targetId: id,
    ipAddress,
  });

  return updated;
}

export async function deleteAnnouncement(id, actor, ipAddress) {
  const existing = await prisma.announcement.findFirst({ where: { id, churchId: actor.churchId } });
  if (!existing) throw new AppError('Aviso não encontrado.', 404, 'NOT_FOUND');
  await prisma.$transaction(async (tx) => {
    await tx.notification.deleteMany({ where: { relatedType: 'announcement', relatedId: id } });
    await tx.announcement.delete({ where: { id } });
  });
  await registerAudit({ userId: actor.id, churchId: actor.churchId, action: 'announcement.deleted', module: 'announcements', targetId: id, metadata: { title: existing.title }, ipAddress });
}
