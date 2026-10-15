import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { prisma } from '../../config/database.js';

export const permissionsRouter = Router();

permissionsRouter.use(authenticate);

permissionsRouter.get('/', authorize('roles.manage'), async (req, res, next) => {
  try {
    const permissions = await prisma.permission.findMany({ orderBy: { slug: 'asc' } });
    res.status(200).json({ permissions });
  } catch (err) {
    next(err);
  }
});
