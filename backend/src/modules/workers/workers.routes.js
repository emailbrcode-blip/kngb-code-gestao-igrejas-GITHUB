import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import {
  listWorkersController,
  listLinkableUsersController,
  getWorkerController,
  createWorkerController,
  updateWorkerController,
  deactivateWorkerController,
  listFunctionsController,
  createFunctionController,
  deleteFunctionController,
  archiveWorkerController,
  deleteWorkerController,
} from './workers.controller.js';

export const workersRouter = Router();

workersRouter.use(authenticate);

// Funções — rotas antes de "/:id" para não colidir com o parâmetro dinâmico.
workersRouter.get('/functions', authorize('workers.view'), listFunctionsController);
workersRouter.post('/functions', authorize('workers.manage_functions'), createFunctionController);
workersRouter.delete('/functions/:id', authorize('workers.manage_functions'), deleteFunctionController);

workersRouter.get('/', authorize('workers.view'), listWorkersController);
workersRouter.get('/linkable-users', authorize('workers.view'), listLinkableUsersController);
workersRouter.get('/:id', authorize('workers.view'), getWorkerController);
workersRouter.post('/', authorize('workers.create'), createWorkerController);
workersRouter.patch('/:id', authorize('workers.edit'), updateWorkerController);
workersRouter.post('/:id/archive', authorize('workers.delete'), archiveWorkerController);
workersRouter.delete('/:id', authorize('workers.delete'), deactivateWorkerController);
workersRouter.delete('/:id/permanent', authorize('workers.delete'), deleteWorkerController);
