import { createSchema, updateSchema } from './greetings.validation.js';
import * as service from './greetings.service.js';
import { AppError } from '../../utils/AppError.js';

export async function listController(req, res, next) {
  try { res.status(200).json({ greetings: await service.listGreetings(req.user.churchId, req.query.worshipId) }); } catch (err) { next(err); }
}
export async function createController(req, res, next) {
  try { const parsed = createSchema.safeParse(req.body); if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 422, 'VALIDATION_ERROR'); const greeting = await service.createGreeting(parsed.data, req.user, req.ip); res.status(201).json({ greeting: greeting }); } catch (err) { next(err); }
}
export async function updateController(req, res, next) {
  try { const parsed = updateSchema.safeParse(req.body); if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 422, 'VALIDATION_ERROR'); const greeting = await service.updateGreeting(req.params.id, parsed.data, req.user, req.ip); res.status(200).json({ greeting: greeting }); } catch (err) { next(err); }
}
export async function deleteController(req, res, next) {
  try { await service.deleteGreeting(req.params.id, req.user, req.ip); res.status(204).send(); } catch (err) { next(err); }
}
