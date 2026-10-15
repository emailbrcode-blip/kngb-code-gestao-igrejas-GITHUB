import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import {
  getWorkerAvailabilityController,
  setWorkerAvailabilityController,
  getMyAvailabilityController,
  setMyAvailabilityController,
  getAvailabilityOverviewController,
  listMyExceptionsController, createMyExceptionController, deactivateMyExceptionController,
  listWorkerExceptionsController, createWorkerExceptionController, deactivateWorkerExceptionController,
} from './availability.controller.js';

export const availabilityRouter = Router();

availabilityRouter.use(authenticate);

// Própria disponibilidade (obreiro) — rotas antes de "/:workerId" para
// "me" não ser interpretado como um id.
availabilityRouter.get('/me', authorize('availability.edit_own'), getMyAvailabilityController);
availabilityRouter.put('/me', authorize('availability.edit_own'), setMyAvailabilityController);
availabilityRouter.get('/exceptions/me', authorize('availability.edit_own'), listMyExceptionsController);
availabilityRouter.post('/exceptions/me', authorize('availability.edit_own'), createMyExceptionController);
availabilityRouter.delete('/exceptions/me/:exceptionId', authorize('availability.edit_own'), deactivateMyExceptionController);
availabilityRouter.get('/exceptions/:workerId', authorize('availability.manage'), listWorkerExceptionsController);
availabilityRouter.post('/exceptions/:workerId', authorize('availability.manage'), createWorkerExceptionController);
availabilityRouter.delete('/exceptions/:workerId/:exceptionId', authorize('availability.manage'), deactivateWorkerExceptionController);

availabilityRouter.get('/check', authorize('availability.manage'), getAvailabilityOverviewController);

// Gestão administrativa da disponibilidade de qualquer obreiro
availabilityRouter.get('/:workerId', authorize('availability.manage'), getWorkerAvailabilityController);
availabilityRouter.put('/:workerId', authorize('availability.manage'), setWorkerAvailabilityController);
