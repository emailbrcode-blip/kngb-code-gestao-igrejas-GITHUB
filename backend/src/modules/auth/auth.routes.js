import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import {
  loginController,
  refreshController,
  logoutController,
  meController,
} from './auth.controller.js';

export const authRouter = Router();

authRouter.post('/login', loginController);
authRouter.post('/refresh', refreshController);
authRouter.post('/logout', authenticate, logoutController);
authRouter.get('/me', authenticate, meController);
