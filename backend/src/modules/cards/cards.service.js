import crypto from 'node:crypto';
import { prisma } from '../../config/database.js';
import { AppError } from '../../utils/AppError.js';
import { registerAudit } from '../../utils/audit.js';
import { loadRemoteImage, PhotoError } from '../../utils/safeImage.js';
import { loadCardSubject } from './cards.data.js';

// Um registro de carteirinha por pessoa. O "code" (UUID aleatório) é o identificador
// público do QR Code: não carrega nenhum dado pessoal e não é reutilizado.
export async function ensureIdCard(subject, actor) {
  const where = subject.kind === 'member' ? { memberId: subject.id } : { workerId: subject.id };
  const existing = await prisma.idCard.findFirst({ where });
  if (existing) {
    return prisma.idCard.update({
      where: { id: existing.id },
      data: { lastIssuedAt: new Date(), issueCount: { increment: 1 }, issuedById: actor.id },
    });
  }
  try {
    return await prisma.idCard.create({
      data: { churchId: actor.churchId, ...where, code: crypto.randomUUID(), issuedById: actor.id },
    });
  } catch (err) {
    // Duas emissões simultâneas da mesma pessoa: a segunda reaproveita o registro criado pela primeira.
    if (err?.code === 'P2002') {
      const again = await prisma.idCard.findFirst({ where });
      if (again) return again;
    }
    throw err;
  }
}

// Carrega a foto sem nunca impedir a emissão: sem foto/erro → marcador de substituição.
export async function resolvePhoto(photoUrl, loader = loadRemoteImage) {
  if (!photoUrl) return { image: null, status: 'missing', message: 'Foto não cadastrada.' };
  try {
    const image = await loader(photoUrl);
    return { image, status: 'ok', message: '' };
  } catch (err) {
    const message = err instanceof PhotoError ? err.message : 'Não foi possível carregar a foto.';
    return { image: null, status: 'error', message };
  }
}

export async function prepareCard(kind, id, actor, { loader } = {}) {
  const subject = await loadCardSubject(kind, id, actor.churchId);
  const [photo, card] = await Promise.all([resolvePhoto(subject.photoUrl, loader), ensureIdCard(subject, actor)]);
  await registerAudit({
    userId: actor.id, churchId: actor.churchId, action: `${kind}.card_issued`, module: kind === 'member' ? 'members' : 'workers',
    targetId: id, metadata: { rma: subject.rma, photo: photo.status }, ipAddress: actor.ip,
  });
  return { subject, card, photo };
}

// ---- Validação pública (QR Code) ----
export async function validateCard(code) {
  if (!/^[0-9a-f-]{36}$/i.test(String(code))) throw new AppError('Carteirinha não encontrada.', 404, 'NOT_FOUND');
  const card = await prisma.idCard.findUnique({
    where: { code },
    select: { code: true, issuedAt: true, revokedAt: true, member: { select: { id: true, churchId: true } }, worker: { select: { id: true, churchId: true } } },
  });
  if (!card) throw new AppError('Carteirinha não encontrada.', 404, 'NOT_FOUND');
  const kind = card.member ? 'member' : 'worker';
  const ref = card.member || card.worker;
  const subject = await loadCardSubject(kind, ref.id, ref.churchId);
  const valid = !card.revokedAt && subject.isActive;
  // Somente o mínimo para conferência — nada de CPF, endereço, telefone ou foto.
  return {
    valid, church: subject.churchName, name: subject.name, rma: subject.rma, category: subject.category,
    status: card.revokedAt ? 'Cancelada' : subject.statusLabel, issuedAt: card.issuedAt,
  };
}
