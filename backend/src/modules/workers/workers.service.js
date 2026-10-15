import { prisma } from '../../config/database.js';
import { AppError } from '../../utils/AppError.js';
import { registerAudit } from '../../utils/audit.js';
import { validatePhotoUrl } from '../../utils/safeImage.js';

const workerInclude = {
  function: { select: { id: true, name: true, slug: true } },
  user: { select: { id: true, name: true, email: true, role: { select: { slug: true, name: true } } } },
};

function slugify(text) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function normalizePayload(data) {
  const payload = { ...data };
  if (payload.email === '') payload.email = null;
  if (payload.userId === '') payload.userId = null;
  if (payload.photoUrl === '') payload.photoUrl = null;
  if (payload.joinDate === '' || payload.joinDate === undefined) delete payload.joinDate;
  else payload.joinDate = new Date(payload.joinDate);
  delete payload.rmaNumber; // gerado pelo banco; nunca vem do cliente
  return payload;
}

function assertPhotoUrl(newUrl, currentUrl) {
  if (!newUrl || newUrl === currentUrl) return;
  const check = validatePhotoUrl(newUrl);
  if (!check.ok) throw new AppError(check.message, 422, 'INVALID_PHOTO_URL');
}

async function getLinkableUser(userId, churchId, workerId) {
  if (!userId) return null;
  const user = await prisma.user.findFirst({ where: { id: userId, churchId, status: 'active' }, select: { id: true, name: true, email: true } });
  if (!user) throw new AppError('A conta selecionada não existe, está inativa ou pertence a outra igreja.', 422, 'INVALID_USER_LINK');
  const linkedWorker = await prisma.worker.findFirst({ where: { churchId, userId, ...(workerId ? { id: { not: workerId } } : {}) }, select: { id: true } });
  if (linkedWorker) throw new AppError('Esta conta já está vinculada a outro cadastro de obreiro.', 409, 'USER_ALREADY_LINKED');
  return user;
}

// --- Funções de obreiro (WorkerFunction) ---

// Funções visíveis para uma igreja: as globais (churchId null) + as
// customizadas criadas por ela mesma.
export async function listFunctions(churchId) {
  return prisma.workerFunction.findMany({
    where: { OR: [{ churchId: null }, { churchId }] },
    orderBy: { name: 'asc' },
  });
}

export async function createFunction({ name }, actor, ipAddress) {
  const slug = slugify(name);
  const existing = await prisma.workerFunction.findUnique({ where: { slug } });
  if (existing) {
    throw new AppError('Já existe uma função com esse nome.', 409, 'FUNCTION_EXISTS');
  }

  const workerFunction = await prisma.workerFunction.create({
    data: { name, slug, churchId: actor.churchId },
  });

  await registerAudit({
    userId: actor.id,
    churchId: actor.churchId,
    action: 'worker_function.created',
    module: 'workers',
    targetId: workerFunction.id,
    metadata: { name, slug },
    ipAddress,
  });

  return workerFunction;
}

export async function deleteFunction(id, actor, ipAddress) {
  // Só pode remover uma função customizada da própria igreja — nunca
  // uma função global do sistema (churchId null).
  const workerFunction = await prisma.workerFunction.findFirst({
    where: { id, churchId: actor.churchId },
  });
  if (!workerFunction) {
    throw new AppError('Função não encontrada ou não pode ser removida.', 404, 'NOT_FOUND');
  }

  await prisma.workerFunction.delete({ where: { id } });

  await registerAudit({
    userId: actor.id,
    churchId: actor.churchId,
    action: 'worker_function.deleted',
    module: 'workers',
    targetId: id,
    ipAddress,
  });
}

// Só aceita: função global (churchId null) OU função pertencente à
// própria igreja do usuário. Nunca uma função customizada de outra
// igreja, mesmo que o slug seja conhecido.
export async function resolveFunctionId(functionSlug, churchId) {
  if (!functionSlug) return null;
  const fn = await prisma.workerFunction.findFirst({
    where: { slug: functionSlug, OR: [{ churchId: null }, { churchId }] },
  });
  if (!fn) throw new AppError('Função informada não existe ou não pertence à sua igreja.', 422, 'INVALID_FUNCTION');
  return fn.id;
}

// --- Obreiros (Worker) ---

export async function listWorkers(churchId, status) {
  return prisma.worker.findMany({
    where: { churchId, ...(status ? { status } : {}) },
    include: workerInclude,
    orderBy: { name: 'asc' },
  });
}

export async function listLinkableUsers(churchId) {
  return prisma.user.findMany({
    where: { churchId, status: 'active', worker: null },
    select: { id: true, name: true, email: true, role: { select: { slug: true, name: true } } },
    orderBy: { name: 'asc' },
  });
}

export async function archiveWorker(id, actor, ipAddress) {
  const worker = await prisma.worker.findFirst({ where: { id, churchId: actor.churchId } });
  if (!worker) throw new AppError('Obreiro não encontrado.', 404, 'NOT_FOUND');
  const archived = await prisma.worker.update({ where: { id }, data: { status: 'archived' }, include: workerInclude });
  await registerAudit({ userId: actor.id, churchId: actor.churchId, action: 'worker.archived', module: 'workers', targetId: id, metadata: { previousStatus: worker.status }, ipAddress });
  return archived;
}

export async function getWorkerById(id, churchId) {
  const worker = await prisma.worker.findFirst({ where: { id, churchId }, include: workerInclude });
  if (!worker) throw new AppError('Obreiro não encontrado.', 404, 'NOT_FOUND');
  return worker;
}

// Usado pelo módulo de disponibilidade para resolver "meu" perfil de obreiro.
export async function getWorkerByUserId(userId, churchId) {
  return prisma.worker.findFirst({ where: { userId, churchId }, include: workerInclude });
}

export async function createWorker(data, actor, ipAddress) {
  const { functionSlug, ...rest } = normalizePayload(data);
  const linkedUser = await getLinkableUser(rest.userId, actor.churchId);
  if (linkedUser) {
    rest.name ||= linkedUser.name;
    rest.email ||= linkedUser.email;
  }
  const functionId = await resolveFunctionId(functionSlug, actor.churchId);
  assertPhotoUrl(rest.photoUrl, null);

  // Mesma pessoa (mesma conta de usuário) que já é membro: reaproveita o RMA do membro.
  if (rest.userId) {
    const sameMember = await prisma.member.findFirst({ where: { churchId: actor.churchId, userId: rest.userId }, select: { rmaNumber: true } });
    if (sameMember) rest.rmaNumber = sameMember.rmaNumber;
  }

  const worker = await prisma.worker.create({
    data: { ...rest, functionId, churchId: actor.churchId },
    include: workerInclude,
  });

  await registerAudit({
    userId: actor.id,
    churchId: actor.churchId,
    action: 'worker.created',
    module: 'workers',
    targetId: worker.id,
    metadata: { name: worker.name },
    ipAddress,
  });

  return worker;
}

export async function updateWorker(id, data, actor, ipAddress) {
  const existing = await prisma.worker.findFirst({ where: { id, churchId: actor.churchId } });
  if (!existing) throw new AppError('Obreiro não encontrado.', 404, 'NOT_FOUND');

  const { functionSlug, ...rest } = normalizePayload(data);
  const payload = { ...rest };
  assertPhotoUrl(payload.photoUrl, existing.photoUrl);
  if (Object.hasOwn(payload, 'userId')) {
    const linkedUser = await getLinkableUser(payload.userId, actor.churchId, id);
    if (linkedUser) {
      if (payload.name === undefined) payload.name = linkedUser.name;
      if (payload.email === undefined || payload.email === null) payload.email = linkedUser.email;
    }
  }
  if (functionSlug !== undefined) {
    payload.functionId = await resolveFunctionId(functionSlug, actor.churchId);
  }

  const updated = await prisma.worker.update({
    where: { id },
    data: payload,
    include: workerInclude,
  });

  await registerAudit({
    userId: actor.id,
    churchId: actor.churchId,
    action: 'worker.updated',
    module: 'workers',
    targetId: id,
    metadata: payload,
    ipAddress,
  });

  return updated;
}

export async function deactivateWorker(id, actor, ipAddress) {
  const existing = await prisma.worker.findFirst({ where: { id, churchId: actor.churchId } });
  if (!existing) throw new AppError('Obreiro não encontrado.', 404, 'NOT_FOUND');

  const updated = await prisma.worker.update({
    where: { id },
    data: { status: 'inactive' },
    include: workerInclude,
  });

  await registerAudit({
    userId: actor.id,
    churchId: actor.churchId,
    action: 'worker.deactivated',
    module: 'workers',
    targetId: id,
    ipAddress,
  });

  return updated;
}

export async function deleteWorkerPermanently(id, actor, ipAddress) {
  const existing = await prisma.worker.findFirst({ where: { id, churchId: actor.churchId } });
  if (!existing) throw new AppError('Obreiro não encontrado.', 404, 'NOT_FOUND');
  await prisma.worker.delete({ where: { id } });
  await registerAudit({ userId: actor.id, churchId: actor.churchId, action: 'worker.deleted', module: 'workers', targetId: id, metadata: { name: existing.name }, ipAddress });
}
