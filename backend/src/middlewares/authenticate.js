import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { findAuthUserById } from '../modules/auth/auth.queries.js';
import { AppError } from '../utils/AppError.js';

/**
 * Exige um access token JWT válido no header Authorization: Bearer <token>.
 * Carrega o usuário (com role e permissões) e anexa em req.user.
 * Nunca confiar em dados de usuário vindos do frontend — sempre buscar do banco.
 */
export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Token de acesso ausente.', 401, 'UNAUTHORIZED');
    }

    const token = authHeader.replace('Bearer ', '');
    let payload;
    try {
      payload = jwt.verify(token, env.jwt.accessSecret);
    } catch {
      throw new AppError('Token de acesso inválido ou expirado.', 401, 'UNAUTHORIZED');
    }

    // 1 consulta (antes ~4 em sequência): usuário + role + permissões, sempre direto do banco.
    const user = await findAuthUserById(payload.sub);

    if (!user || user.status !== 'active') {
      throw new AppError('Usuário inativo ou não encontrado.', 401, 'UNAUTHORIZED');
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      churchId: user.churchId,
      permissions: user.permissions,
    };

    next();
  } catch (err) {
    next(err);
  }
}
