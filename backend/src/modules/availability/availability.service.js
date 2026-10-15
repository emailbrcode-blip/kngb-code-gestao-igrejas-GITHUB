import { prisma } from '../../config/database.js';
import { AppError } from '../../utils/AppError.js';
import { registerAudit } from '../../utils/audit.js';
import { getWorkerByUserId } from '../workers/workers.service.js';
import { createNotificationForMany } from '../notifications/notifications.service.js';
import { evaluateAvailabilityWithExceptions, weekdayForDate } from './availability.rules.js';

const DAY_LABELS = { monday: 'segunda-feira', tuesday: 'terça-feira', wednesday: 'quarta-feira', thursday: 'quinta-feira', friday: 'sexta-feira', saturday: 'sábado', sunday: 'domingo' };
const STATUS_LABELS = { available: 'DISPONÍVEL', unavailable: 'INDISPONÍVEL', partial: 'PARCIAL' };

function dateOnly(value) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}

function normalized(entries) {
  return entries.map(({ dayOfWeek, status, startTime = null, endTime = null, notes = null }) => ({ dayOfWeek, status, startTime, endTime, notes }))
    .sort((a, b) => `${a.dayOfWeek}|${a.startTime}|${a.endTime}|${a.status}`.localeCompare(`${b.dayOfWeek}|${b.startTime}|${b.endTime}|${b.status}`));
}

function availabilitySummary(previous, next) {
  const oldRows = normalized(previous);
  const newRows = normalized(next);
  if (JSON.stringify(oldRows) === JSON.stringify(newRows)) return null;
  const keys = [...new Set([...oldRows, ...newRows].map((entry) => `${entry.dayOfWeek}|${entry.startTime || ''}|${entry.endTime || ''}`))];
  const changes = keys.flatMap((key) => {
    const [, day, start, end] = key.match(/^([^|]+)\|([^|]*)\|([^|]*)$/) || [];
    const rowsForKey = (rows) => rows.filter((entry) => `${entry.dayOfWeek}|${entry.startTime || ''}|${entry.endTime || ''}` === key);
    const before = rowsForKey(oldRows).map((entry) => STATUS_LABELS[entry.status] || entry.status).join(', ') || 'INDISPONÍVEL';
    const after = rowsForKey(newRows).map((entry) => STATUS_LABELS[entry.status] || entry.status).join(', ') || 'INDISPONÍVEL';
    if (before === after) return [];
    const period = start && end ? ` das ${start} às ${end}` : '';
    return [`${DAY_LABELS[day] || day}${period}: ${before} → ${after}`];
  });
  return changes.length ? changes.join('; ') : 'Atualização nos horários ou observações de disponibilidade.';
}

export async function getAvailabilityByWorker(workerId, churchId) {
  const worker = await prisma.worker.findFirst({ where: { id: workerId, churchId } });
  if (!worker) throw new AppError('Obreiro não encontrado.', 404, 'NOT_FOUND');

  return prisma.availability.findMany({
    where: { workerId },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  });
}

export async function setAvailabilityForWorker(workerId, entries, actor, ipAddress) {
  const worker = await prisma.worker.findFirst({ where: { id: workerId, churchId: actor.churchId } });
  if (!worker) throw new AppError('Obreiro não encontrado.', 404, 'NOT_FOUND');

  const previous = await prisma.availability.findMany({ where: { workerId }, orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] });
  await prisma.$transaction([
    prisma.availability.deleteMany({ where: { workerId } }),
    prisma.availability.createMany({
      data: entries.map((entry) => ({ ...entry, workerId })),
    }),
  ]);

  await registerAudit({
    userId: actor.id,
    churchId: actor.churchId,
    action: 'availability.updated',
    module: 'availability',
    targetId: workerId,
    metadata: { previous, updated: normalized(entries) },
    ipAddress,
  });

  const summary = availabilitySummary(previous, entries);
  if (summary && worker.userId === actor.id) {
    const recipients = await prisma.user.findMany({
      where: {
        churchId: actor.churchId,
        status: 'active',
        role: { slug: { in: ['admin_geral', 'admin_obreiros', 'secretaria'] } },
      },
      select: { id: true },
    });
    const timestamp = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date());
    await createNotificationForMany(recipients.map(({ id }) => id), {
      churchId: actor.churchId,
      type: 'system',
      title: 'Disponibilidade de obreiro alterada',
      body: `${worker.name} alterou sua disponibilidade: ${summary}. Novo registro em ${timestamp}.`,
      relatedType: 'availability',
      relatedId: workerId,
    });
  }

  return getAvailabilityByWorker(workerId, actor.churchId);
}

export async function getAvailabilityOverview({ date, startTime, endTime }, churchId) {
  const normalizedDate = dateOnly(date);
  const weekday = weekdayForDate(`${normalizedDate}T00:00:00.000Z`);
  const exceptionDate = new Date(`${normalizedDate}T00:00:00.000Z`);
  const workers = await prisma.worker.findMany({
    where: { churchId, status: 'active' },
    include: { function: { select: { name: true } }, availability: { where: { dayOfWeek: weekday } }, availabilityExceptions: { where: { date: exceptionDate, active: true } } },
    orderBy: { name: 'asc' },
  });
  return workers.map((worker) => {
    const result = evaluateAvailabilityWithExceptions(worker.availability, worker.availabilityExceptions, { startTime, endTime });
    return { workerId: worker.id, name: worker.name, function: worker.function?.name || null, dayOfWeek: weekday, date: normalizedDate, startTime: startTime || null, endTime: endTime || null, ...result };
  });
}

export async function getWorkerAvailabilityOverview(workerId, { date, startTime, endTime }, churchId) {
  const normalizedDate = dateOnly(date);
  const weekday = weekdayForDate(`${normalizedDate}T00:00:00.000Z`);
  const exceptionDate = new Date(`${normalizedDate}T00:00:00.000Z`);
  const worker = await prisma.worker.findFirst({
    where: { id: workerId, churchId, status: 'active' },
    include: { function: { select: { name: true } }, availability: { where: { dayOfWeek: weekday } }, availabilityExceptions: { where: { date: exceptionDate, active: true } } },
  });
  if (!worker) return null;
  return {
    workerId: worker.id,
    name: worker.name,
    function: worker.function?.name || null,
    dayOfWeek: weekday,
    date: normalizedDate,
    startTime: startTime || null,
    endTime: endTime || null,
    ...evaluateAvailabilityWithExceptions(worker.availability, worker.availabilityExceptions, { startTime, endTime }),
  };
}

async function notifyAvailabilityException(worker, entry, actor, previousText, action) {
  if (worker.userId !== actor.id) return;
  const recipients = await prisma.user.findMany({ where: { churchId: actor.churchId, status: 'active', role: { slug: { in: ['admin_geral', 'admin_obreiros', 'secretaria'] } } }, select: { id: true } });
  const dateText = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(entry.date);
  const period = entry.startTime ? ` das ${entry.startTime} às ${entry.endTime}` : ' (dia todo)';
  const status = action === 'removed' ? 'REGRA ESPECÍFICA REMOVIDA' : STATUS_LABELS[entry.status];
  const timestamp = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date());
  await createNotificationForMany(recipients.map(({ id }) => id), { churchId: actor.churchId, type: 'system', title: 'Disponibilidade específica alterada', body: `${worker.name}: ${dateText}${period}, ${previousText} → ${status}. Alteração em ${timestamp}.`, relatedType: 'availability_exception', relatedId: entry.id });
}

export async function listAvailabilityExceptions(workerId, churchId) {
  const worker = await prisma.worker.findFirst({ where: { id: workerId, churchId } });
  if (!worker) throw new AppError('Obreiro não encontrado.', 404, 'NOT_FOUND');
  return prisma.availabilityException.findMany({ where: { workerId, churchId, active: true, date: { gte: new Date(new Date().toISOString().slice(0, 10)) } }, orderBy: [{ date: 'asc' }, { startTime: 'asc' }] });
}

export async function createAvailabilityException(workerId, data, actor, ipAddress) {
  const worker = await prisma.worker.findFirst({ where: { id: workerId, churchId: actor.churchId } });
  if (!worker) throw new AppError('Obreiro não encontrado.', 404, 'NOT_FOUND');
  const date = new Date(`${data.date}T00:00:00.000Z`);
  if (date < new Date(new Date().toISOString().slice(0, 10))) throw new AppError('A data da disponibilidade específica deve ser hoje ou futura.', 422, 'INVALID_DATE');
  const existing = await prisma.availabilityException.findMany({ where: { workerId, churchId: actor.churchId, date, active: true } });
  const record = await prisma.availabilityException.create({ data: { ...data, date, workerId, churchId: actor.churchId, changedById: actor.id } });
  const prior = existing.map((row) => STATUS_LABELS[row.status]).join(', ') || 'SEM EXCEÇÃO';
  await registerAudit({ userId: actor.id, churchId: actor.churchId, action: 'availability.exception_created', module: 'availability', targetId: record.id, metadata: { workerId, previous: prior, updated: data }, ipAddress });
  await notifyAvailabilityException(worker, record, actor, prior, 'created');
  return record;
}

export async function deactivateAvailabilityException(exceptionId, workerId, actor, ipAddress) {
  const existing = await prisma.availabilityException.findFirst({ where: { id: exceptionId, workerId, churchId: actor.churchId, active: true } });
  if (!existing) throw new AppError('Indisponibilidade específica não encontrada.', 404, 'NOT_FOUND');
  const worker = await prisma.worker.findFirst({ where: { id: workerId, churchId: actor.churchId } });
  const updated = await prisma.availabilityException.update({ where: { id: exceptionId }, data: { active: false } });
  await registerAudit({ userId: actor.id, churchId: actor.churchId, action: 'availability.exception_deactivated', module: 'availability', targetId: exceptionId, metadata: { workerId, previous: existing.status, active: false }, ipAddress });
  await notifyAvailabilityException(worker, existing, actor, STATUS_LABELS[existing.status], 'removed');
  return updated;
}

// Resolve o perfil de obreiro do próprio usuário autenticado — usado
// pelas rotas "/availability/me".
export async function getMyWorkerProfile(actor) {
  const worker = await getWorkerByUserId(actor.id, actor.churchId);
  if (!worker) {
    throw new AppError(
      'Seu usuário não está vinculado a um cadastro de obreiro.',
      404,
      'NO_WORKER_PROFILE'
    );
  }
  return worker;
}
