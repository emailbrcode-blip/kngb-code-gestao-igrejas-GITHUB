import { z } from 'zod';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const STATUSES = ['available', 'unavailable', 'partial'];
const timeSchema = z.string().regex(/^\d{2}:\d{2}$/).refine((value) => {
  const [hours, minutes] = value.split(':').map(Number);
  return hours < 24 && minutes < 60;
}, 'Informe um horário válido.');

const availabilityEntrySchema = z.object({
  dayOfWeek: z.enum(DAYS),
  status: z.enum(STATUSES),
  startTime: timeSchema.optional(),
  endTime: timeSchema.optional(),
  notes: z.string().optional(),
}).superRefine((entry, ctx) => {
  if (Boolean(entry.startTime) !== Boolean(entry.endTime)) ctx.addIssue({ code: 'custom', path: ['endTime'], message: 'Informe o início e o fim do período.' });
  if (entry.startTime && entry.endTime && entry.endTime <= entry.startTime) ctx.addIssue({ code: 'custom', path: ['endTime'], message: 'O horário final deve ser posterior ao início.' });
});

// Substituição completa do conjunto de disponibilidade — mesma
// estratégia usada em roles.permissions: o cliente manda a lista
// inteira, o backend substitui tudo de uma vez.
export const setAvailabilitySchema = z.object({
  entries: z.array(availabilityEntrySchema).max(50),
});

export const availabilityExceptionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe uma data válida.').refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)) && new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value, 'Informe uma data válida.'),
  status: z.enum(['available', 'unavailable']),
  startTime: timeSchema.optional(),
  endTime: timeSchema.optional(),
  notes: z.string().max(500).optional(),
}).superRefine((entry, ctx) => {
  if (Boolean(entry.startTime) !== Boolean(entry.endTime)) ctx.addIssue({ code: 'custom', path: ['endTime'], message: 'Informe o início e o fim do período.' });
  if (entry.startTime && entry.endTime && entry.endTime <= entry.startTime) ctx.addIssue({ code: 'custom', path: ['endTime'], message: 'O horário final deve ser posterior ao início.' });
});
