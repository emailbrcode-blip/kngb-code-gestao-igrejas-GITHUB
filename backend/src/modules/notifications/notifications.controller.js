import * as notificationsService from './notifications.service.js';

export async function listController(req, res, next) {
  try {
    const [notifications, unreadCount] = await Promise.all([
      notificationsService.listMyNotifications(req.user),
      notificationsService.countUnread(req.user),
    ]);
    res.status(200).json({ notifications, unreadCount });
  } catch (err) {
    next(err);
  }
}

export async function markReadController(req, res, next) {
  try {
    const notification = await notificationsService.markAsRead(req.params.id, req.user);
    res.status(200).json({ notification });
  } catch (err) {
    next(err);
  }
}

export async function markAllReadController(req, res, next) {
  try {
    await notificationsService.markAllAsRead(req.user);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function deleteController(req, res, next) {
  try { await notificationsService.deleteMyNotification(req.params.id, req.user); res.status(204).send(); }
  catch (err) { next(err); }
}
