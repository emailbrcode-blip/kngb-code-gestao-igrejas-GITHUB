import { z } from 'zod';
import { isValidISODate, daysInclusive } from './finance.period.js';
import { REPORT_TYPES } from './finance.report.service.js';

const isoDate = z.string().refine(isValidISODate, 'Data inválida (use AAAA-MM-DD).');
const MAX_DAYS = 3660; // ~10 anos

const periodShape = {
  from: isoDate,
  to: isoDate,
  compare: z.enum(['previous', 'year']).optional(),
  granularity: z.enum(['auto', 'day', 'week', 'month', 'semester', 'year']).optional(),
};
const checkRange = (v, ctx) => {
  if (v.from > v.to) ctx.addIssue({ code: 'custom', message: 'A data inicial não pode ser maior que a data final.', path: ['from'] });
  else if (daysInclusive(v.from, v.to) > MAX_DAYS) ctx.addIssue({ code: 'custom', message: 'Período muito longo (máximo de 10 anos).', path: ['to'] });
};

export const dashboardQuerySchema = z.object(periodShape).strict().superRefine(checkRange);
export const trendQuerySchema = z.object({ from: isoDate, to: isoDate }).strict().superRefine(checkRange);

export const movementsQuerySchema = z.object({
  from: isoDate, to: isoDate,
  page: z.coerce.number().int().min(1).max(100000).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  sort: z.enum(['date', 'amount', 'category', 'type', 'description', 'status']).optional(),
  dir: z.enum(['asc', 'desc']).optional(),
  search: z.string().max(100).optional(),
  type: z.enum(['all', 'income', 'expense']).optional(),
  status: z.enum(['paid', 'pending', 'all']).optional(),
  categoryId: z.string().max(64).optional(),
}).strict().superRefine(checkRange);

export const reportQuerySchema = z.object({
  type: z.enum(Object.keys(REPORT_TYPES)),
  from: isoDate, to: isoDate,
  categorySlug: z.string().max(80).regex(/^[a-z0-9_]*$/).optional(),
  compare: z.enum(['true', 'false']).optional(),
  compareMode: z.enum(['previous', 'year']).optional(),
}).strict().superRefine(checkRange);
