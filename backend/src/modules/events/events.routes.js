import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { listController, getController, createController, updateController, deleteController } from './events.controller.js';

export const eventsRouter = Router();

eventsRouter.use(authenticate);

eventsRouter.get('/', authorize('events.view'), listController);
eventsRouter.get('/:id', authorize('events.view'), getController);
eventsRouter.post('/', authorize('events.create'), createController);
eventsRouter.patch('/:id', authorize('events.edit'), updateController);
eventsRouter.delete('/:id', authorize('events.delete'), deleteController);
