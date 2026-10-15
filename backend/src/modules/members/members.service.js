import { prisma } from '../../config/database.js';
import { AppError } from '../../utils/AppError.js';
import { registerAudit } from '../../utils/audit.js';
import { validatePhotoUrl } from '../../utils/safeImage.js';

const memberInclude = {
  responsible: { select: { id: true, fullName: true } },
  user: { select: { id: true, name: true, email: true, role: { select: { slug: true, name: true } } } },
};

function normalizePayload(data) {
  const payload = { ...data };
  if (payload.email === '') payload.email = null;
  if (payload.photoUrl === '') payload.photoUrl = null;
  if (payload.userId === '') payload.userId = null;
  if (payload.birthDate === '' || payload.birthDate === undefined) delete payload.birthDate;
  else payload.birthDate = new Date(payload.birthDate);
  if (payload.joinDate === '' || payload.joinDate === undefined) delete payload.joinDate;
  else payload.joinDate = new Date(payload.joinDate);
  // exitDate: ausente = não mexe; '' ou null = limpa; texto = grava.
  if (payload.exitDate === '' || payload.exitDate === null) payload.exitDate = null;
  else if (payload.exitDate === undefined) delete payload.exitDate;
  else payload.exitDate = new Date(payload.exitDate);
  // O RMA é gerado pelo banco e nunca vem do cliente.
  delete payload.rmaNumber;
  return payload;
}

// A foto só é validada quando muda (cadastros antigos com outro endereço continuam editáveis).
function assertPhotoUrl(newUrl, currentUrl) {
  if (!newUrl || newUrl === currentUrl) return;
  const check = validatePhotoUrl(newUrl);
  if (!check.ok) throw new AppError(check.message, 422, 'INVALID_PHOTO_URL');
}

async function getLinkableUser(userId, churchId, memberId) {
  if (!userId) return null;
  const user = await prisma.user.findFirst({ where: { id: userId, churchId, status: 'active' }, select: { id: true, name: true, email: true } });
  if (!user) throw new AppError('A conta selecionada não existe, está inativa ou pertence a outra igreja.', 422, 'INVALID_USER_LINK');
  const linkedMember = await prisma.member.findFirst({ where: { churchId, userId, ...(memberId ? { id: { not: memberId } } : {}) }, select: { id: true } });
  if (linkedMember) throw new AppError('Esta conta já está vinculada a outro cadastro de membro.', 409, 'USER_ALREADY_LINKED');
  return user;
}

export async function listMembers(churchId) {
  return prisma.member.findMany({
    where: { churchId },
    include: memberInclude,
    orderBy: { fullName: 'asc' },
  });
}

export async function listLinkableUsers(churchId) {
  return prisma.user.findMany({
    where: { churchId, status: 'active', member: null },
    select: { id: true, name: true, email: true, role: { select: { slug: true, name: true } } },
    orderBy: { name: 'asc' },
  });
}

export async function getMemberById(id, churchId) {
  const member = await prisma.member.findFirst({
    where: { id, churchId },
    include: memberInclude,
  });
  if (!member) throw new AppError('Membro não encontrado.', 404, 'NOT_FOUND');
  return member;
}

export async function createMember(data, actor, ipAddress) {
  const payload = normalizePayload(data);
  assertPhotoUrl(payload.photoUrl, null);
  const linkedUser = await getLinkableUser(payload.userId, actor.churchId);
  if (linkedUser) {
    payload.fullName ||= linkedUser.name;
    payload.email ||= linkedUser.email;
  }

  if (payload.responsibleId) {
    const responsible = await prisma.member.findFirst({
      where: { id: payload.responsibleId, churchId: actor.churchId },
    });
    if (!responsible) throw new AppError('Responsável informado não encontrado.', 422, 'INVALID_RESPONSIBLE');
  }

  const member = await prisma.member.create({
    data: { ...payload, churchId: actor.churchId },
    include: memberInclude,
  });

  await registerAudit({
    userId: actor.id,
    churchId: actor.churchId,
    action: 'member.created',
    module: 'members',
    targetId: member.id,
    metadata: { fullName: member.fullName },
    ipAddress,
  });

  return member;
}

export async function updateMember(id, data, actor, ipAddress) {
  const existing = await prisma.member.findFirst({ where: { id, churchId: actor.churchId } });
  if (!existing) throw new AppError('Membro não encontrado.', 404, 'NOT_FOUND');

  const payload = normalizePayload(data);
  assertPhotoUrl(payload.photoUrl, existing.photoUrl);
  if (Object.hasOwn(payload, 'userId')) {
    const linkedUser = await getLinkableUser(payload.userId, actor.churchId, id);
    if (linkedUser) {
      if (payload.fullName === undefined) payload.fullName = linkedUser.name;
      if (payload.email === undefined || payload.email === null) payload.email = linkedUser.email;
    }
  }

  if (payload.responsibleId) {
    if (payload.responsibleId === id) {
      throw new AppError('Um membro não pode ser responsável por si mesmo.', 422, 'INVALID_RESPONSIBLE');
    }
    const responsible = await prisma.member.findFirst({
      where: { id: payload.responsibleId, churchId: actor.churchId },
    });
    if (!responsible) throw new AppError('Responsável informado não encontrado.', 422, 'INVALID_RESPONSIBLE');
  }

  const updated = await prisma.member.update({
    where: { id },
    data: payload,
    include: memberInclude,
  });

  await registerAudit({
    userId: actor.id,
    churchId: actor.churchId,
    action: 'member.updated',
    module: 'members',
    targetId: id,
    metadata: payload,
    ipAddress,
  });

  if (Object.hasOwn(payload, 'photoUrl') && (payload.photoUrl ?? null) !== (existing.photoUrl ?? null)) {
    await registerAudit({
      userId: actor.id, churchId: actor.churchId, action: 'member.photo_updated', module: 'members', targetId: id,
      metadata: { change: payload.photoUrl ? (existing.photoUrl ? 'replaced' : 'added') : 'removed' }, ipAddress,
    });
  }

  return updated;
}

// "Excluir" membro = marcar como inativo (soft delete) — preserva
// histórico. Situações reais (visitante, transferido, afastado) devem
// ser usadas via updateMember com o campo status.
export async function deactivateMember(id, actor, ipAddress) {
  const existing = await prisma.member.findFirst({ where: { id, churchId: actor.churchId } });
  if (!existing) throw new AppError('Membro não encontrado.', 404, 'NOT_FOUND');

  const updated = await prisma.member.update({
    where: { id },
    data: { status: 'inactive' },
    include: memberInclude,
  });

  await registerAudit({
    userId: actor.id,
    churchId: actor.churchId,
    action: 'member.deactivated',
    module: 'members',
    targetId: id,
    ipAddress,
  });

  return updated;
}

export async function deleteMemberPermanently(id, actor, ipAddress) {
  const existing = await prisma.member.findFirst({ where: { id, churchId: actor.churchId } });
  if (!existing) throw new AppError('Membro não encontrado.', 404, 'NOT_FOUND');
  await prisma.member.delete({ where: { id } });
  await registerAudit({ userId: actor.id, churchId: actor.churchId, action: 'member.deleted', module: 'members', targetId: id, metadata: { fullName: existing.fullName }, ipAddress });
}
