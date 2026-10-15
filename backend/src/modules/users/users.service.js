import bcrypt from 'bcrypt';
import { prisma } from '../../config/database.js';
import { AppError } from '../../utils/AppError.js';
import { registerAudit } from '../../utils/audit.js';

const userSelect = {
  id: true,
  name: true,
  email: true,
  status: true,
  lastLoginAt: true,
  createdAt: true,
  role: { select: { slug: true, name: true } },
};

// Todo o módulo é escopado por churchId — isolamento de dados entre
// igrejas é responsabilidade do backend, nunca do frontend.

export async function listUsers(churchId, status) {
  return prisma.user.findMany({
    where: { churchId, ...(status ? { status } : {}) },
    select: userSelect,
    orderBy: { createdAt: 'desc' },
  });
}

export async function archiveUser(id, actor, ipAddress) {
  const user = await prisma.user.findFirst({ where: { id, churchId: actor.churchId } });
  if (!user) throw new AppError('Usuário não encontrado.', 404, 'NOT_FOUND');
  if (user.id === actor.id) throw new AppError('Você não pode arquivar seu próprio usuário.', 400, 'CANNOT_SELF_ARCHIVE');
  const archived = await prisma.user.update({ where: { id }, data: { status: 'archived' }, select: userSelect });
  await registerAudit({ userId: actor.id, churchId: actor.churchId, action: 'user.archived', module: 'users', targetId: id, metadata: { previousStatus: user.status }, ipAddress });
  return archived;
}

export async function getUserById(id, churchId) {
  const user = await prisma.user.findFirst({ where: { id, churchId }, select: userSelect });
  if (!user) throw new AppError('Usuário não encontrado.', 404, 'NOT_FOUND');
  return user;
}

export async function createUser({ name, email, password, roleSlug, createMemberProfile: requestedCreateMemberProfile, createWorkerProfile: requestedCreateWorkerProfile, memberId, workerId }, actor, ipAddress) {
  const normalizedEmail = email.trim().toLowerCase();
  const existing = await prisma.user.findFirst({ where: { email: { equals: normalizedEmail, mode: 'insensitive' } } });
  if (existing) {
    throw new AppError('Já existe um usuário com este e-mail.', 409, 'EMAIL_IN_USE');
  }

  // Só aceita role global (churchId null) OU role customizada da própria
  // igreja do usuário — nunca uma role customizada de outra igreja.
  const role = await prisma.role.findFirst({
    where: { slug: roleSlug, OR: [{ churchId: null }, { churchId: actor.churchId }] },
  });
  if (!role) {
    throw new AppError('Role informada não existe ou não pertence à sua igreja.', 422, 'INVALID_ROLE');
  }

  const passwordHash = await bcrypt.hash(password, 12);

  // churchId vem do usuário autenticado (actor), nunca do corpo da
  // requisição — o frontend não escolhe a igreja do novo usuário.
  const canCreateMember = actor.permissions?.includes('members.create') || false;
  const canCreateWorker = actor.permissions?.includes('workers.create') || false;
  const canEditMember = actor.permissions?.includes('members.edit') || false;
  const canEditWorker = actor.permissions?.includes('workers.edit') || false;
  const createMemberProfile = canCreateMember && (requestedCreateMemberProfile ?? ['membro', 'obreiro'].includes(role.slug));
  const createWorkerProfile = canCreateWorker && (requestedCreateWorkerProfile ?? role.slug === 'obreiro');
  if (requestedCreateMemberProfile && !canCreateMember) throw new AppError('Seu perfil não tem permissão para criar o cadastro de membro vinculado.', 403, 'FORBIDDEN');
  if (requestedCreateWorkerProfile && !canCreateWorker) throw new AppError('Seu perfil não tem permissão para criar o cadastro de obreiro vinculado.', 403, 'FORBIDDEN');
  if (memberId && !canEditMember) throw new AppError('Seu perfil não tem permissão para vincular um cadastro de membro existente.', 403, 'FORBIDDEN');
  if (workerId && !canEditWorker) throw new AppError('Seu perfil não tem permissão para vincular um cadastro de obreiro existente.', 403, 'FORBIDDEN');

  const user = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: { name, email: normalizedEmail, passwordHash, roleId: role.id, churchId: actor.churchId },
      select: userSelect,
    });

    if (memberId) {
      const member = await tx.member.findFirst({ where: { id: memberId, churchId: actor.churchId } });
      if (!member) throw new AppError('O cadastro de membro selecionado não existe nesta igreja.', 404, 'MEMBER_NOT_FOUND');
      if (member.userId) throw new AppError('O cadastro de membro selecionado já está vinculado a outra conta.', 409, 'MEMBER_ALREADY_LINKED');
      await tx.member.update({ where: { id: memberId }, data: { userId: createdUser.id, email: member.email || normalizedEmail } });
    } else if (createMemberProfile) {
      const matches = await tx.member.findMany({ where: { churchId: actor.churchId, email: { equals: normalizedEmail, mode: 'insensitive' } }, take: 2 });
      if (matches.length > 1) throw new AppError('Há mais de um cadastro de membro com este e-mail. Vincule o registro correto antes de criar a conta.', 409, 'AMBIGUOUS_MEMBER_EMAIL');
      if (matches[0]?.userId) throw new AppError('O cadastro de membro com este e-mail já está vinculado a outra conta.', 409, 'MEMBER_ALREADY_LINKED');
      if (matches[0]) await tx.member.update({ where: { id: matches[0].id }, data: { userId: createdUser.id, email: matches[0].email || normalizedEmail } });
      else await tx.member.create({ data: { churchId: actor.churchId, userId: createdUser.id, fullName: name, email: normalizedEmail, status: 'active' } });
    }

    if (workerId) {
      const worker = await tx.worker.findFirst({ where: { id: workerId, churchId: actor.churchId } });
      if (!worker) throw new AppError('O cadastro de obreiro selecionado não existe nesta igreja.', 404, 'WORKER_NOT_FOUND');
      if (worker.userId) throw new AppError('O cadastro de obreiro selecionado já está vinculado a outra conta.', 409, 'WORKER_ALREADY_LINKED');
      await tx.worker.update({ where: { id: workerId }, data: { userId: createdUser.id, email: worker.email || normalizedEmail } });
    } else if (createWorkerProfile) {
      const matches = await tx.worker.findMany({ where: { churchId: actor.churchId, email: { equals: normalizedEmail, mode: 'insensitive' } }, take: 2 });
      if (matches.length > 1) throw new AppError('Há mais de um cadastro de obreiro com este e-mail. Vincule o registro correto antes de criar a conta.', 409, 'AMBIGUOUS_WORKER_EMAIL');
      if (matches[0]?.userId) throw new AppError('O cadastro de obreiro com este e-mail já está vinculado a outra conta.', 409, 'WORKER_ALREADY_LINKED');
      if (matches[0]) await tx.worker.update({ where: { id: matches[0].id }, data: { userId: createdUser.id, email: matches[0].email || normalizedEmail } });
      else await tx.worker.create({ data: { churchId: actor.churchId, userId: createdUser.id, name, email: normalizedEmail, status: 'active' } });
    }

    return createdUser;
  });

  await registerAudit({
    userId: actor.id,
    churchId: actor.churchId,
    action: 'user.created',
    module: 'users',
    targetId: user.id,
    metadata: { name, email: normalizedEmail, roleSlug, memberProfileLinked: Boolean(memberId) || createMemberProfile, workerProfileLinked: Boolean(workerId) || createWorkerProfile, memberId: memberId || null, workerId: workerId || null },
    ipAddress,
  });

  return user;
}

export async function updateUser(id, data, actor, ipAddress) {
  // findFirst com churchId: um admin de uma igreja não pode editar
  // usuário de outra, mesmo sabendo o id.
  const user = await prisma.user.findFirst({ where: { id, churchId: actor.churchId } });
  if (!user) throw new AppError('Usuário não encontrado.', 404, 'NOT_FOUND');

  const updateData = {};
  if (data.name) updateData.name = data.name;
  if (data.status) updateData.status = data.status;

  if (data.roleSlug) {
    const role = await prisma.role.findFirst({
      where: { slug: data.roleSlug, OR: [{ churchId: null }, { churchId: actor.churchId }] },
    });
    if (!role) throw new AppError('Role informada não existe ou não pertence à sua igreja.', 422, 'INVALID_ROLE');
    updateData.roleId = role.id;
  }

  const updated = await prisma.user.update({
    where: { id },
    data: updateData,
    select: userSelect,
  });

  await registerAudit({
    userId: actor.id,
    churchId: actor.churchId,
    action: 'user.updated',
    module: 'users',
    targetId: id,
    metadata: data,
    ipAddress,
  });

  return updated;
}

// "Excluir" usuário = desativar (soft delete). Nunca apagar de fato o
// registro, para preservar histórico de auditoria e integridade referencial.
export async function deactivateUser(id, actor, ipAddress) {
  const user = await prisma.user.findFirst({ where: { id, churchId: actor.churchId } });
  if (!user) throw new AppError('Usuário não encontrado.', 404, 'NOT_FOUND');

  if (user.id === actor.id) {
    throw new AppError('Você não pode desativar seu próprio usuário.', 400, 'CANNOT_SELF_DEACTIVATE');
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { status: 'inactive' },
    select: userSelect,
  });

  await registerAudit({
    userId: actor.id,
    churchId: actor.churchId,
    action: 'user.deactivated',
    module: 'users',
    targetId: id,
    ipAddress,
  });

  return updated;
}

export async function deleteUserPermanently(id, actor, ipAddress) {
  const user = await prisma.user.findFirst({ where: { id, churchId: actor.churchId } });
  if (!user) throw new AppError('Usuário não encontrado.', 404, 'NOT_FOUND');
  if (user.id === actor.id) throw new AppError('Você não pode excluir seu próprio usuário.', 400, 'CANNOT_SELF_DELETE');

  await prisma.$transaction(async (tx) => {
    await tx.auditLog.updateMany({ where: { userId: id }, data: { userId: null } });
    await tx.user.delete({ where: { id } });
  });
  await registerAudit({ userId: actor.id, churchId: actor.churchId, action: 'user.deleted', module: 'users', targetId: id, metadata: { name: user.name, email: user.email }, ipAddress });
}
