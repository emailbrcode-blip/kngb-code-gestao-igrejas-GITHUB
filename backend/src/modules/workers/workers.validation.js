import { z } from 'zod';

export const createWorkerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres.').optional(),
  userId: z.string().uuid().nullable().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email('E-mail inválido.').optional().or(z.literal('')),
  photoUrl: z.string().max(2000).url('Link da foto inválido.').optional().or(z.literal('')),
  ministry: z.string().optional(),
  functionSlug: z.string().optional(),
  joinDate: z.string().datetime().optional().or(z.literal('')),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
  if (!data.name && !data.userId) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['name'], message: 'Nome ou conta de usuário é obrigatório.' });
});

export const updateWorkerSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  photoUrl: z.string().max(2000).url('Link da foto inválido.').optional().or(z.literal('')),
  ministry: z.string().optional(),
  functionSlug: z.string().optional(),
  status: z.enum(['active', 'inactive', 'archived']).optional(),
  notes: z.string().optional(),
  userId: z.string().uuid().nullable().optional(),
});

export const createFunctionSchema = z.object({
  name: z.string().min(2, 'Nome da função deve ter ao menos 2 caracteres.'),
});
