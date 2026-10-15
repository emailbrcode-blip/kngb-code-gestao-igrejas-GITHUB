import { Router } from 'express';
import { validateCard } from './cards.service.js';

// Validação PÚBLICA do QR Code: sem login e SEM acesso ao cadastro — devolve só o
// mínimo (nome, RMA, categoria, situação, emissão). O identificador é um UUID aleatório.
export const cardsPublicRouter = Router();

// Limite simples por IP (60 consultas/min) contra varredura de códigos.
const hits = new Map();
setInterval(() => hits.clear(), 60 * 1000).unref();
cardsPublicRouter.use((req, res, next) => {
  const n = (hits.get(req.ip) || 0) + 1;
  hits.set(req.ip, n);
  if (n > 60) return res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Muitas consultas. Tente novamente em instantes.' } });
  return next();
});

cardsPublicRouter.get('/:code', async (req, res, next) => {
  try {
    res.set('Cache-Control', 'no-store');
    res.json({ card: await validateCard(req.params.code) });
  } catch (err) { next(err); }
});
