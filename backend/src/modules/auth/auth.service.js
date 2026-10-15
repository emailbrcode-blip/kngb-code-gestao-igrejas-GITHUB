import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/AppError.js';
import { registerAudit } from '../../utils/audit.js';
import { findAuthUserByEmail, findActiveRefreshToken } from './auth.queries.js';

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateAccessToken(userId, roleSlug) {
  return jwt.sign({ sub: userId, roleSlug }, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpiresIn,
  });
}

function msFromDuration(durationStr) {
  // Suporta formatos simples tipo "15m", "7d", "1h"
  const match = /^(\d+)([smhd])$/.exec(durationStr);
  if (!match) return 15 * 60 * 1000;
  const value = Number(match[1]);
  const unit = match[2];
  const multipliers = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return value * multipliers[unit];
}

async function issueRefreshToken(userId) {
  const rawToken = crypto.randomBytes(48).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + msFromDuration(env.jwt.refreshExpiresIn));

  await prisma.refreshToken.create({
    data: { userId, tokenHash, expiresAt },
  });

  return rawToken;
}

export async function login({ email, password, ipAddress }) {
  // 1 consulta (antes ~4): usuário + role + permissões.
  const user = await findAuthUserByEmail(email);

  // Mensagem genérica de propósito — nunca revelar se foi o e-mail ou a senha que falhou.
  const invalidCredentialsError = new AppError('E-mail ou senha inválidos.', 401, 'INVALID_CREDENTIALS');

  if (!user) {
    throw invalidCredentialsError;
  }

  if (user.status !== 'active') {
    throw new AppError('Usuário inativo. Contate o administrador.', 403, 'USER_INACTIVE');
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    await registerAudit({
      userId: user.id,
      churchId: user.churchId,
      action: 'auth.login_failed',
      module: 'auth',
      ipAddress,
    });
    throw invalidCredentialsError;
  }

  const accessToken = generateAccessToken(user.id, user.role);
  // Escritas independentes: executam juntas (antes, uma depois da outra).
  const [refreshToken] = await Promise.all([
    issueRefreshToken(user.id),
    prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
  ]);

  // A auditoria não bloqueia a resposta (registerAudit já captura os próprios erros).
  registerAudit({
    userId: user.id,
    churchId: user.churchId,
    action: 'auth.login_success',
    module: 'auth',
    ipAddress,
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      churchId: user.churchId,
      permissions: user.permissions,
    },
  };
}

export async function refresh({ refreshToken, ipAddress }) {
  const tokenHash = hashToken(refreshToken);

  // 1 consulta (antes ~3 em sequência): token ativo + usuário + role.
  const stored = await findActiveRefreshToken(tokenHash);

  if (!stored || stored.expiresAt < new Date()) {
    throw new AppError('Refresh token inválido ou expirado.', 401, 'INVALID_REFRESH_TOKEN');
  }

  // Usuário pode ter sido desativado depois que o refresh token foi
  // emitido — nunca emitir um novo access token nesse caso. O token é
  // revogado aqui mesmo, já que não faz sentido deixá-lo vivo até expirar.
  if (stored.userStatus !== 'active') {
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    throw new AppError('Usuário inativo. Contate o administrador.', 403, 'USER_INACTIVE');
  }

  // Rotação de refresh token: revoga o antigo e emite um novo. As duas escritas são
  // independentes e agora executam juntas (antes: uma depois da outra).
  const [, newRefreshToken] = await Promise.all([
    prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } }),
    issueRefreshToken(stored.userId),
  ]);
  const accessToken = generateAccessToken(stored.userId, stored.role);

  // A auditoria não bloqueia a resposta (registerAudit já captura os próprios erros).
  registerAudit({
    userId: stored.userId,
    churchId: stored.churchId,
    action: 'auth.token_refreshed',
    module: 'auth',
    ipAddress,
  });

  return { accessToken, refreshToken: newRefreshToken };
}

export async function logout({ refreshToken, userId, churchId, ipAddress }) {
  if (refreshToken) {
    const tokenHash = hashToken(refreshToken);
    await prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  await registerAudit({
    userId,
    churchId,
    action: 'auth.logout',
    module: 'auth',
    ipAddress,
  });
}
