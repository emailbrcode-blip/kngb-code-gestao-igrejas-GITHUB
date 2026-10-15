import { prisma } from '../../config/database.js';
import { AppError } from '../../utils/AppError.js';

// Usado por outros módulos (schedules, announcements) para criar
// notificações automaticamente — nunca chamado direto por uma rota.
export async function createNotificationForMany(userIds, base) {
  if (!userIds.length) return;
  await prisma.notification.createMany({
    data: userIds.map((userId) => ({ ...base, userId })),
  });
}

export async function notifyChurchUsers(churchId, notification) {
  const users = await prisma.user.findMany({
    where: { churchId, status: 'active' },
    select: { id: true },
  });
  await createNotificationForMany(users.map(({ id }) => id), notification);
}

export async function listMyNotifications(actor) {
  return prisma.notification.findMany({
    where: { userId: actor.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

export async function countUnread(actor) {
  return prisma.notification.count({ where: { userId: actor.id, readAt: null } });
}

export async function markAsRead(id, actor) {
  const notification = await prisma.notification.findFirst({ where: { id, userId: actor.id } });
  if (!notification) throw new AppError('Notificação não encontrada.', 404, 'NOT_FOUND');

  return prisma.notification.update({
    where: { id },
    data: { readAt: notification.readAt ?? new Date() },
  });
}

export async function markAllAsRead(actor) {
  await prisma.notification.updateMany({
    where: { userId: actor.id, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function deleteMyNotification(id, actor) {
  const notification = await prisma.notification.findFirst({ where: { id, userId: actor.id } });
  if (!notification) throw new AppError('Notificação não encontrada.', 404, 'NOT_FOUND');
  await prisma.notification.delete({ where: { id } });
}
