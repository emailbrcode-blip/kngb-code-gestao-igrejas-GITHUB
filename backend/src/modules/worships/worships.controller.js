import { createWorshipSchema, updateWorshipSchema, sermonSchema, songSchema } from './worships.validation.js';
import * as service from './worships.service.js';
import { AppError } from '../../utils/AppError.js';

export async function listController(req, res, next) {
  try { res.status(200).json({ worships: await service.listWorships(req.user.churchId) }); }
  catch (err) { next(err); }
}
export async function getController(req, res, next) {
  try { res.status(200).json({ worship: await service.getWorshipById(req.params.id, req.user.churchId) }); }
  catch (err) { next(err); }
}
export async function createController(req, res, next) {
  try {
    const parsed = createWorshipSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 422, 'VALIDATION_ERROR');
    const worship = await service.createWorship(parsed.data, req.user, req.ip);
    res.status(201).json({ worship });
  } catch (err) { next(err); }
}
export async function updateController(req, res, next) {
  try {
    const parsed = updateWorshipSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 422, 'VALIDATION_ERROR');
    const worship = await service.updateWorship(req.params.id, parsed.data, req.user, req.ip);
    res.status(200).json({ worship });
  } catch (err) { next(err); }
}
export async function deleteController(req, res, next) {
  try { await service.deleteWorship(req.params.id, req.user, req.ip); res.status(204).send(); }
  catch (err) { next(err); }
}

export async function saveSermonController(req, res, next) {
  try {
    const parsed = sermonSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 422, 'VALIDATION_ERROR');
    const sermon = await service.upsertSermon(req.params.id, parsed.data, req.user, req.ip);
    res.status(200).json({ sermon });
  } catch (err) { next(err); }
}

export async function addSongController(req, res, next) {
  try {
    const parsed = songSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 422, 'VALIDATION_ERROR');
    const song = await service.addSong(req.params.id, parsed.data, req.user, req.ip);
    res.status(201).json({ song });
  } catch (err) { next(err); }
}
export async function removeSongController(req, res, next) {
  try { await service.removeSong(req.params.id, req.params.songId, req.user, req.ip); res.status(204).send(); }
  catch (err) { next(err); }
}

export async function listSermonsController(req, res, next) {
  try {
    const { preacher, theme, from, to } = req.query;
    res.status(200).json({ sermons: await service.listSermons(req.user.churchId, { preacher, theme, from, to }) });
  } catch (err) { next(err); }
}
export async function teamByFunctionController(req, res, next) {
  try {
    const { from, to } = req.query;
    res.status(200).json(await service.listTeamByFunction(req.user.churchId, req.params.functionSlug, { from, to }));
  } catch (err) { next(err); }
}
