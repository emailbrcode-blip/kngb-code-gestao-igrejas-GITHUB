import { prisma } from '../config/database.js';

/**
 * Registra uma ação relevante no log de auditoria.
 * Chamar sempre que uma ação sensível ocorrer (login, criação de usuário,
 * alteração de permissão, etc.) — nunca deixar de auditar por conveniência.
 */
export async function registerAudit({ userId, churchId, action, module, targetId, metadata, ipAddress }) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId ?? null,
        churchId: churchId ?? null,
        action,
        module,
        targetId: targetId ?? null,
        metadata: metadata ?? undefined,
        ipAddress: ipAddress ?? null,
      },
    });
  } catch (err) {
    // Auditoria nunca deve derrubar a requisição principal —
    // apenas logamos o erro no console para investigação.
    console.error('Falha ao registrar auditoria:', err);
  }
}
