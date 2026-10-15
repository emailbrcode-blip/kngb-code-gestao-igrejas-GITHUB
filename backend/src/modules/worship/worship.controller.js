import {
  createWorshipSchema, updateWorshipSchema, sermonSchema, songSchema, assignmentSchema,
} from './worship.validation.js';
import * as service from './worship.service.js';
import { AppError } from '../../utils/AppError.js';

function parse(schema, body) {
  const result = schema.safeParse(body);
  if (!result.success) throw new AppError(result.error.issues[0].message, 422, 'VALIDATION_ERROR');
  return result.data;
}

export async function list(req, res, next) {
  try { res.json({ worships: await service.listWorships(req.user.churchId) }); } catch (e) { next(e); }
}
export async function get(req, res, next) {
  try { res.json({ worship: await service.getWorship(req.params.id, req.user.churchId) }); } catch (e) { next(e); }
}
export async function create(req, res, next) {
  try { res.status(201).json({ worship: await service.createWorship(parse(createWorshipSchema, req.body), req.user, req.ip) }); } catch (e) { next(e); }
}
export async function update(req, res, next) {
  try { res.json({ worship: await service.updateWorship(req.params.id, parse(updateWorshipSchema, req.body), req.user, req.ip) }); } catch (e) { next(e); }
}
export async function remove(req, res, next) {
  try { await service.deleteWorship(req.params.id, req.user, req.ip); res.status(204).send(); } catch (e) { next(e); }
}
export async function saveSermon(req, res, next) {
  try { res.status(200).json({ sermon: await service.upsertSermon(req.params.worshipId, parse(sermonSchema, req.body), req.user, req.ip) }); } catch (e) { next(e); }
}
export async function addSong(req, res, next) {
  try { res.status(201).json({ song: await service.addSong(req.params.worshipId, parse(songSchema, req.body), req.user, req.ip) }); } catch (e) { next(e); }
}
export async function removeSong(req, res, next) {
  try { await service.removeSong(req.params.id, req.user, req.ip); res.status(204).send(); } catch (e) { next(e); }
}
export async function assignReception(req, res, next) {
  try { res.status(201).json({ reception: await service.assignReception(req.params.worshipId, parse(assignmentSchema, req.body), req.user, req.ip) }); } catch (e) { next(e); }
}
export async function removeReception(req, res, next) {
  try { await service.removeReception(req.params.id, req.user, req.ip); res.status(204).send(); } catch (e) { next(e); }
}
export async function assignGreeting(req, res, next) {
  try { res.status(201).json({ greeting: await service.assignGreeting(req.params.worshipId, parse(assignmentSchema, req.body), req.user, req.ip) }); } catch (e) { next(e); }
}
export async function removeGreeting(req, res, next) {
  try { await service.removeGreeting(req.params.id, req.user, req.ip); res.status(204).send(); } catch (e) { next(e); }
}
