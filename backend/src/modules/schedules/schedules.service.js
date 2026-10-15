import { prisma } from '../../config/database.js';
import { AppError } from '../../utils/AppError.js';
import { registerAudit } from '../../utils/audit.js';
import { getWorkerByUserId, resolveFunctionId } from '../workers/workers.service.js';
import { createNotificationForMany, notifyChurchUsers } from '../notifications/notifications.service.js';
import { getWorkerAvailabilityOverview } from '../availability/availability.service.js';

const UNAVAILABLE_MESSAGE = 'Este obreiro está indisponível para este período e não pode ser escalado.';

async function ensureWorkerAvailable(workerId, schedule, churchId) {
  const worker = await getWorkerAvailabilityOverview(workerId, schedule, churchId);
  if (!worker || worker.status !== 'available') {
    const detail = worker?.reason ? ` ${worker.reason}` : '';
    throw new AppError(`${UNAVAILABLE_MESSAGE}${detail}`, 409, 'WORKER_UNAVAILABLE');
  }
}

const scheduleInclude = {
  assignments: {
    include: {
      worker: { select: { id: true, name: true, userId: true } },
      function: { select: { id: true, name: true, slug: true } },
    },
  },
};

// Quem tem qualquer uma dessas permissões administra escalas de verdade
// (vê tudo). Quem só tem 'schedule.view' (tipicamente o Obreiro) enxerga
// apenas as escalas em que ele mesmo está designado — o filtro é
// aplicado aqui no backend, nunca deixado para o frontend decidir.
function canManageSchedules(actor) {
  return (
    actor.permissions.includes('schedule.create') ||
    actor.permissions.includes('schedule.edit') ||
    actor.permissions.includes('schedule.delete')
  );
}

export async function listSchedules(actor) {
  if (canManageSchedules(actor)) {
    return prisma.schedule.findMany({
      where: { churchId: actor.churchId },
      include: scheduleInclude,
      orderBy: { date: 'asc' },
    });
  }

  // Visão restrita: só escalas em que o próprio usuário tem uma
  // designação. Se ele não tem nem cadastro de obreiro vinculado,
  // simplesmente não há nada para ver.
  const worker = await getWorkerByUserId(actor.id, actor.churchId);
  if (!worker) return [];

  return prisma.schedule.findMany({
    where: {
      churchId: actor.churchId,
      assignments: { some: { workerId: worker.id } },
    },
    include: scheduleInclude,
    orderBy: { date: 'asc' },
  });
}

// Próximas escalas para o dashboard: MESMA regra de visibilidade de listSchedules, mas o banco já
// devolve só as `limit` primeiras a partir de `fromDate` (antes: todas as escalas + designações
// eram carregadas e filtradas/cortadas em JavaScript).
export async function listUpcomingSchedules(actor, { fromDate, limit = 5 }) {
  const base = { churchId: actor.churchId, date: { gte: fromDate } };
  if (canManageSchedules(actor)) {
    return prisma.schedule.findMany({ where: base, include: scheduleInclude, orderBy: { date: 'asc' }, take: limit });
  }
  const worker = await getWorkerByUserId(actor.id, actor.churchId);
  if (!worker) return [];
  return prisma.schedule.findMany({
    where: { ...base, assignments: { some: { workerId: worker.id } } },
    include: scheduleInclude,
    orderBy: { date: 'asc' },
    take: limit,
  });
}

export async function getScheduleById(id, actor) {
  const schedule = await prisma.schedule.findFirst({
    where: { id, churchId: actor.churchId },
    include: scheduleInclude,
  });
  if (!schedule) throw new AppError('Escala não encontrada.', 404, 'NOT_FOUND');

  if (!canManageSchedules(actor)) {
    const worker = await getWorkerByUserId(actor.id, actor.churchId);
    const isAssigned = worker && schedule.assignments.some((a) => a.workerId === worker.id);
    if (!isAssigned) {
      throw new AppError('Escala não encontrada.', 404, 'NOT_FOUND');
    }
  }

  return schedule;
}

export async function createSchedule(data, actor, ipAddress) {
  const schedule = await prisma.schedule.create({
    data: { ...data, date: new Date(data.date), churchId: actor.churchId },
    include: scheduleInclude,
  });

  const dateText = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(schedule.date);
  const period = schedule.startTime ? ` às ${schedule.startTime}${schedule.endTime ? `–${schedule.endTime}` : ''}` : '';
  await notifyChurchUsers(actor.churchId, {
    churchId: actor.churchId,
    type: 'schedule_new',
    title: 'Nova escala da igreja',
    body: `${schedule.title} em ${dateText}${period}.`,
    relatedType: 'schedule',
    relatedId: schedule.id,
    link: '/escalas',
  });

  await registerAudit({
    userId: actor.id,
    churchId: actor.churchId,
    action: 'schedule.created',
    module: 'schedules',
    targetId: schedule.id,
    metadata: { title: schedule.title, date: schedule.date },
    ipAddress,
  });

  return schedule;
}

export async function updateSchedule(id, data, actor, ipAddress) {
  const existing = await prisma.schedule.findFirst({ where: { id, churchId: actor.churchId }, include: { assignments: true } });
  if (!existing) throw new AppError('Escala não encontrada.', 404, 'NOT_FOUND');

  const payload = { ...data };
  if (payload.date) payload.date = new Date(payload.date);

  if (existing.assignments.length && (payload.date || payload.startTime !== undefined || payload.endTime !== undefined)) {
    const candidate = { ...existing, ...payload };
    for (const assignment of existing.assignments) await ensureWorkerAvailable(assignment.workerId, candidate, actor.churchId);
  }

  const updated = await prisma.schedule.update({
    where: { id },
    data: payload,
    include: scheduleInclude,
  });

  await registerAudit({
    userId: actor.id,
    churchId: actor.churchId,
    action: 'schedule.updated',
    module: 'schedules',
    targetId: id,
    metadata: payload,
    ipAddress,
  });

  return updated;
}

export async function deleteSchedule(id, actor, ipAddress) {
  const existing = await prisma.schedule.findFirst({ where: { id, churchId: actor.churchId } });
  if (!existing) throw new AppError('Escala não encontrada.', 404, 'NOT_FOUND');

  await prisma.$transaction(async (tx) => {
    await tx.notification.deleteMany({ where: { relatedType: 'schedule', relatedId: id } });
    await tx.schedule.delete({ where: { id } }); // cascata remove as designações junto
  });

  await registerAudit({
    userId: actor.id,
    churchId: actor.churchId,
    action: 'schedule.deleted',
    module: 'schedules',
    targetId: id,
    ipAddress,
  });
}

// --- Designações (ScheduleAssignment) ---
// resolveFunctionId (com isolamento por igreja) vem de workers.service.js
// — havia uma cópia local aqui com o mesmo bug do CORREÇÃO 2, removida
// para não haver duas implementações divergentes.

export async function addAssignment(scheduleId, { workerId, functionSlug, notes }, actor, ipAddress) {
  const schedule = await prisma.schedule.findFirst({ where: { id: scheduleId, churchId: actor.churchId } });
  if (!schedule) throw new AppError('Escala não encontrada.', 404, 'NOT_FOUND');

  const worker = await prisma.worker.findFirst({ where: { id: workerId, churchId: actor.churchId } });
  if (!worker) throw new AppError('Obreiro não encontrado.', 422, 'INVALID_WORKER');

  const functionId = await resolveFunctionId(functionSlug, actor.churchId);

  await ensureWorkerAvailable(workerId, schedule, actor.churchId);

  const existing = await prisma.scheduleAssignment.findUnique({
    where: { scheduleId_workerId: { scheduleId, workerId } },
  });
  if (existing) {
    throw new AppError('Este obreiro já está escalado nesta escala.', 409, 'ALREADY_ASSIGNED');
  }

  const assignment = await prisma.scheduleAssignment.create({
    data: { scheduleId, workerId, functionId, notes, status: 'pending' },
    include: { worker: { select: { id: true, name: true, userId: true } }, function: true },
  });

  if (assignment.worker.userId) {
    await createNotificationForMany([assignment.worker.userId], {
      churchId: actor.churchId,
      type: 'schedule_new',
      title: 'Nova escala',
      body: `Você foi escalado para "${schedule.title}" em ${new Date(schedule.date).toLocaleDateString('pt-BR')}.`,
      relatedType: 'schedule',
      relatedId: scheduleId,
    });
  }

  await registerAudit({
    userId: actor.id,
    churchId: actor.churchId,
    action: 'schedule.assignment_added',
    module: 'schedules',
    targetId: assignment.id,
    metadata: { scheduleId, workerId },
    ipAddress,
  });

  return assignment;
}

export async function removeAssignment(scheduleId, assignmentId, actor, ipAddress) {
  const assignment = await prisma.scheduleAssignment.findFirst({
    where: { id: assignmentId, scheduleId, schedule: { churchId: actor.churchId } },
  });
  if (!assignment) throw new AppError('Designação não encontrada.', 404, 'NOT_FOUND');

  await prisma.scheduleAssignment.delete({ where: { id: assignmentId } });

  await registerAudit({
    userId: actor.id,
    churchId: actor.churchId,
    action: 'schedule.assignment_removed',
    module: 'schedules',
    targetId: assignmentId,
    ipAddress,
  });
}

// Atualização administrativa (qualquer campo/status) — requer schedule.edit.
export async function updateAssignmentStatus(scheduleId, assignmentId, data, actor, ipAddress) {
  const assignment = await prisma.scheduleAssignment.findFirst({
    where: { id: assignmentId, scheduleId, schedule: { churchId: actor.churchId } },
    include: { worker: { select: { userId: true } }, schedule: true },
  });
  if (!assignment) throw new AppError('Designação não encontrada.', 404, 'NOT_FOUND');

  if (['called', 'confirmed'].includes(data.status)) await ensureWorkerAvailable(assignment.workerId, assignment.schedule, actor.churchId);

  const updated = await prisma.scheduleAssignment.update({
    where: { id: assignmentId },
    data,
    include: { worker: { select: { id: true, name: true } }, function: true },
  });

  if (assignment.worker.userId) {
    await createNotificationForMany([assignment.worker.userId], {
      churchId: actor.churchId,
      type: 'schedule_updated',
      title: 'Escala alterada',
      body: `Sua designação em "${assignment.schedule.title}" foi atualizada.`,
      relatedType: 'schedule',
      relatedId: scheduleId,
    });
  }

  await registerAudit({
    userId: actor.id,
    churchId: actor.churchId,
    action: 'schedule.assignment_updated',
    module: 'schedules',
    targetId: assignmentId,
    metadata: data,
    ipAddress,
  });

  return updated;
}

// Confirmação/recusa pelo próprio obreiro — só pode alterar a PRÓPRIA
// designação, e só para 'confirmed' ou 'declined' (garantido pelo Zod
// schema no controller). O vínculo é checado aqui, no backend.
export async function confirmOwnAssignment(scheduleId, assignmentId, data, actor, ipAddress) {
  const worker = await getWorkerByUserId(actor.id, actor.churchId);
  if (!worker) {
    throw new AppError('Seu usuário não está vinculado a um cadastro de obreiro.', 404, 'NO_WORKER_PROFILE');
  }

  const assignment = await prisma.scheduleAssignment.findFirst({
    where: { id: assignmentId, scheduleId, workerId: worker.id },
    include: { schedule: true },
  });
  if (!assignment) {
    throw new AppError('Designação não encontrada para o seu usuário.', 404, 'NOT_FOUND');
  }

  if (data.status === 'confirmed') await ensureWorkerAvailable(worker.id, assignment.schedule, actor.churchId);

  const updated = await prisma.scheduleAssignment.update({
    where: { id: assignmentId },
    data,
  });

  if (data.status === 'confirmed' && assignment.status !== 'confirmed') {
    const recipients = await prisma.user.findMany({
      where: {
        churchId: actor.churchId,
        status: 'active',
        role: { slug: { in: ['admin_geral', 'admin_obreiros'] } },
      },
      select: { id: true },
    });
    const date = new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeZone: 'America/Sao_Paulo',
    }).format(assignment.schedule.date);
    const period = assignment.schedule.startTime
      ? ` às ${assignment.schedule.startTime}${assignment.schedule.endTime ? `–${assignment.schedule.endTime}` : ''}`
      : '';
    await createNotificationForMany(recipients.map(({ id }) => id), {
      churchId: actor.churchId,
      type: 'schedule_updated',
      title: 'Obreiro confirmou presença',
      body: `${worker.name} confirmou presença na escala "${assignment.schedule.title}" de ${date}${period}.`,
      relatedType: 'schedule',
      relatedId: scheduleId,
    });
  }

  await registerAudit({
    userId: actor.id,
    churchId: actor.churchId,
    action: 'schedule.assignment_confirmed_by_worker',
    module: 'schedules',
    targetId: assignmentId,
    metadata: data,
    ipAddress,
  });

  return updated;
}
