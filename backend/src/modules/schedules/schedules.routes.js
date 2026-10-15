import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import {
  listSchedulesController,
  getScheduleController,
  createScheduleController,
  updateScheduleController,
  deleteScheduleController,
  addAssignmentController,
  removeAssignmentController,
  updateAssignmentStatusController,
  confirmAssignmentController,
} from './schedules.controller.js';

export const schedulesRouter = Router();

schedulesRouter.use(authenticate);

// GET é liberado para quem tem schedule.view — o filtro de "só minhas
// escalas" para quem não administra (ex: Obreiro) acontece dentro do
// service, nunca no frontend.
schedulesRouter.get('/', authorize('schedule.view'), listSchedulesController);
schedulesRouter.get('/:id', authorize('schedule.view'), getScheduleController);

schedulesRouter.post('/', authorize('schedule.create'), createScheduleController);
schedulesRouter.patch('/:id', authorize('schedule.edit'), updateScheduleController);
schedulesRouter.delete('/:id', authorize('schedule.delete'), deleteScheduleController);

schedulesRouter.post('/:id/assignments', authorize('schedule.edit'), addAssignmentController);
schedulesRouter.delete('/:id/assignments/:assignmentId', authorize('schedule.edit'), removeAssignmentController);
schedulesRouter.patch('/:id/assignments/:assignmentId', authorize('schedule.edit'), updateAssignmentStatusController);

// O próprio obreiro confirma/recusa a própria designação
schedulesRouter.patch(
  '/:id/assignments/:assignmentId/confirm',
  authorize('schedule.confirm_own'),
  confirmAssignmentController
);
