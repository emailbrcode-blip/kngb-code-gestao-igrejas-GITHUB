import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import {
  listMembersController,
  listLinkableUsersController,
  getMemberController,
  createMemberController,
  updateMemberController,
  deactivateMemberController,
  deleteMemberController,
} from './members.controller.js';

export const membersRouter = Router();

membersRouter.use(authenticate);

membersRouter.get('/', authorize('members.view'), listMembersController);
membersRouter.get('/linkable-users', authorize('members.view'), listLinkableUsersController);
membersRouter.get('/:id', authorize('members.view'), getMemberController);
membersRouter.post('/', authorize('members.create'), createMemberController);
membersRouter.patch('/:id', authorize('members.edit'), updateMemberController);
membersRouter.delete('/:id', authorize('members.delete'), deactivateMemberController);
membersRouter.delete('/:id/permanent', authorize('members.delete'), deleteMemberController);
