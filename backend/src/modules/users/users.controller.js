import { createUserSchema, updateUserSchema } from './users.validation.js';
import * as usersService from './users.service.js';
import { AppError } from '../../utils/AppError.js';

export async function listUsersController(req, res, next) {
  try {
    const status = ['active', 'inactive', 'archived'].includes(req.query.status) ? req.query.status : undefined;
    const users = await usersService.listUsers(req.user.churchId, status);
    res.status(200).json({ users });
  } catch (err) {
    next(err);
  }
}

export async function archiveUserController(req, res, next) {
  try { res.json({ user: await usersService.archiveUser(req.params.id, req.user, req.ip) }); } catch (err) { next(err); }
}

export async function getUserController(req, res, next) {
  try {
    const user = await usersService.getUserById(req.params.id, req.user.churchId);
    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
}

export async function createUserController(req, res, next) {
  try {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0].message, 422, 'VALIDATION_ERROR');
    }

    const user = await usersService.createUser(parsed.data, req.user, req.ip);
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
}

export async function updateUserController(req, res, next) {
  try {
    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0].message, 422, 'VALIDATION_ERROR');
    }

    const user = await usersService.updateUser(req.params.id, parsed.data, req.user, req.ip);
    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
}

export async function deactivateUserController(req, res, next) {
  try {
    const user = await usersService.deactivateUser(req.params.id, req.user, req.ip);
    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
}

export async function deleteUserController(req, res, next) {
  try {
    await usersService.deleteUserPermanently(req.params.id, req.user, req.ip);
    res.status(204).send();
  } catch (err) { next(err); }
}
