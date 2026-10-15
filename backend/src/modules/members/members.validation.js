import { z } from 'zod';

const MEMBER_STATUSES = ['active', 'inactive', 'visitor', 'transferred', 'away'];

const memberFields = z.object({
  fullName: z.string().min(2, 'Nome completo deve ter ao menos 2 caracteres.').optional(),
  userId: z.string().uuid().nullable().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email('E-mail inválido.').optional().or(z.literal('')),
  birthDate: z.string().datetime().optional().or(z.literal('')),
  address: z.string().optional(),
  joinDate: z.string().datetime().optional().or(z.literal('')),
  // Data de saída/desligamento: vazia para quem está ativo. '' ou null limpa o campo.
  exitDate: z.string().datetime().optional().or(z.literal('')).or(z.null()),
  status: z.enum(MEMBER_STATUSES).optional(),
  ministry: z.string().optional(),
  groupName: z.string().optional(),
  notes: z.string().optional(),
  photoUrl: z.string().max(2000).url('Link da foto inválido.').optional().or(z.literal('')),
  responsibleId: z.string().uuid().optional(),
});

export const createMemberSchema = memberFields.superRefine((data, ctx) => {
  if (!data.fullName && !data.userId) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['fullName'], message: 'Nome completo ou conta de usuário é obrigatório.' });
});

export const updateMemberSchema = memberFields.partial();
