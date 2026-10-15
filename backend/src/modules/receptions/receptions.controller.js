import { createSchema, updateSchema } from './receptions.validation.js';
import * as service from './receptions.service.js';
import { AppError } from '../../utils/AppError.js';

export async function listController(req, res, next) {
  try { res.status(200).json({ receptions: await service.listReceptions(req.user.churchId, req.query.worshipId) }); } catch (err) { next(err); }
}
export async function createController(req, res, next) {
  try { const parsed = createSchema.safeParse(req.body); if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 422, 'VALIDATION_ERROR'); const reception = await service.createReception(parsed.data, req.user, req.ip); res.status(201).json({ reception: reception }); } catch (err) { next(err); }
}
export async function updateController(req, res, next) {
  try { const parsed = updateSchema.safeParse(req.body); if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 422, 'VALIDATION_ERROR'); const reception = await service.updateReception(req.params.id, parsed.data, req.user, req.ip); res.status(200).json({ reception: reception }); } catch (err) { next(err); }
}
export async function deleteController(req, res, next) {
  try { await service.deleteReception(req.params.id, req.user, req.ip); res.status(204).send(); } catch (err) { next(err); }
}
