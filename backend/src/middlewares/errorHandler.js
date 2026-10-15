import { AppError } from '../utils/AppError.js';

export function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message },
    });
  }

  console.error('Erro não tratado:', err);
  return res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor.' },
  });
}
