import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import {
  listUsersController,
  getUserController,
  createUserController,
  updateUserController,
  deactivateUserController,
  archiveUserController,
  deleteUserController,
} from './users.controller.js';

export const usersRouter = Router();

usersRouter.use(authenticate);

usersRouter.get('/', authorize('users.view'), listUsersController);
usersRouter.get('/:id', authorize('users.view'), getUserController);
usersRouter.post('/', authorize('users.create'), createUserController);
usersRouter.patch('/:id', authorize('users.edit'), updateUserController);
usersRouter.post('/:id/archive', authorize('users.delete'), archiveUserController);
usersRouter.delete('/:id', authorize('users.delete'), deactivateUserController);
usersRouter.delete('/:id/permanent', authorize('users.delete'), deleteUserController);
