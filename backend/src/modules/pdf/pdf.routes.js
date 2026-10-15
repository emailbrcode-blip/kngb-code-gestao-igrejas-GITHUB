import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { prisma } from '../../config/database.js';
import { AppError } from '../../utils/AppError.js';
import { buildPdfReport, drawTable } from './pdf.utils.js';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { cardPdfHandler } from '../cards/cards.controller.js';
import { renderReportPdf } from './pdf.kit.js';
import {
  parseMembersFilters, fetchMembers, buildMembersReport, parseFinanceFilters, fetchFinance, buildFinanceReport,
  parseWorkerFilters, fetchWorkerParticipation, buildWorkerReport,
} from './pdf.reports.js';

export const pdfRouter = Router();
pdfRouter.use(authenticate);

async function getChurchName(churchId) {
  const church = await prisma.church.findUnique({ where: { id: churchId }, select: { name: true } });
  return church?.name || 'Igreja';
}

// PDF — Relatório de Membros (novo padrão visual; filtros: status, entrada, cargo, ministério, busca)
pdfRouter.get('/members', authorize('members.view'), async (req, res, next) => {
  try {
    const f = parseMembersFilters(req.query);
    const data = await fetchMembers(req.user.churchId, f);
    renderReportPdf({ ...buildMembersReport(data, f), churchName: await getChurchName(req.user.churchId) }, res, `relatorio-membros-${new Date().toISOString().slice(0, 10)}.pdf`);
  } catch (err) { next(err); }
});

// PDF — Participação dos obreiros nas escalas (individual com workerId, ou geral)
pdfRouter.get('/worker-participation', authorize('workers.view'), async (req, res, next) => {
  try {
    const f = parseWorkerFilters(req.query);
    const data = await fetchWorkerParticipation(req.user.churchId, f);
    renderReportPdf({ ...buildWorkerReport(data, f), churchName: await getChurchName(req.user.churchId) }, res, `participacao-obreiros-${new Date().toISOString().slice(0, 10)}.pdf`);
  } catch (err) { next(err); }
});

// Carteirinha digital (frente e verso, ID-1). Substitui o modelo antigo: mesma rota, novo gerador.
pdfRouter.get('/members/:id/card', authorize('members.view'), cardPdfHandler('member'));
pdfRouter.get('/workers/:id/card', authorize('workers.view'), cardPdfHandler('worker'));

pdfRouter.get('/members/:id', authorize('members.view'), async (req, res, next) => {
  try {
    const member = await prisma.member.findFirst({ where: { id: req.params.id, churchId: req.user.churchId }, include: { church: { select: { name: true } }, responsible: { select: { fullName: true } } } });
    if (!member) throw new AppError('Membro não encontrado.', 404, 'NOT_FOUND');
    buildPdfReport({ churchName: member.church.name, title: 'Ficha do Membro', periodLabel: member.fullName, renderContent: (doc) => {
      drawTable(doc, { columns: ['Campo', 'Informação'], rows: [
        ['Registro RMA', `RMA-${String(member.rmaNumber).padStart(6, '0')}`], ['Status', member.status], ['Telefone', member.phone], ['WhatsApp', member.whatsapp], ['E-mail', member.email],
        ['Nascimento', member.birthDate?.toLocaleDateString('pt-BR')], ['Endereço', member.address], ['Data de entrada', member.joinDate?.toLocaleDateString('pt-BR', { timeZone: 'UTC' })], ['Data de saída', member.exitDate?.toLocaleDateString('pt-BR', { timeZone: 'UTC' })],
        ['Ministério', member.ministry], ['Grupo', member.groupName], ['Responsável', member.responsible?.fullName], ['Observações', member.notes],
      ] });
    } }, res, `ficha-membro-${member.id}.pdf`);
  } catch (err) { next(err); }
});

// PDF — Escala de um culto específico
pdfRouter.get('/schedules/:id', authorize('schedule.view'), async (req, res, next) => {
  try {
    const schedule = await prisma.schedule.findFirst({
      where: { id: req.params.id, churchId: req.user.churchId },
      include: {
        assignments: {
          include: { worker: { select: { name: true } }, function: { select: { name: true } } },
        },
      },
    });
    if (!schedule) throw new AppError('Escala não encontrada.', 404, 'NOT_FOUND');

    const churchName = await getChurchName(req.user.churchId);

    buildPdfReport({
      churchName,
      title: schedule.title,
      periodLabel: `${new Date(schedule.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}${schedule.startTime ? ` às ${schedule.startTime}` : ''}`,
      renderContent: (doc) => {
        drawTable(doc, {
          columns: ['Obreiro', 'Função', 'Status'],
          rows: schedule.assignments.map((a) => [a.worker.name, a.function?.name || '—', a.status]),
        });
      },
    }, res, `escala-${schedule.id}.pdf`);
  } catch (err) { next(err); }
});

// PDF — Relatório Financeiro (novo padrão visual; filtros: mês, intervalo, tipo, situação, categoria)
pdfRouter.get('/financial', authorize('finance.view'), async (req, res, next) => {
  try {
    const f = parseFinanceFilters(req.query);
    const data = await fetchFinance(req.user.churchId, f);
    renderReportPdf({ ...buildFinanceReport(data, f), churchName: await getChurchName(req.user.churchId) }, res, `relatorio-financeiro-${f.from || 'inicio'}_${f.to || 'hoje'}.pdf`);
  } catch (err) { next(err); }
});
