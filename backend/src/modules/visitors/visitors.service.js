import { prisma } from '../../config/database.js';
import { AppError } from '../../utils/AppError.js';
import { registerAudit } from '../../utils/audit.js';
import { createNotificationForMany } from '../notifications/notifications.service.js';
import { publishScheduleVisitor } from './visitors.realtime.js';

const scheduleContextInclude = {
  assignments: {
    include: {
      worker: { select: { id: true, name: true, userId: true } },
      function: { select: { name: true, slug: true } },
    },
  },
  worship: { include: { sermon: { include: { preacherWorker: { select: { userId: true } } } } } },
};

function hasPermission(actor, slug) {
  return actor.permissions?.includes(slug) || false;
}

function hasGlobalView(actor) {
  return hasPermission(actor, 'visitors.view') || hasPermission(actor, 'visitors.manage');
}

function hasGlobalCreate(actor) {
  return hasPermission(actor, 'visitors.create') || hasPermission(actor, 'visitors.manage');
}

function normalizedFunctionSlug(slug) {
  return String(slug || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function isReceptionAssignment(assignment) {
  return normalizedFunctionSlug(assignment.function?.slug || assignment.function?.name).includes('recepc');
}

function serializeSchedule(schedule, actorId) {
  return {
    id: schedule.id,
    title: schedule.title,
    type: schedule.type,
    date: schedule.date,
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    assignments: schedule.assignments.map((assignment) => ({
      id: assignment.id,
      workerId: assignment.workerId,
      workerName: assignment.worker.name,
      functionName: assignment.function?.name || null,
      functionSlug: assignment.function?.slug || null,
      isReception: isReceptionAssignment(assignment),
      isCurrentUser: assignment.worker.userId === actorId,
    })),
    worshipId: schedule.worship?.id || null,
  };
}

async function getScheduleContext(scheduleId, churchId) {
  const schedule = await prisma.schedule.findFirst({
    where: { id: scheduleId, churchId },
    include: scheduleContextInclude,
  });
  if (!schedule) throw new AppError('Culto/escala não encontrado nesta igreja.', 404, 'SCHEDULE_NOT_FOUND');
  return schedule;
}

function getActorAssignment(schedule, actorId) {
  return schedule.assignments.find((assignment) => assignment.worker.userId === actorId) || null;
}

function assertScheduleViewAccess(schedule, actor) {
  if (hasGlobalView(actor) || getActorAssignment(schedule, actor.id)) return;
  throw new AppError('Você não está escalado neste culto e não tem permissão para ver a lista de visitantes.', 403, 'VISITOR_LIST_FORBIDDEN');
}

export async function listAccessibleSchedules(actor) {
  const where = { churchId: actor.churchId };
  if (!hasGlobalView(actor)) {
    const worker = await prisma.worker.findFirst({ where: { churchId: actor.churchId, userId: actor.id }, select: { id: true } });
    if (!worker) return [];
    where.assignments = { some: { workerId: worker.id } };
  }

  const schedules = await prisma.schedule.findMany({
    where,
    include: scheduleContextInclude,
    orderBy: [{ date: 'desc' }, { startTime: 'desc' }],
    take: 100,
  });

  return schedules.map((schedule) => ({
    ...serializeSchedule(schedule, actor.id),
    canCreate: hasGlobalCreate(actor) || Boolean(getActorAssignment(schedule, actor.id) && isReceptionAssignment(getActorAssignment(schedule, actor.id))),
  }));
}

async function visitorRowsWithCreatorNames(where, churchId) {
  const rows = await prisma.visitor.findMany({ where: { ...where, churchId }, orderBy: [{ visitedAt: 'desc' }, { createdAt: 'desc' }] });
  const creatorIds = [...new Set(rows.map((row) => row.createdById).filter(Boolean))];
  const creators = creatorIds.length
    ? await prisma.user.findMany({ where: { id: { in: creatorIds }, churchId }, select: { id: true, name: true } })
    : [];
  const creatorNames = new Map(creators.map((creator) => [creator.id, creator.name]));
  return rows.map((row) => ({ ...row, createdByName: creatorNames.get(row.createdById) || null }));
}

export async function getScheduleVisitorList(scheduleId, actor) {
  const schedule = await getScheduleContext(scheduleId, actor.churchId);
  assertScheduleViewAccess(schedule, actor);
  const assignment = getActorAssignment(schedule, actor.id);
  return {
    schedule: serializeSchedule(schedule, actor.id),
    visitors: await visitorRowsWithCreatorNames({ scheduleId }, actor.churchId),
    canCreate: hasGlobalCreate(actor) || Boolean(assignment && isReceptionAssignment(assignment)),
  };
}

export async function assertCanViewScheduleVisitors(scheduleId, actor) {
  const schedule = await getScheduleContext(scheduleId, actor.churchId);
  assertScheduleViewAccess(schedule, actor);
  return schedule;
}

async function notificationRecipientIds(actor, schedule) {
  const assignedUserIds = schedule.assignments.map((assignment) => assignment.worker.userId).filter(Boolean);
  const preacherUserId = schedule.worship?.sermon?.preacherWorker?.userId;
  const administrators = await prisma.user.findMany({
    where: {
      churchId: actor.churchId,
      status: 'active',
      OR: [
        { role: { slug: { in: ['admin_geral', 'admin_obreiros', 'secretaria'] } } },
        { role: { rolePermissions: { some: { permission: { slug: 'visitors.manage' } } } } },
      ],
    },
    select: { id: true },
  });
  return [...new Set([actor.id, ...assignedUserIds, preacherUserId, ...administrators.map(({ id }) => id)].filter(Boolean))];
}

function validateVisitorData(data) {
  if (!data.name?.trim()) throw new AppError('Informe o nome do visitante.', 422, 'INVALID_VISITOR');
}

export async function createVisitorForSchedule(scheduleId, data, actor, ipAddress) {
  validateVisitorData(data);
  const schedule = await getScheduleContext(scheduleId, actor.churchId);
  const actorAssignment = getActorAssignment(schedule, actor.id);
  const canReceive = actorAssignment && isReceptionAssignment(actorAssignment);
  if (!hasGlobalCreate(actor) && !canReceive) {
    throw new AppError('Somente a equipe da Recepção escalada pode cadastrar visitantes neste culto.', 403, 'VISITOR_CREATE_FORBIDDEN');
  }

  const visitor = await prisma.visitor.create({
    data: {
      churchId: actor.churchId,
      scheduleId: schedule.id,
      worshipId: schedule.worship?.id || null,
      name: data.name.trim(),
      phone: data.phone || null,
      whatsapp: data.whatsapp || data.phone || null,
      visitedAt: new Date(),
      interest: data.area || null,
      notes: data.notes || null,
      createdById: actor.id,
      mayContact: false,
    },
  });

  const recipients = await notificationRecipientIds(actor, schedule);
  await createNotificationForMany(recipients, {
    churchId: actor.churchId,
    type: 'visitor',
    title: 'Novo visitante registrado',
    body: `Novo visitante registrado: ${visitor.name}. Culto: ${schedule.title}.`,
    relatedType: 'visitor',
    relatedId: visitor.id,
    link: `/visitantes/${schedule.id}`,
  });

  const createdByName = actor.name;
  const realtimeVisitor = { ...visitor, createdByName };
  publishScheduleVisitor(schedule.id, realtimeVisitor);
  await registerAudit({ userId: actor.id, churchId: actor.churchId, action: 'visitor.created_for_schedule', module: 'visitors', targetId: visitor.id, metadata: { scheduleId: schedule.id, name: visitor.name }, ipAddress });
  return realtimeVisitor;
}

export async function listAccessibleEvents(actor) {
  if (!hasGlobalView(actor)) return [];
  return prisma.event.findMany({
    where: { churchId: actor.churchId },
    select: { id: true, name: true, date: true, startTime: true, endTime: true, status: true },
    orderBy: [{ date: 'desc' }],
    take: 100,
  });
}

async function getChurchEvent(eventId, churchId) {
  const event = await prisma.event.findFirst({ where: { id: eventId, churchId } });
  if (!event) throw new AppError('Evento não encontrado nesta igreja.', 404, 'EVENT_NOT_FOUND');
  return event;
}

function assertGlobalVisitorView(actor) {
  if (!hasGlobalView(actor)) throw new AppError('Você não tem permissão para ver visitantes deste evento.', 403, 'VISITOR_LIST_FORBIDDEN');
}

export async function getEventVisitorList(eventId, actor) {
  assertGlobalVisitorView(actor);
  const event = await getChurchEvent(eventId, actor.churchId);
  return { event, visitors: await visitorRowsWithCreatorNames({ eventId }, actor.churchId), canCreate: hasGlobalCreate(actor) };
}

export async function createVisitorForEvent(eventId, data, actor, ipAddress) {
  validateVisitorData(data);
  if (!hasGlobalCreate(actor)) throw new AppError('Você não tem permissão para cadastrar visitantes neste evento.', 403, 'VISITOR_CREATE_FORBIDDEN');
  const event = await getChurchEvent(eventId, actor.churchId);
  const visitor = await prisma.visitor.create({
    data: {
      churchId: actor.churchId,
      eventId: event.id,
      name: data.name.trim(),
      phone: data.phone || null,
      whatsapp: data.whatsapp || data.phone || null,
      visitedAt: new Date(),
      interest: data.area || null,
      notes: data.notes || null,
      createdById: actor.id,
    },
  });
  const recipients = await prisma.user.findMany({
    where: { churchId: actor.churchId, status: 'active', OR: [
      { role: { slug: { in: ['admin_geral', 'admin_obreiros', 'secretaria'] } } },
      { role: { rolePermissions: { some: { permission: { slug: 'visitors.manage' } } } } },
    ] },
    select: { id: true },
  });
  await createNotificationForMany([...new Set([actor.id, ...recipients.map(({ id }) => id)])], {
    churchId: actor.churchId,
    type: 'visitor',
    title: 'Novo visitante registrado',
    body: `Novo visitante registrado: ${visitor.name}. Evento: ${event.name}.`,
    relatedType: 'visitor',
    relatedId: visitor.id,
    link: `/visitantes/eventos/${event.id}`,
  });
  const createdByName = actor.name;
  await registerAudit({ userId: actor.id, churchId: actor.churchId, action: 'visitor.created_for_event', module: 'visitors', targetId: visitor.id, metadata: { eventId: event.id, name: visitor.name }, ipAddress });
  return { ...visitor, createdByName };
}
