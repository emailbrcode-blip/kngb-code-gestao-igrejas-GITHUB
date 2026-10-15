import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres.'),
  email: z.string().email('E-mail inválido.'),
  password: z.string().min(8, 'Senha deve ter ao menos 8 caracteres.'),
  roleSlug: z.string().min(1, 'Role é obrigatória.'),
  createMemberProfile: z.boolean().optional(),
  createWorkerProfile: z.boolean().optional(),
  memberId: z.string().uuid().optional(),
  workerId: z.string().uuid().optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  roleSlug: z.string().min(1).optional(),
  status: z.enum(['active', 'inactive', 'archived']).optional(),
});
