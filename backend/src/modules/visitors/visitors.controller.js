import { AppError } from '../../utils/AppError.js';
import { createVisitorSchema } from './visitors.validation.js';
import * as service from './visitors.service.js';
import { subscribeToScheduleVisitors } from './visitors.realtime.js';

export async function listSchedulesController(req, res, next) {
  try { res.json({ schedules: await service.listAccessibleSchedules(req.user) }); }
  catch (err) { next(err); }
}

export async function getScheduleVisitorsController(req, res, next) {
  try { res.json(await service.getScheduleVisitorList(req.params.scheduleId, req.user)); }
  catch (err) { next(err); }
}

export async function createScheduleVisitorController(req, res, next) {
  try {
    const parsed = createVisitorSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 422, 'VALIDATION_ERROR');
    const visitor = await service.createVisitorForSchedule(req.params.scheduleId, parsed.data, req.user, req.ip);
    res.status(201).json({ visitor });
  } catch (err) { next(err); }
}

export async function streamScheduleVisitorsController(req, res, next) {
  try {
    await service.assertCanViewScheduleVisitors(req.params.scheduleId, req.user);
    res.status(200);
    res.set({ 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
    res.flushHeaders?.();
    res.write(': conectado\n\n');

    const unsubscribe = subscribeToScheduleVisitors(req.params.scheduleId, (visitor) => {
      if (!res.writableEnded) res.write(`event: visitor_created\ndata: ${JSON.stringify(visitor)}\n\n`);
    });
    const heartbeat = setInterval(() => {
      if (!res.writableEnded) res.write(': heartbeat\n\n');
    }, 20000);
    heartbeat.unref?.();

    res.on('close', () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  } catch (err) { next(err); }
}

export async function listEventsController(req, res, next) {
  try { res.json({ events: await service.listAccessibleEvents(req.user) }); }
  catch (err) { next(err); }
}

export async function getEventVisitorsController(req, res, next) {
  try { res.json(await service.getEventVisitorList(req.params.eventId, req.user)); }
  catch (err) { next(err); }
}

export async function createEventVisitorController(req, res, next) {
  try {
    const parsed = createVisitorSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 422, 'VALIDATION_ERROR');
    const visitor = await service.createVisitorForEvent(req.params.eventId, parsed.data, req.user, req.ip);
    res.status(201).json({ visitor });
  } catch (err) { next(err); }
}
