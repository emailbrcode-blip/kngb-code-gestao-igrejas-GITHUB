import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { listController, markReadController, markAllReadController, deleteController } from './notifications.controller.js';

export const notificationsRouter = Router();

notificationsRouter.use(authenticate);

notificationsRouter.get('/', listController);
notificationsRouter.patch('/:id/read', markReadController);
notificationsRouter.patch('/read-all', markAllReadController);
notificationsRouter.delete('/:id', deleteController);
