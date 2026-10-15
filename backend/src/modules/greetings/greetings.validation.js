import { z } from 'zod';

export const createSchema = z.object({
  worshipId: z.string().uuid('Culto inválido.'),
  workerId: z.string().uuid('Obreiro inválido.'),
  notes: z.string().optional(),
});

export const updateSchema = z.object({
  status: z.enum(['assigned', 'confirmed', 'declined', 'substituted']).optional(),
  notes: z.string().optional(),
});
