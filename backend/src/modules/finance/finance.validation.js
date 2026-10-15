import { z } from 'zod';

export const createEntrySchema = z.object({
  type: z.enum(['income', 'expense']),
  categorySlug: z.string().optional(),
  description: z.string().min(2, 'Descrição é obrigatória.'),
  amount: z.number().positive('Valor deve ser maior que zero.'),
  date: z.string().datetime('Data inválida.'),
  dueDate: z.string().datetime().optional().or(z.literal('')),
  status: z.enum(['pending', 'paid']).optional(),
  paymentMethod: z.string().optional(),
  notes: z.string().optional(),
});

export const updateEntrySchema = createEntrySchema.partial();

export const createCategorySchema = z.object({
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres.'),
  type: z.enum(['income', 'expense']),
});
