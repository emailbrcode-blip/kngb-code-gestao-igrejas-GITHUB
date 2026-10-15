import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { listController, getController, createController, updateController, archiveController, deleteController } from './announcements.controller.js';

export const announcementsRouter = Router();

announcementsRouter.use(authenticate);

announcementsRouter.get('/', authorize('announcements.view'), listController);
announcementsRouter.get('/:id', authorize('announcements.view'), getController);
announcementsRouter.post('/', authorize('announcements.manage'), createController);
announcementsRouter.patch('/:id', authorize('announcements.manage'), updateController);
announcementsRouter.patch('/:id/archive', authorize('announcements.manage'), archiveController);
announcementsRouter.delete('/:id', authorize('announcements.manage'), deleteController);
