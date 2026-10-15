import {
  createCampaignSchema, updateCampaignSchema, createDonationSchema, updateDonationStatusSchema, donationItemSchema, participateSchema, campaignExpenseSchema, campaignTransferSchema,
} from './donations.validation.js';
import * as service from './donations.service.js';
import { AppError } from '../../utils/AppError.js';

export async function listCampaignsController(req, res, next) {
  try { res.status(200).json({ campaigns: await service.listCampaigns(req.user.churchId, { participant: !req.user.permissions.includes('donations.view') }) }); }
  catch (err) { next(err); }
}
export async function createCampaignController(req, res, next) {
  try {
    const parsed = createCampaignSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 422, 'VALIDATION_ERROR');
    const campaign = await service.createCampaign(parsed.data, req.user, req.ip);
    res.status(201).json({ campaign });
  } catch (err) { next(err); }
}
export async function updateCampaignController(req, res, next) {
  try {
    const parsed = updateCampaignSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 422, 'VALIDATION_ERROR');
    const campaign = await service.updateCampaign(req.params.id, parsed.data, req.user, req.ip);
    res.status(200).json({ campaign });
  } catch (err) { next(err); }
}

export async function deleteCampaignController(req, res, next) {
  try { await service.deleteCampaign(req.params.id, req.user, req.ip); res.status(204).send(); }
  catch (err) { next(err); }
}

export async function listDonationsController(req, res, next) {
  try {
    const { campaignId, status } = req.query;
    res.status(200).json({ donations: await service.listDonations(req.user.churchId, { campaignId, status }) });
  } catch (err) { next(err); }
}
export async function listDonationDonorsController(req, res, next) {
  try { res.status(200).json({ users: await service.listDonationDonors(req.user.churchId) }); }
  catch (err) { next(err); }
}
export async function createDonationController(req, res, next) {
  try {
    const parsed = createDonationSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 422, 'VALIDATION_ERROR');
    const donation = await service.createDonation(parsed.data, req.user, req.ip);
    res.status(201).json({ donation });
  } catch (err) { next(err); }
}
export async function updateDonationStatusController(req, res, next) {
  try {
    const parsed = updateDonationStatusSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 422, 'VALIDATION_ERROR');
    const donation = await service.updateDonationStatus(req.params.id, parsed.data.status, req.user, req.ip, parsed.data);
    res.status(200).json({ donation });
  } catch (err) { next(err); }
}

export async function deleteDonationController(req, res, next) {
  try { await service.deleteDonation(req.params.id, req.user, req.ip); res.status(204).send(); }
  catch (err) { next(err); }
}

export async function listCampaignItemsController(req, res, next) {
  try { res.status(200).json({ items: await service.listCampaignItems(req.user.churchId, req.params.campaignId) }); }
  catch (err) { next(err); }
}
export async function createCampaignItemController(req, res, next) {
  try {
    const parsed = donationItemSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 422, 'VALIDATION_ERROR');
    res.status(201).json({ item: await service.createCampaignItem(req.params.campaignId, parsed.data, req.user, req.ip) });
  } catch (err) { next(err); }
}
export async function participateController(req, res, next) {
  try {
    const parsed = participateSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 422, 'VALIDATION_ERROR');
    res.status(201).json({ donation: await service.participateInCampaign(parsed.data, req.user, req.ip) });
  } catch (err) { next(err); }
}

export async function listMyDonationsController(req, res, next) {
  try { res.status(200).json({ donations: await service.listMyDonations(req.user.id, req.user.churchId) }); }
  catch (err) { next(err); }
}

export async function remindDonationController(req, res, next) {
  try { res.status(200).json(await service.sendDonationReminder(req.params.id, req.user, req.ip)); }
  catch (err) { next(err); }
}

export async function listCampaignExpensesController(req, res, next) {
  try { res.json({ expenses: await service.listCampaignExpenses(req.params.campaignId, req.user.churchId) }); } catch (err) { next(err); }
}
export async function createCampaignExpenseController(req, res, next) {
  try { const parsed = campaignExpenseSchema.safeParse(req.body); if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 422, 'VALIDATION_ERROR'); res.status(201).json({ expense: await service.createCampaignExpense(req.params.campaignId, parsed.data, req.user, req.ip) }); } catch (err) { next(err); }
}
export async function transferCampaignToFinanceController(req, res, next) {
  try { const parsed = campaignTransferSchema.safeParse(req.body); if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 422, 'VALIDATION_ERROR'); res.status(201).json(await service.transferCampaignToFinance(req.params.campaignId, parsed.data, req.user, req.ip)); } catch (err) { next(err); }
}
