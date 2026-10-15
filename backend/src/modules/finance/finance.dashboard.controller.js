import { AppError } from '../../utils/AppError.js';
import { registerAudit } from '../../utils/audit.js';
import { getDashboard, getTrend, listMovements } from './finance.dashboard.service.js';
import { buildReport } from './finance.report.service.js';
import { renderReportPdf } from '../pdf/pdf.kit.js';
import { dashboardQuerySchema, trendQuerySchema, movementsQuerySchema, reportQuerySchema } from './finance.dashboard.validation.js';

function parse(schema, query) {
  const parsed = schema.safeParse(query);
  if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 422, 'VALIDATION_ERROR');
  return parsed.data;
}

export async function dashboardController(req, res, next) {
  try { res.json(await getDashboard(req.user.churchId, parse(dashboardQuerySchema, req.query))); } catch (err) { next(err); }
}
export async function trendController(req, res, next) {
  try { res.json(await getTrend(req.user.churchId, parse(trendQuerySchema, req.query))); } catch (err) { next(err); }
}
export async function movementsController(req, res, next) {
  try { res.json(await listMovements(req.user.churchId, parse(movementsQuerySchema, req.query))); } catch (err) { next(err); }
}

function reportOptions(q) {
  return { type: q.type, from: q.from, to: q.to, categorySlug: q.categorySlug || '', compare: q.compare === 'true', compareMode: q.compareMode || 'previous' };
}

// Pré-visualização (JSON): mesmo modelo que alimenta o PDF.
export async function reportPreviewController(req, res, next) {
  try { res.json({ report: await buildReport(req.user.churchId, reportOptions(parse(reportQuerySchema, req.query))) }); } catch (err) { next(err); }
}

export async function reportPdfController(req, res, next) {
  try {
    const q = parse(reportQuerySchema, req.query);
    const report = await buildReport(req.user.churchId, reportOptions(q));
    await registerAudit({ userId: req.user.id, churchId: req.user.churchId, action: 'finance.report.pdf', module: 'finance', metadata: { type: q.type, from: q.from, to: q.to }, ipAddress: req.ip });
    renderReportPdf(report, res, `financeiro-${q.type}-${q.from}_${q.to}.pdf`);
  } catch (err) { next(err); }
}
