import { z } from 'zod';

export const createAnnouncementSchema = z.object({
  title: z.string().min(2, 'Título deve ter ao menos 2 caracteres.'),
  body: z.string().min(2, 'Texto do aviso é obrigatório.'),
  priority: z.enum(['normal', 'important', 'urgent']).optional(),
  audience: z.enum(['all', 'members', 'workers', 'leadership']).optional(),
  expiresAt: z.string().datetime().optional().or(z.literal('')),
  publishNow: z.boolean().optional(),
});

export const updateAnnouncementSchema = createAnnouncementSchema.partial().extend({
  archived: z.boolean().optional(),
});
