import { createMemberSchema, updateMemberSchema } from './members.validation.js';
import * as membersService from './members.service.js';
import { AppError } from '../../utils/AppError.js';

export async function listMembersController(req, res, next) {
  try {
    const members = await membersService.listMembers(req.user.churchId);
    res.status(200).json({ members });
  } catch (err) {
    next(err);
  }
}

export async function listLinkableUsersController(req, res, next) {
  try { res.status(200).json({ users: await membersService.listLinkableUsers(req.user.churchId) }); }
  catch (err) { next(err); }
}

export async function getMemberController(req, res, next) {
  try {
    const member = await membersService.getMemberById(req.params.id, req.user.churchId);
    res.status(200).json({ member });
  } catch (err) {
    next(err);
  }
}

export async function createMemberController(req, res, next) {
  try {
    const parsed = createMemberSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0].message, 422, 'VALIDATION_ERROR');
    }
    const member = await membersService.createMember(parsed.data, req.user, req.ip);
    res.status(201).json({ member });
  } catch (err) {
    next(err);
  }
}

export async function updateMemberController(req, res, next) {
  try {
    const parsed = updateMemberSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0].message, 422, 'VALIDATION_ERROR');
    }
    const member = await membersService.updateMember(req.params.id, parsed.data, req.user, req.ip);
    res.status(200).json({ member });
  } catch (err) {
    next(err);
  }
}

export async function deactivateMemberController(req, res, next) {
  try {
    const member = await membersService.deactivateMember(req.params.id, req.user, req.ip);
    res.status(200).json({ member });
  } catch (err) {
    next(err);
  }
}

export async function deleteMemberController(req, res, next) {
  try { await membersService.deleteMemberPermanently(req.params.id, req.user, req.ip); res.status(204).send(); }
  catch (err) { next(err); }
}
