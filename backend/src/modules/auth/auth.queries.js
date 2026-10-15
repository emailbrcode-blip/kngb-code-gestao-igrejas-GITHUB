import { prisma } from '../../config/database.js';

// Consultas ÚNICAS (1 ida e volta ao banco) usadas pela autenticação.
// Antes, `user.findUnique({ include: role → rolePermissions → permission })` virava ~4 consultas
// em sequência; com o banco distante, cada uma custa centenas de ms. O resultado é o mesmo:
// usuário, status, role e permissões continuam sendo lidos do banco a CADA requisição.

// Usuário + role + permissões pelo id (middleware authenticate).
export async function findAuthUserById(id) {
  const rows = await prisma.$queryRaw`
    SELECT u.id, u.name, u.email, u.status::text AS status, u.church_id AS "churchId", r.slug AS role,
           COALESCE(array_agg(p.slug) FILTER (WHERE p.slug IS NOT NULL), ARRAY[]::text[]) AS permissions
      FROM users u
      JOIN roles r ON r.id = u.role_id
      LEFT JOIN role_permissions rp ON rp.role_id = r.id
      LEFT JOIN permissions p ON p.id = rp.permission_id
     WHERE u.id = ${id}
     GROUP BY u.id, u.name, u.email, u.status, u.church_id, r.slug`;
  return rows[0] || null;
}

// Mesmo, pelo e-mail, incluindo o hash da senha (login).
export async function findAuthUserByEmail(email) {
  const rows = await prisma.$queryRaw`
    SELECT u.id, u.name, u.email, u.password_hash AS "passwordHash", u.status::text AS status, u.church_id AS "churchId", r.slug AS role,
           COALESCE(array_agg(p.slug) FILTER (WHERE p.slug IS NOT NULL), ARRAY[]::text[]) AS permissions
      FROM users u
      JOIN roles r ON r.id = u.role_id
      LEFT JOIN role_permissions rp ON rp.role_id = r.id
      LEFT JOIN permissions p ON p.id = rp.permission_id
     WHERE u.email = ${email}
     GROUP BY u.id, u.name, u.email, u.password_hash, u.status, u.church_id, r.slug`;
  return rows[0] || null;
}

// Refresh token ativo + usuário + role em 1 consulta (antes: 3 níveis em sequência).
export async function findActiveRefreshToken(tokenHash) {
  const rows = await prisma.$queryRaw`
    SELECT rt.id, rt.user_id AS "userId", rt.expires_at AS "expiresAt",
           u.status::text AS "userStatus", u.church_id AS "churchId", r.slug AS role
      FROM refresh_tokens rt
      JOIN users u ON u.id = rt.user_id
      JOIN roles r ON r.id = u.role_id
     WHERE rt.token_hash = ${tokenHash} AND rt.revoked_at IS NULL
     LIMIT 1`;
  return rows[0] || null;
}
