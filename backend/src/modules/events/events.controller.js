import { createEventSchema, updateEventSchema } from './events.validation.js';
import * as eventsService from './events.service.js';
import { AppError } from '../../utils/AppError.js';

export async function listController(req, res, next) {
  try {
    const events = await eventsService.listEvents(req.user.churchId);
    res.status(200).json({ events });
  } catch (err) {
    next(err);
  }
}

export async function getController(req, res, next) {
  try {
    const event = await eventsService.getEventById(req.params.id, req.user.churchId);
    res.status(200).json({ event });
  } catch (err) {
    next(err);
  }
}

export async function createController(req, res, next) {
  try {
    const parsed = createEventSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 422, 'VALIDATION_ERROR');
    const event = await eventsService.createEvent(parsed.data, req.user, req.ip);
    res.status(201).json({ event });
  } catch (err) {
    next(err);
  }
}

export async function updateController(req, res, next) {
  try {
    const parsed = updateEventSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 422, 'VALIDATION_ERROR');
    const event = await eventsService.updateEvent(req.params.id, parsed.data, req.user, req.ip);
    res.status(200).json({ event });
  } catch (err) {
    next(err);
  }
}

export async function deleteController(req, res, next) {
  try {
    await eventsService.deleteEvent(req.params.id, req.user, req.ip);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
