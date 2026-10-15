import { loginSchema, refreshSchema } from './auth.validation.js';
import * as authService from './auth.service.js';
import { AppError } from '../../utils/AppError.js';

export async function loginController(req, res, next) {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0].message, 422, 'VALIDATION_ERROR');
    }

    const result = await authService.login({
      ...parsed.data,
      ipAddress: req.ip,
    });

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function refreshController(req, res, next) {
  try {
    const parsed = refreshSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0].message, 422, 'VALIDATION_ERROR');
    }

    const result = await authService.refresh({
      ...parsed.data,
      ipAddress: req.ip,
    });

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function logoutController(req, res, next) {
  try {
    await authService.logout({
      refreshToken: req.body?.refreshToken,
      userId: req.user?.id,
      churchId: req.user?.churchId,
      ipAddress: req.ip,
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function meController(req, res) {
  // req.user já foi carregado pelo middleware authenticate
  res.status(200).json({ user: req.user });
}
