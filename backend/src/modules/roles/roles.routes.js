import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { prisma } from '../../config/database.js';

export const rolesRouter = Router();

rolesRouter.use(authenticate);

// Listar roles com suas permissões — usado nas telas de gestão de usuários/permissões.
// Só globais (churchId null) + customizadas da própria igreja — nunca
// role customizada de outra igreja.
rolesRouter.get('/', authorize('roles.manage'), async (req, res, next) => {
  try {
    const roles = await prisma.role.findMany({
      where: { OR: [{ churchId: null }, { churchId: req.user.churchId }] },
      include: { rolePermissions: { include: { permission: true } } },
      orderBy: { name: 'asc' },
    });

    const formatted = roles.map((role) => ({
      id: role.id,
      slug: role.slug,
      name: role.name,
      description: role.description,
      permissions: role.rolePermissions.map((rp) => rp.permission.slug),
    }));

    res.status(200).json({ roles: formatted });
  } catch (err) {
    next(err);
  }
});

// Atualizar o conjunto de permissões de uma role. Roles globais mantêm
// o comportamento de sempre (editáveis por quem tem roles.manage);
// roles customizadas só podem ser editadas pela própria igreja dona.
rolesRouter.put('/:slug/permissions', authorize('roles.manage'), async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { permissionSlugs } = req.body;

    if (!Array.isArray(permissionSlugs)) {
      return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'permissionSlugs deve ser um array.' } });
    }

    const role = await prisma.role.findFirst({
      where: { slug, OR: [{ churchId: null }, { churchId: req.user.churchId }] },
    });
    if (!role) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Role não encontrada.' } });
    }

    const permissions = await prisma.permission.findMany({ where: { slug: { in: permissionSlugs } } });

    await prisma.$transaction([
      prisma.rolePermission.deleteMany({ where: { roleId: role.id } }),
      prisma.rolePermission.createMany({
        data: permissions.map((p) => ({ roleId: role.id, permissionId: p.id })),
      }),
    ]);

    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
});
