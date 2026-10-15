import { z } from 'zod';

export const createScheduleSchema = z.object({
  title: z.string().min(2, 'Título deve ter ao menos 2 caracteres.'),
  type: z.string().min(2, 'Tipo é obrigatório.'),
  date: z.string().datetime('Data inválida.'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  notes: z.string().optional(),
});

export const updateScheduleSchema = createScheduleSchema.partial();

export const createAssignmentSchema = z.object({
  workerId: z.string().uuid('Obreiro inválido.'),
  functionSlug: z.string().optional(),
  notes: z.string().optional(),
});

export const updateAssignmentStatusSchema = z.object({
  status: z.enum(['pending', 'called', 'confirmed', 'declined', 'substituted']),
  notes: z.string().optional(),
});

// O próprio obreiro só pode confirmar ou recusar — nunca marcar como
// "convocado" ou "substituído", isso é decisão administrativa.
export const confirmAssignmentSchema = z.object({
  status: z.enum(['confirmed', 'declined']),
  notes: z.string().optional(),
});
