import { prisma } from '../../config/database.js';
import { AppError } from '../../utils/AppError.js';
import { registerAudit } from '../../utils/audit.js';

function slugify(text) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

const entryInclude = { category: { select: { id: true, name: true, slug: true, type: true } } };

// --- Categorias ---

export async function listCategories(churchId) {
  return prisma.financialCategory.findMany({
    where: { OR: [{ churchId: null }, { churchId }] },
    orderBy: { name: 'asc' },
  });
}

export async function createCategory({ name, type }, actor, ipAddress) {
  const slug = slugify(name);
  const existing = await prisma.financialCategory.findUnique({ where: { slug } });
  if (existing) throw new AppError('Já existe uma categoria com esse nome.', 409, 'CATEGORY_EXISTS');

  const category = await prisma.financialCategory.create({
    data: { name, slug, type, churchId: actor.churchId },
  });

  await registerAudit({
    userId: actor.id,
    churchId: actor.churchId,
    action: 'financial_category.created',
    module: 'finance',
    targetId: category.id,
    metadata: { name, type },
    ipAddress,
  });

  return category;
}

// Só aceita: categoria global (churchId null) OU categoria da própria
// igreja do usuário — nunca categoria customizada de outra igreja.
async function resolveCategoryId(categorySlug, churchId) {
  if (!categorySlug) return null;
  const category = await prisma.financialCategory.findFirst({
    where: { slug: categorySlug, OR: [{ churchId: null }, { churchId }] },
  });
  if (!category) throw new AppError('Categoria informada não existe ou não pertence à sua igreja.', 422, 'INVALID_CATEGORY');
  return category.id;
}

// --- Lançamentos ---

export async function listEntries(churchId, { type, from, to } = {}) {
  const where = { churchId };
  if (type) where.type = type;
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = new Date(from);
    if (to) where.date.lte = new Date(to);
  }

  return prisma.financialEntry.findMany({ where, include: entryInclude, orderBy: { date: 'desc' } });
}

export async function getSummary(churchId, { from, to } = {}) {
  const where = { churchId };
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = new Date(from);
    if (to) where.date.lte = new Date(to);
  }

  const [incomeAgg, expenseAgg, pendingCount] = await Promise.all([
    prisma.financialEntry.aggregate({ where: { ...where, type: 'income' }, _sum: { amount: true } }),
    prisma.financialEntry.aggregate({ where: { ...where, type: 'expense' }, _sum: { amount: true } }),
    prisma.financialEntry.count({ where: { churchId, type: 'expense', status: 'pending' } }),
  ]);

  const income = Number(incomeAgg._sum.amount || 0);
  const expense = Number(expenseAgg._sum.amount || 0);

  return { income, expense, balance: income - expense, pendingExpenses: pendingCount };
}

export async function createEntry(data, actor, ipAddress) {
  const { categorySlug, dueDate, ...rest } = data;
  const categoryId = await resolveCategoryId(categorySlug, actor.churchId);

  const entry = await prisma.financialEntry.create({
    data: {
      ...rest,
      categoryId,
      churchId: actor.churchId,
      date: new Date(rest.date),
      dueDate: dueDate ? new Date(dueDate) : null,
    },
    include: entryInclude,
  });

  await registerAudit({
    userId: actor.id,
    churchId: actor.churchId,
    action: 'financial_entry.created',
    module: 'finance',
    targetId: entry.id,
    metadata: { type: entry.type, amount: rest.amount, description: rest.description },
    ipAddress,
  });

  return entry;
}

export async function updateEntry(id, data, actor, ipAddress) {
  const existing = await prisma.financialEntry.findFirst({ where: { id, churchId: actor.churchId } });
  if (!existing) throw new AppError('Lançamento não encontrado.', 404, 'NOT_FOUND');

  const { categorySlug, dueDate, ...rest } = data;
  const payload = { ...rest };
  if (categorySlug !== undefined) payload.categoryId = await resolveCategoryId(categorySlug, actor.churchId);
  if (rest.date) payload.date = new Date(rest.date);
  if (dueDate !== undefined) payload.dueDate = dueDate ? new Date(dueDate) : null;

  const updated = await prisma.financialEntry.update({ where: { id }, data: payload, include: entryInclude });

  await registerAudit({
    userId: actor.id,
    churchId: actor.churchId,
    action: 'financial_entry.updated',
    module: 'finance',
    targetId: id,
    metadata: data,
    ipAddress,
  });

  return updated;
}

export async function deleteEntry(id, actor, ipAddress) {
  const existing = await prisma.financialEntry.findFirst({ where: { id, churchId: actor.churchId } });
  if (!existing) throw new AppError('Lançamento não encontrado.', 404, 'NOT_FOUND');
  const transfer = await prisma.campaignFinanceTransfer.findUnique({ where: { financialEntryId: id }, select: { id: true } });
  if (transfer) throw new AppError('Este lançamento é um repasse vinculado a uma campanha e não pode ser excluído isoladamente, para preservar o histórico financeiro.', 409, 'CAMPAIGN_TRANSFER_LINKED');

  await prisma.financialEntry.delete({ where: { id } });

  await registerAudit({
    userId: actor.id,
    churchId: actor.churchId,
    action: 'financial_entry.deleted',
    module: 'finance',
    targetId: id,
    ipAddress,
  });
}
