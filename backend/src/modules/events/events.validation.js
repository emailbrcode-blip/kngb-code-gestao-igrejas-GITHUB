import { z } from 'zod';

export const createEventSchema = z.object({
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres.'),
  description: z.string().optional(),
  date: z.string().datetime('Data inválida.'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  location: z.string().optional(),
  responsible: z.string().optional(),
  capacity: z.number().int().positive().optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  isPublic: z.boolean().optional(),
});

export const updateEventSchema = createEventSchema.partial().extend({
  status: z.enum(['scheduled', 'cancelled', 'completed']).optional(),
});
