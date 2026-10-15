import {
  createWorkerSchema,
  updateWorkerSchema,
  createFunctionSchema,
} from './workers.validation.js';
import * as workersService from './workers.service.js';
import { AppError } from '../../utils/AppError.js';

export async function listWorkersController(req, res, next) {
  try {
    const status = ['active', 'inactive', 'archived'].includes(req.query.status) ? req.query.status : undefined;
    const workers = await workersService.listWorkers(req.user.churchId, status);
    res.status(200).json({ workers });
  } catch (err) {
    next(err);
  }
}

export async function listLinkableUsersController(req, res, next) {
  try { res.status(200).json({ users: await workersService.listLinkableUsers(req.user.churchId) }); }
  catch (err) { next(err); }
}

export async function archiveWorkerController(req, res, next) {
  try { res.json({ worker: await workersService.archiveWorker(req.params.id, req.user, req.ip) }); } catch (err) { next(err); }
}

export async function getWorkerController(req, res, next) {
  try {
    const worker = await workersService.getWorkerById(req.params.id, req.user.churchId);
    res.status(200).json({ worker });
  } catch (err) {
    next(err);
  }
}

export async function createWorkerController(req, res, next) {
  try {
    const parsed = createWorkerSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 422, 'VALIDATION_ERROR');
    const worker = await workersService.createWorker(parsed.data, req.user, req.ip);
    res.status(201).json({ worker });
  } catch (err) {
    next(err);
  }
}

export async function updateWorkerController(req, res, next) {
  try {
    const parsed = updateWorkerSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 422, 'VALIDATION_ERROR');
    const worker = await workersService.updateWorker(req.params.id, parsed.data, req.user, req.ip);
    res.status(200).json({ worker });
  } catch (err) {
    next(err);
  }
}

export async function deactivateWorkerController(req, res, next) {
  try {
    const worker = await workersService.deactivateWorker(req.params.id, req.user, req.ip);
    res.status(200).json({ worker });
  } catch (err) {
    next(err);
  }
}

export async function deleteWorkerController(req, res, next) {
  try { await workersService.deleteWorkerPermanently(req.params.id, req.user, req.ip); res.status(204).send(); }
  catch (err) { next(err); }
}

export async function listFunctionsController(req, res, next) {
  try {
    const functions = await workersService.listFunctions(req.user.churchId);
    res.status(200).json({ functions });
  } catch (err) {
    next(err);
  }
}

export async function createFunctionController(req, res, next) {
  try {
    const parsed = createFunctionSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 422, 'VALIDATION_ERROR');
    const workerFunction = await workersService.createFunction(parsed.data, req.user, req.ip);
    res.status(201).json({ function: workerFunction });
  } catch (err) {
    next(err);
  }
}

export async function deleteFunctionController(req, res, next) {
  try {
    await workersService.deleteFunction(req.params.id, req.user, req.ip);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
