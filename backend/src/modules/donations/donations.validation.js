import { z } from 'zod';

export const createCampaignSchema = z.object({
  name: z.string().min(2, 'Nome da campanha é obrigatório.'),
  description: z.string().optional(),
  type: z.string().optional(),
  goalAmount: z.number().positive().optional(),
  goalQuantity: z.number().positive().optional(),
  quantityUnit: z.string().max(40).optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  responsibleName: z.string().max(120).optional(),
  responsibleId: z.string().uuid().optional().or(z.literal('')),
  isPublic: z.boolean().optional(),
  startDate: z.string().datetime().optional().or(z.literal('')),
  endDate: z.string().datetime().optional().or(z.literal('')),
});

export const updateCampaignSchema = createCampaignSchema.partial().extend({
  active: z.boolean().optional(),
});

export const createDonationSchema = z.object({
  campaignId: z.string().uuid().optional(),
  itemId: z.string().uuid().optional(),
  donorMemberId: z.string().uuid().optional(),
  donorUserId: z.string().uuid().optional(),
  donorName: z.string().optional(),
  amount: z.number().positive('Valor deve ser maior que zero.').optional(),
  kind: z.enum(['money', 'food', 'materials', 'service']).default('money'),
  quantity: z.number().positive().optional(),
  unit: z.string().max(40).optional(),
  estimatedAmount: z.number().positive().optional(),
  serviceDescription: z.string().max(2000).optional(),
  date: z.string().datetime('Data inválida.'),
  type: z.string().min(1, 'Tipo é obrigatório.'),
  paymentMethod: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
}).superRefine((value, ctx) => {
  if (value.kind === 'money' && !value.amount) ctx.addIssue({ code: 'custom', path: ['amount'], message: 'Valor deve ser maior que zero.' });
  if (['food', 'materials'].includes(value.kind) && (!value.quantity || !value.unit)) ctx.addIssue({ code: 'custom', path: ['quantity'], message: 'Informe quantidade e unidade.' });
  if (value.kind === 'service' && !value.serviceDescription?.trim()) ctx.addIssue({ code: 'custom', path: ['serviceDescription'], message: 'Descreva o serviço.' });
});

export const updateDonationStatusSchema = z.object({
  status: z.enum(['confirmed', 'cancelled']),
  amount: z.number().positive().optional(),
  quantity: z.number().positive().optional(),
  notes: z.string().max(2000).optional(),
});

export const donationItemSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  targetAmount: z.number().positive().optional(),
  targetQuantity: z.number().positive().optional(),
  unit: z.string().max(40).optional(),
});

export const participateSchema = z.object({
  campaignId: z.string().uuid(),
  itemId: z.string().uuid().optional(),
  amount: z.number().positive().optional(),
  kind: z.enum(['money', 'food', 'materials', 'service']).default('money'),
  quantity: z.number().positive().optional(),
  unit: z.string().max(40).optional(),
  estimatedAmount: z.number().positive().optional(),
  serviceDescription: z.string().max(2000).optional(),
  paymentMethod: z.string().optional(),
  notes: z.string().optional(),
}).superRefine((value, ctx) => {
  if (value.kind === 'money' && !value.amount) ctx.addIssue({ code: 'custom', path: ['amount'], message: 'Informe o valor da contribuição.' });
  if (['food', 'materials'].includes(value.kind) && (!value.quantity || !value.unit)) ctx.addIssue({ code: 'custom', path: ['quantity'], message: 'Informe quantidade e unidade.' });
  if (value.kind === 'service' && !value.serviceDescription?.trim()) ctx.addIssue({ code: 'custom', path: ['serviceDescription'], message: 'Descreva o serviço.' });
});

export const campaignExpenseSchema = z.object({
  description: z.string().min(2).max(300), amount: z.number().positive(), date: z.string().datetime().optional(), notes: z.string().max(2000).optional(),
});
export const campaignTransferSchema = z.object({
  amount: z.number().positive(), date: z.string().datetime().optional(), reference: z.string().max(200).optional(), notes: z.string().max(2000).optional(), categoryId: z.string().uuid().optional(),
});
