import { env } from '../../config/env.js';
import { prepareCard } from './cards.service.js';
import { renderCardPdf } from './card.pdf.js';

// Endereço público da página de validação (frontend). PUBLIC_APP_URL tem prioridade.
export function publicAppUrl() {
  return String(process.env.PUBLIC_APP_URL || env.frontendUrls[0] || '').replace(/\/+$/, '');
}

export function cardPdfHandler(kind) {
  return async (req, res, next) => {
    try {
      const actor = { id: req.user.id, churchId: req.user.churchId, ip: req.ip };
      const { subject, card, photo } = await prepareCard(kind, req.params.id, actor);
      // O PDF sai mesmo sem foto; o aviso segue em cabeçalhos para a tela exibir.
      res.setHeader('Access-Control-Expose-Headers', 'X-Photo-Status, X-Photo-Message');
      res.setHeader('X-Photo-Status', photo.status);
      res.setHeader('X-Photo-Message', encodeURIComponent(photo.message || ''));
      renderCardPdf({ subject, card, photo, verifyUrl: `${publicAppUrl()}/validar/${card.code}` }, res, `carteirinha-${subject.rma}.pdf`);
    } catch (err) { next(err); }
  };
}
