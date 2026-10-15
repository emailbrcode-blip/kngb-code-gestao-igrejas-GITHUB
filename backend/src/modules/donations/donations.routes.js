import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize, authorizeAny } from '../../middlewares/authorize.js';
import {
  listCampaignsController, createCampaignController, updateCampaignController, deleteCampaignController,
  listDonationsController, listDonationDonorsController, createDonationController, updateDonationStatusController, deleteDonationController,
  listCampaignItemsController, createCampaignItemController, participateController, listMyDonationsController, remindDonationController, listCampaignExpensesController, createCampaignExpenseController, transferCampaignToFinanceController,
} from './donations.controller.js';

export const donationsRouter = Router();
donationsRouter.use(authenticate);

donationsRouter.get('/campaigns', authorizeAny('donations.view', 'donations.participate'), listCampaignsController);
donationsRouter.post('/campaigns', authorize('donations.manage'), createCampaignController);
donationsRouter.patch('/campaigns/:id', authorize('donations.manage'), updateCampaignController);
donationsRouter.delete('/campaigns/:id', authorize('donations.manage'), deleteCampaignController);
donationsRouter.get('/campaigns/:campaignId/items', authorizeAny('donations.view', 'donations.participate'), listCampaignItemsController);
donationsRouter.post('/campaigns/:campaignId/items', authorize('donations.manage'), createCampaignItemController);
donationsRouter.post('/participate', authorize('donations.participate'), participateController);
donationsRouter.get('/mine', authorize('donations.participate'), listMyDonationsController);

donationsRouter.get('/donors', authorizeAny('donations.create', 'donations.manage'), listDonationDonorsController);
donationsRouter.get('/', authorize('donations.view'), listDonationsController);
donationsRouter.post('/', authorize('donations.create'), createDonationController);
donationsRouter.patch('/:id/status', authorize('donations.manage'), updateDonationStatusController);
donationsRouter.delete('/:id', authorize('donations.manage'), deleteDonationController);
donationsRouter.post('/:id/remind', authorize('donations.reminders.send'), remindDonationController);
donationsRouter.get('/campaigns/:campaignId/expenses', authorize('donations.view'), listCampaignExpensesController);
donationsRouter.post('/campaigns/:campaignId/expenses', authorize('donations.expenses.manage'), createCampaignExpenseController);
donationsRouter.post('/campaigns/:campaignId/finance-transfer', authorize('donations.finance_post', 'finance.create'), transferCampaignToFinanceController);
