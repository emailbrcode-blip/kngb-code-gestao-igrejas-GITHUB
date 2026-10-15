import { z } from 'zod';

export const createEcclesiasticalRoleSchema = z.object({
  name: z.string().min(2, 'Nome do cargo deve ter ao menos 2 caracteres.'),
  description: z.string().optional(),
});

export const updateEcclesiasticalRoleSchema = z.object({
  status: z.enum(['active', 'inactive']),
});

export const assignEcclesiasticalRoleSchema = z.object({
  ecclesiasticalRoleSlug: z.string().min(1, 'Cargo é obrigatório.'),
  notes: z.string().optional(),
});
