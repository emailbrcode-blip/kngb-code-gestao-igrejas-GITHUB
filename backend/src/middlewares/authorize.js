import { AppError } from '../utils/AppError.js';

/**
 * Exige que o usuário autenticado possua a(s) permissão(ões) informada(s).
 * Uso: router.post('/users', authenticate, authorize('users.create'), handler)
 *
 * IMPORTANTE: esta é a única fonte de verdade para controle de acesso.
 * O frontend pode esconder botões/menus por conveniência, mas a permissão
 * REAL é sempre verificada aqui, no backend.
 */
export function authorize(...requiredPermissions) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Usuário não autenticado.', 401, 'UNAUTHORIZED'));
    }

    const hasPermission = requiredPermissions.every((perm) =>
      req.user.permissions.includes(perm)
    );

    if (!hasPermission) {
      return next(
        new AppError('Você não tem permissão para executar esta ação.', 403, 'FORBIDDEN')
      );
    }

    next();
  };
}

// Autorização para rotas cujo acesso é concedido por qualquer uma das
// permissões listadas (ex.: campanhas para gestores OU participantes).
export function authorizeAny(...acceptedPermissions) {
  return (req, res, next) => {
    if (!req.user) return next(new AppError('Usuário não autenticado.', 401, 'UNAUTHORIZED'));
    if (!acceptedPermissions.some((permission) => req.user.permissions.includes(permission))) {
      return next(new AppError('Você não tem permissão para executar esta ação.', 403, 'FORBIDDEN'));
    }
    next();
  };
}
