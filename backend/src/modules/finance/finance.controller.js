import { createEntrySchema, updateEntrySchema, createCategorySchema } from './finance.validation.js';
import * as financeService from './finance.service.js';
import { AppError } from '../../utils/AppError.js';

export async function listCategoriesController(req, res, next) {
  try {
    const categories = await financeService.listCategories(req.user.churchId);
    res.status(200).json({ categories });
  } catch (err) {
    next(err);
  }
}

export async function createCategoryController(req, res, next) {
  try {
    const parsed = createCategorySchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 422, 'VALIDATION_ERROR');
    const category = await financeService.createCategory(parsed.data, req.user, req.ip);
    res.status(201).json({ category });
  } catch (err) {
    next(err);
  }
}

export async function listEntriesController(req, res, next) {
  try {
    const { type, from, to } = req.query;
    const entries = await financeService.listEntries(req.user.churchId, { type, from, to });
    res.status(200).json({ entries });
  } catch (err) {
    next(err);
  }
}

export async function summaryController(req, res, next) {
  try {
    const { from, to } = req.query;
    const summary = await financeService.getSummary(req.user.churchId, { from, to });
    res.status(200).json({ summary });
  } catch (err) {
    next(err);
  }
}

export async function createEntryController(req, res, next) {
  try {
    const parsed = createEntrySchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 422, 'VALIDATION_ERROR');
    const entry = await financeService.createEntry(parsed.data, req.user, req.ip);
    res.status(201).json({ entry });
  } catch (err) {
    next(err);
  }
}

export async function updateEntryController(req, res, next) {
  try {
    const parsed = updateEntrySchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 422, 'VALIDATION_ERROR');
    const entry = await financeService.updateEntry(req.params.id, parsed.data, req.user, req.ip);
    res.status(200).json({ entry });
  } catch (err) {
    next(err);
  }
}

export async function deleteEntryController(req, res, next) {
  try {
    await financeService.deleteEntry(req.params.id, req.user, req.ip);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
