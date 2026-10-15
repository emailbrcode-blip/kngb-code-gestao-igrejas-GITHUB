import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { prisma } from '../../config/database.js';

export const auditRouter = Router();

auditRouter.use(authenticate);

// GET /audit?module=users&page=1&pageSize=20
auditRouter.get('/', authorize('audit.view'), async (req, res, next) => {
  try {
    const { module, userId } = req.query;
    const page = Number(req.query.page) || 1;
    const pageSize = Math.min(Number(req.query.pageSize) || 20, 100);

    const where = {
      ...(module ? { module } : {}),
      ...(userId ? { userId } : {}),
    };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.status(200).json({ logs, total, page, pageSize });
  } catch (err) {
    next(err);
  }
});
