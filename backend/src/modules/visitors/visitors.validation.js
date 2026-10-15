import { z } from 'zod';

export const createVisitorSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome do visitante.').max(160),
  phone: z.string().trim().max(40).optional().or(z.literal('')),
  whatsapp: z.string().trim().max(40).optional().or(z.literal('')),
  area: z.string().trim().max(160).optional().or(z.literal('')),
  notes: z.string().trim().max(2000).optional().or(z.literal('')),
}).strict();
