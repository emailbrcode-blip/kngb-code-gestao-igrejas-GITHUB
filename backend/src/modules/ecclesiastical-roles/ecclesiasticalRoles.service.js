import { prisma } from '../../config/database.js';
import { AppError } from '../../utils/AppError.js';
import { registerAudit } from '../../utils/audit.js';

function slugify(text) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// --- Catálogo (EcclesiasticalRole) ---
// Mesmo padrão de WorkerFunction: global (churchId null) + customizado
// da própria igreja. Nunca um cargo customizado de outra igreja.

export async function listRoles(churchId) {
  return prisma.ecclesiasticalRole.findMany({
    where: { OR: [{ churchId: null }, { churchId }] },
    orderBy: { name: 'asc' },
  });
}

export async function createRole({ name, description }, actor, ipAddress) {
  const slug = slugify(name);
  const existing = await prisma.ecclesiasticalRole.findUnique({ where: { slug } });
  if (existing) throw new AppError('Já existe um cargo com esse nome.', 409, 'ROLE_EXISTS');

  const role = await prisma.ecclesiasticalRole.create({
    data: { name, slug, description, churchId: actor.churchId },
  });

  await registerAudit({
    userId: actor.id, churchId: actor.churchId,
    action: 'ecclesiastical_role.created', module: 'ecclesiastical_roles',
    targetId: role.id, metadata: { name }, ipAddress,
  });

  return role;
}

export async function setRoleStatus(id, status, actor, ipAddress) {
  // Só pode (des)ativar cargo global OU da própria igreja — nunca de outra igreja.
  const role = await prisma.ecclesiasticalRole.findFirst({
    where: { id, OR: [{ churchId: null }, { churchId: actor.churchId }] },
  });
  if (!role) throw new AppError('Cargo não encontrado.', 404, 'NOT_FOUND');

  const updated = await prisma.ecclesiasticalRole.update({ where: { id }, data: { status } });

  await registerAudit({
    userId: actor.id, churchId: actor.churchId,
    action: 'ecclesiastical_role.status_changed', module: 'ecclesiastical_roles',
    targetId: id, metadata: { status }, ipAddress,
  });

  return updated;
}

export async function deleteRole(id, actor, ipAddress) {
  const role = await prisma.ecclesiasticalRole.findFirst({ where: { id, churchId: actor.churchId } });
  if (!role) throw new AppError('Somente cargos personalizados desta igreja podem ser excluídos.', 404, 'NOT_FOUND');
  const assignments = await prisma.memberEcclesiasticalRole.count({ where: { ecclesiasticalRoleId: id } });
  if (assignments) throw new AppError('Este cargo possui histórico vinculado a membros e não pode ser excluído. Você ainda pode desativá-lo.', 409, 'ROLE_IN_USE');
  await prisma.ecclesiasticalRole.delete({ where: { id } });
  await registerAudit({ userId: actor.id, churchId: actor.churchId, action: 'ecclesiastical_role.deleted', module: 'ecclesiastical_roles', targetId: id, metadata: { name: role.name }, ipAddress });
}

async function resolveRoleId(slug, churchId) {
  const role = await prisma.ecclesiasticalRole.findFirst({
    where: { slug, OR: [{ churchId: null }, { churchId }] },
  });
  if (!role) throw new AppError('Cargo informado não existe ou não pertence à sua igreja.', 422, 'INVALID_ROLE');
  return role.id;
}

// --- Histórico por membro (MemberEcclesiasticalRole) ---

export async function getHistoryForMember(memberId, churchId) {
  const member = await prisma.member.findFirst({ where: { id: memberId, churchId } });
  if (!member) throw new AppError('Membro não encontrado.', 404, 'NOT_FOUND');

  return prisma.memberEcclesiasticalRole.findMany({
    where: { memberId },
    include: { ecclesiasticalRole: { select: { id: true, name: true, slug: true } } },
    orderBy: { startDate: 'desc' },
  });
}

// Associa um novo cargo ao membro: fecha o registro atual (se houver,
// marcando endDate = agora) e cria um novo em aberto. Isso preserva o
// histórico completo em vez de sobrescrever.
export async function assignRoleToMember(memberId, { ecclesiasticalRoleSlug, notes }, actor, ipAddress) {
  const member = await prisma.member.findFirst({ where: { id: memberId, churchId: actor.churchId } });
  if (!member) throw new AppError('Membro não encontrado.', 404, 'NOT_FOUND');

  const ecclesiasticalRoleId = await resolveRoleId(ecclesiasticalRoleSlug, actor.churchId);

  const result = await prisma.$transaction(async (tx) => {
    await tx.memberEcclesiasticalRole.updateMany({
      where: { memberId, endDate: null },
      data: { endDate: new Date() },
    });

    return tx.memberEcclesiasticalRole.create({
      data: { memberId, ecclesiasticalRoleId, notes },
      include: { ecclesiasticalRole: { select: { id: true, name: true, slug: true } } },
    });
  });

  await registerAudit({
    userId: actor.id, churchId: actor.churchId,
    action: 'member.ecclesiastical_role_assigned', module: 'members',
    targetId: memberId, metadata: { ecclesiasticalRoleSlug }, ipAddress,
  });

  return result;
}
