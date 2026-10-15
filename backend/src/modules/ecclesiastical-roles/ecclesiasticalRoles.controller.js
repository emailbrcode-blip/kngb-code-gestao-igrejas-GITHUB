import {
  createEcclesiasticalRoleSchema,
  updateEcclesiasticalRoleSchema,
  assignEcclesiasticalRoleSchema,
} from './ecclesiasticalRoles.validation.js';
import * as service from './ecclesiasticalRoles.service.js';
import { AppError } from '../../utils/AppError.js';

export async function listController(req, res, next) {
  try {
    const roles = await service.listRoles(req.user.churchId);
    res.status(200).json({ roles });
  } catch (err) { next(err); }
}

export async function createController(req, res, next) {
  try {
    const parsed = createEcclesiasticalRoleSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 422, 'VALIDATION_ERROR');
    const role = await service.createRole(parsed.data, req.user, req.ip);
    res.status(201).json({ role });
  } catch (err) { next(err); }
}

export async function setStatusController(req, res, next) {
  try {
    const parsed = updateEcclesiasticalRoleSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 422, 'VALIDATION_ERROR');
    const role = await service.setRoleStatus(req.params.id, parsed.data.status, req.user, req.ip);
    res.status(200).json({ role });
  } catch (err) { next(err); }
}

export async function deleteController(req, res, next) {
  try { await service.deleteRole(req.params.id, req.user, req.ip); res.status(204).send(); }
  catch (err) { next(err); }
}

// --- Histórico por membro ---

export async function getMemberHistoryController(req, res, next) {
  try {
    const history = await service.getHistoryForMember(req.params.memberId, req.user.churchId);
    res.status(200).json({ history });
  } catch (err) { next(err); }
}

export async function assignToMemberController(req, res, next) {
  try {
    const parsed = assignEcclesiasticalRoleSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 422, 'VALIDATION_ERROR');
    const entry = await service.assignRoleToMember(req.params.memberId, parsed.data, req.user, req.ip);
    res.status(201).json({ entry });
  } catch (err) { next(err); }
}
