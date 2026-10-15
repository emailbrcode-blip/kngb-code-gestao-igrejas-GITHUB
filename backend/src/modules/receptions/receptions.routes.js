import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { listController, createController, updateController, deleteController } from './receptions.controller.js';

export const receptionsRouter = Router();
receptionsRouter.use(authenticate);
receptionsRouter.get('/', authorize('receptions.view'), listController);
receptionsRouter.post('/', authorize('receptions.manage'), createController);
receptionsRouter.patch('/:id', authorize('receptions.manage'), updateController);
receptionsRouter.delete('/:id', authorize('receptions.manage'), deleteController);
