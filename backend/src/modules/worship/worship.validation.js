import { z } from 'zod';

const time = z.string().regex(/^\d{2}:\d{2}$/, 'Horário inválido. Use HH:mm.');

export const createWorshipSchema = z.object({
  title: z.string().min(2, 'Título deve ter ao menos 2 caracteres.'),
  type: z.string().min(2).default('culto'),
  date: z.string().datetime('Data inválida.'),
  startTime: time.optional(),
  endTime: time.optional(),
  theme: z.string().optional(),
  notes: z.string().optional(),
});

export const updateWorshipSchema = createWorshipSchema.partial().extend({
  status: z.enum(['scheduled', 'completed', 'cancelled']).optional(),
});

export const sermonSchema = z.object({
  title: z.string().min(2, 'Título da Palavra é obrigatório.'),
  bibleReference: z.string().optional(),
  preacher: z.string().optional(),
  summary: z.string().optional(),
  notes: z.string().optional(),
});

export const songSchema = z.object({
  title: z.string().min(2, 'Nome do louvor é obrigatório.'),
  artist: z.string().optional(),
  position: z.number().int().min(0).optional(),
  notes: z.string().optional(),
});

export const assignmentSchema = z.object({
  workerId: z.string().uuid('Obreiro inválido.'),
  notes: z.string().optional(),
});
