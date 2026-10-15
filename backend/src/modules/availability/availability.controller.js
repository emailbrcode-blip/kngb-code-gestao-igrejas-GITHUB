import { setAvailabilitySchema, availabilityExceptionSchema } from './availability.validation.js';
import * as availabilityService from './availability.service.js';
import { AppError } from '../../utils/AppError.js';

// --- Uso administrativo: ver/definir a disponibilidade de qualquer obreiro ---

export async function getWorkerAvailabilityController(req, res, next) {
  try {
    const availability = await availabilityService.getAvailabilityByWorker(
      req.params.workerId,
      req.user.churchId
    );
    res.status(200).json({ availability });
  } catch (err) {
    next(err);
  }
}

export async function getAvailabilityOverviewController(req, res, next) {
  try {
    const { date, startTime, endTime } = req.query;
    if (!date || Number.isNaN(Date.parse(date))) throw new AppError('Informe uma data válida.', 422, 'VALIDATION_ERROR');
    if ((startTime && !/^\d{2}:\d{2}$/.test(startTime)) || (endTime && !/^\d{2}:\d{2}$/.test(endTime))) {
      throw new AppError('Informe horários válidos.', 422, 'VALIDATION_ERROR');
    }
    const availability = await availabilityService.getAvailabilityOverview({ date, startTime, endTime }, req.user.churchId);
    res.status(200).json({ availability });
  } catch (err) { next(err); }
}

export async function setWorkerAvailabilityController(req, res, next) {
  try {
    const parsed = setAvailabilitySchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 422, 'VALIDATION_ERROR');

    const availability = await availabilityService.setAvailabilityForWorker(
      req.params.workerId,
      parsed.data.entries,
      req.user,
      req.ip
    );
    res.status(200).json({ availability });
  } catch (err) {
    next(err);
  }
}

// --- Uso pelo próprio obreiro: "minha disponibilidade" ---

export async function getMyAvailabilityController(req, res, next) {
  try {
    const worker = await availabilityService.getMyWorkerProfile(req.user);
    const availability = await availabilityService.getAvailabilityByWorker(worker.id, req.user.churchId);
    res.status(200).json({ availability });
  } catch (err) {
    next(err);
  }
}

export async function setMyAvailabilityController(req, res, next) {
  try {
    const parsed = setAvailabilitySchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 422, 'VALIDATION_ERROR');

    const worker = await availabilityService.getMyWorkerProfile(req.user);
    const availability = await availabilityService.setAvailabilityForWorker(
      worker.id,
      parsed.data.entries,
      req.user,
      req.ip
    );
    res.status(200).json({ availability });
  } catch (err) {
    next(err);
  }
}

export async function listMyExceptionsController(req, res, next) {
  try { const worker = await availabilityService.getMyWorkerProfile(req.user); res.json({ exceptions: await availabilityService.listAvailabilityExceptions(worker.id, req.user.churchId) }); } catch (err) { next(err); }
}
export async function createMyExceptionController(req, res, next) {
  try { const parsed = availabilityExceptionSchema.safeParse(req.body); if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 422, 'VALIDATION_ERROR'); const worker = await availabilityService.getMyWorkerProfile(req.user); const exception = await availabilityService.createAvailabilityException(worker.id, parsed.data, req.user, req.ip); res.status(201).json({ exception }); } catch (err) { next(err); }
}
export async function deactivateMyExceptionController(req, res, next) {
  try { const worker = await availabilityService.getMyWorkerProfile(req.user); const exception = await availabilityService.deactivateAvailabilityException(req.params.exceptionId, worker.id, req.user, req.ip); res.json({ exception }); } catch (err) { next(err); }
}
export async function listWorkerExceptionsController(req, res, next) {
  try { res.json({ exceptions: await availabilityService.listAvailabilityExceptions(req.params.workerId, req.user.churchId) }); } catch (err) { next(err); }
}
export async function createWorkerExceptionController(req, res, next) {
  try { const parsed = availabilityExceptionSchema.safeParse(req.body); if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 422, 'VALIDATION_ERROR'); const exception = await availabilityService.createAvailabilityException(req.params.workerId, parsed.data, req.user, req.ip); res.status(201).json({ exception }); } catch (err) { next(err); }
}
export async function deactivateWorkerExceptionController(req, res, next) {
  try { const exception = await availabilityService.deactivateAvailabilityException(req.params.exceptionId, req.params.workerId, req.user, req.ip); res.json({ exception }); } catch (err) { next(err); }
}
