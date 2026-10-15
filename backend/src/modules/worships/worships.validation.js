import { z } from 'zod';

export const createWorshipSchema = z.object({
  date: z.string().datetime('Data inválida.'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  type: z.string().min(1, 'Tipo é obrigatório.'),
  theme: z.string().optional(),
  attendanceCount: z.number().int().nonnegative().optional(),
  notes: z.string().optional(),
  scheduleId: z.string().uuid().optional(),
});

export const updateWorshipSchema = createWorshipSchema.partial();

export const sermonSchema = z.object({
  preacherWorkerId: z.string().uuid().optional(),
  preacherName: z.string().optional(),
  title: z.string().optional(),
  scripture: z.string().optional(),
  theme: z.string().optional(),
  summary: z.string().optional(),
  durationMinutes: z.number().int().positive().optional(),
});

export const songSchema = z.object({
  title: z.string().min(1, 'Título da música é obrigatório.'),
  position: z.number().int().nonnegative().optional(),
  notes: z.string().optional(),
});
