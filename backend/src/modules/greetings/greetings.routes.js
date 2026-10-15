import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { listController, createController, updateController, deleteController } from './greetings.controller.js';

export const greetingsRouter = Router();
greetingsRouter.use(authenticate);
greetingsRouter.get('/', authorize('greetings.view'), listController);
greetingsRouter.post('/', authorize('greetings.manage'), createController);
greetingsRouter.patch('/:id', authorize('greetings.manage'), updateController);
greetingsRouter.delete('/:id', authorize('greetings.manage'), deleteController);
