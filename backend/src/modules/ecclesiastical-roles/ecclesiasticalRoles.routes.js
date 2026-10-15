import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { listController, createController, setStatusController, deleteController } from './ecclesiasticalRoles.controller.js';

export const ecclesiasticalRolesRouter = Router();

ecclesiasticalRolesRouter.use(authenticate);

ecclesiasticalRolesRouter.get('/', authorize('ecclesiastical_roles.view'), listController);
ecclesiasticalRolesRouter.post('/', authorize('ecclesiastical_roles.manage'), createController);
ecclesiasticalRolesRouter.patch('/:id/status', authorize('ecclesiastical_roles.manage'), setStatusController);
ecclesiasticalRolesRouter.delete('/:id', authorize('ecclesiastical_roles.manage'), deleteController);
