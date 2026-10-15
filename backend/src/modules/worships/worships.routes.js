import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import {
  listController, getController, createController, updateController, deleteController,
  saveSermonController, addSongController, removeSongController,
  listSermonsController, teamByFunctionController,
} from './worships.controller.js';

export const worshipsRouter = Router();
worshipsRouter.use(authenticate);

worshipsRouter.get('/', authorize('worships.view'), listController);
worshipsRouter.get('/sermons', authorize('worships.view'), listSermonsController);
worshipsRouter.get('/team/:functionSlug', authorize('worships.view'), teamByFunctionController);
worshipsRouter.get('/:id', authorize('worships.view'), getController);
worshipsRouter.post('/', authorize('worships.create'), createController);
worshipsRouter.patch('/:id', authorize('worships.edit'), updateController);
worshipsRouter.delete('/:id', authorize('worships.delete'), deleteController);

// Palavra — mesmo nível de permissão de edição do culto
worshipsRouter.put('/:id/sermon', authorize('worships.edit'), saveSermonController);

// Louvor / repertório
worshipsRouter.post('/:id/songs', authorize('worships.edit'), addSongController);
worshipsRouter.delete('/:id/songs/:songId', authorize('worships.edit'), removeSongController);
