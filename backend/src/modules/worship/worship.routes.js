import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import * as c from './worship.controller.js';

export const worshipRouter = Router();
worshipRouter.use(authenticate);

worshipRouter.get('/', authorize('worship.view'), c.list);
worshipRouter.get('/:id', authorize('worship.view'), c.get);
worshipRouter.post('/', authorize('worship.create'), c.create);
worshipRouter.patch('/:id', authorize('worship.edit'), c.update);
worshipRouter.put('/:worshipId/sermon', authorize('sermon.manage'), c.saveSermon);
worshipRouter.post('/:worshipId/songs', authorize('worship_songs.manage'), c.addSong);
worshipRouter.delete('/songs/:id', authorize('worship_songs.manage'), c.removeSong);

worshipRouter.post('/:worshipId/reception', authorize('reception.manage'), c.assignReception);
worshipRouter.delete('/reception/:id', authorize('reception.manage'), c.removeReception);

worshipRouter.post('/:worshipId/greeting', authorize('greeting.manage'), c.assignGreeting);
worshipRouter.delete('/greeting/:id', authorize('greeting.manage'), c.removeGreeting);

worshipRouter.delete('/:id', authorize('worship.delete'), c.remove);
