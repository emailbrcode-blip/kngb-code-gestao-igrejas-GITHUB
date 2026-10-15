import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import {
  listSchedulesController,
  getScheduleVisitorsController,
  createScheduleVisitorController,
  streamScheduleVisitorsController,
  listEventsController,
  getEventVisitorsController,
  createEventVisitorController,
} from './visitors.controller.js';

export const visitorsRouter = Router();
visitorsRouter.use(authenticate);

// O service limita a lista geral a quem tem visitors.view/manage e limita
// a lista de obreiros aos cultos em que estão escalados.
visitorsRouter.get('/schedules', listSchedulesController);
visitorsRouter.get('/schedules/:scheduleId/stream', streamScheduleVisitorsController);
visitorsRouter.get('/schedules/:scheduleId', getScheduleVisitorsController);
visitorsRouter.post('/schedules/:scheduleId', createScheduleVisitorController);

visitorsRouter.get('/events', listEventsController);
visitorsRouter.get('/events/:eventId', getEventVisitorsController);
visitorsRouter.post('/events/:eventId', createEventVisitorController);
