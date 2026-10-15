import { createAnnouncementSchema, updateAnnouncementSchema } from './announcements.validation.js';
import * as announcementsService from './announcements.service.js';
import { AppError } from '../../utils/AppError.js';

export async function listController(req, res, next) {
  try {
    const announcements = await announcementsService.listAnnouncements(req.user.churchId);
    res.status(200).json({ announcements });
  } catch (err) {
    next(err);
  }
}

export async function getController(req, res, next) {
  try {
    const announcement = await announcementsService.getAnnouncementById(req.params.id, req.user.churchId);
    res.status(200).json({ announcement });
  } catch (err) {
    next(err);
  }
}

export async function createController(req, res, next) {
  try {
    const parsed = createAnnouncementSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 422, 'VALIDATION_ERROR');
    const announcement = await announcementsService.createAnnouncement(parsed.data, req.user, req.ip);
    res.status(201).json({ announcement });
  } catch (err) {
    next(err);
  }
}

export async function updateController(req, res, next) {
  try {
    const parsed = updateAnnouncementSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 422, 'VALIDATION_ERROR');
    const announcement = await announcementsService.updateAnnouncement(req.params.id, parsed.data, req.user, req.ip);
    res.status(200).json({ announcement });
  } catch (err) {
    next(err);
  }
}

export async function archiveController(req, res, next) {
  try {
    const announcement = await announcementsService.archiveAnnouncement(req.params.id, req.user, req.ip);
    res.status(200).json({ announcement });
  } catch (err) {
    next(err);
  }
}

export async function deleteController(req, res, next) {
  try { await announcementsService.deleteAnnouncement(req.params.id, req.user, req.ip); res.status(204).send(); }
  catch (err) { next(err); }
}
