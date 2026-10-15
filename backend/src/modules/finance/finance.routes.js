import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import {
  listCategoriesController,
  createCategoryController,
  listEntriesController,
  summaryController,
  createEntryController,
  updateEntryController,
  deleteEntryController,
} from './finance.controller.js';
import {
  dashboardController, trendController, movementsController, reportPreviewController, reportPdfController,
} from './finance.dashboard.controller.js';

export const financeRouter = Router();

financeRouter.use(authenticate);

financeRouter.get('/categories', authorize('finance.view'), listCategoriesController);
financeRouter.post('/categories', authorize('finance.manage_categories'), createCategoryController);

financeRouter.get('/summary', authorize('finance.view'), summaryController);
financeRouter.get('/entries', authorize('finance.view'), listEntriesController);
financeRouter.post('/entries', authorize('finance.create'), createEntryController);
financeRouter.patch('/entries/:id', authorize('finance.edit'), updateEntryController);
financeRouter.delete('/entries/:id', authorize('finance.delete'), deleteEntryController);

// --- Dashboard Financeiro (somente leitura; mesma permissão do módulo) ---
financeRouter.get('/dashboard', authorize('finance.view'), dashboardController);
financeRouter.get('/dashboard/trend', authorize('finance.view'), trendController);
financeRouter.get('/dashboard/movements', authorize('finance.view'), movementsController);
financeRouter.get('/dashboard/report', authorize('finance.view'), reportPreviewController);
financeRouter.get('/dashboard/report/pdf', authorize('finance.view'), reportPdfController);
