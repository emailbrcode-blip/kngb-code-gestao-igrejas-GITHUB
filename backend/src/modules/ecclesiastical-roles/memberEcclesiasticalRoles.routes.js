import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { getMemberHistoryController, assignToMemberController } from './ecclesiasticalRoles.controller.js';

// Router separado, montado no mesmo prefixo "/members" do módulo de
// membros já existente — Express permite múltiplos routers no mesmo
// prefixo, então não é preciso tocar em members.routes.js para isso.
export const memberEcclesiasticalRolesRouter = Router();

memberEcclesiasticalRolesRouter.use(authenticate);

memberEcclesiasticalRolesRouter.get('/:memberId/ecclesiastical-roles', authorize('members.view'), getMemberHistoryController);
memberEcclesiasticalRolesRouter.post('/:memberId/ecclesiastical-roles', authorize('members.edit'), assignToMemberController);
