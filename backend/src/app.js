import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { env } from './config/env.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { usersRouter } from './modules/users/users.routes.js';
import { rolesRouter } from './modules/roles/roles.routes.js';
import { permissionsRouter } from './modules/permissions/permissions.routes.js';
import { auditRouter } from './modules/audit/audit.routes.js';
import { membersRouter } from './modules/members/members.routes.js';
import { workersRouter } from './modules/workers/workers.routes.js';
import { availabilityRouter } from './modules/availability/availability.routes.js';
import { schedulesRouter } from './modules/schedules/schedules.routes.js';
import { notificationsRouter } from './modules/notifications/notifications.routes.js';
import { eventsRouter } from './modules/events/events.routes.js';
import { announcementsRouter } from './modules/announcements/announcements.routes.js';
import { financeRouter } from './modules/finance/finance.routes.js';
import { dashboardRouter } from './modules/dashboard/dashboard.routes.js';
import { ecclesiasticalRolesRouter } from './modules/ecclesiastical-roles/ecclesiasticalRoles.routes.js';
import { memberEcclesiasticalRolesRouter } from './modules/ecclesiastical-roles/memberEcclesiasticalRoles.routes.js';
import { worshipsRouter } from './modules/worships/worships.routes.js';
import { donationsRouter } from './modules/donations/donations.routes.js';
import { reportsRouter } from './modules/reports/reports.routes.js';
import { pdfRouter } from './modules/pdf/pdf.routes.js';
import { publicSiteRouter } from './modules/public-site/public-site.routes.js';
import { cardsPublicRouter } from './modules/cards/cards.public.routes.js';
import { searchRouter } from './modules/search/search.routes.js';
import { sendAutomaticDonationReminders } from './modules/donations/donations.service.js';
import { visitorsRouter } from './modules/visitors/visitors.routes.js';

const app = express();

// Segurança básica de headers HTTP
app.use(helmet());

// CORS restrito à(s) origem(ns) configurada(s) — nunca aberto ('*') em
// produção. Se a origem não bater com nenhuma da lista, o pedido é
// recusado pelo próprio cors(), antes de qualquer rota.
app.use(cors({
  origin(origin, callback) {
    // Requisições sem "Origin" (ex: curl, health check de infra) são
    // permitidas — só bloqueamos origens de navegador não autorizadas.
    if (!origin || env.frontendUrls.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Origem não autorizada pelo CORS.'));
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '2mb' }));
app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'));

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/auth', authRouter);
app.use('/users', usersRouter);
app.use('/roles', rolesRouter);
app.use('/permissions', permissionsRouter);
app.use('/audit', auditRouter);
app.use('/members', membersRouter);
app.use('/workers', workersRouter);
app.use('/availability', availabilityRouter);
app.use('/schedules', schedulesRouter);
app.use('/notifications', notificationsRouter);
app.use('/events', eventsRouter);
app.use('/announcements', announcementsRouter);
app.use('/finance', financeRouter);
app.use('/dashboard', dashboardRouter);
app.use('/ecclesiastical-roles', ecclesiasticalRolesRouter);
app.use('/members', memberEcclesiasticalRolesRouter);
app.use('/worships', worshipsRouter);
app.use('/donations', donationsRouter);
app.use('/visitors', visitorsRouter);
app.use('/reports', reportsRouter);
app.use('/pdf', pdfRouter);
app.use('/public/cards', cardsPublicRouter); // validação do QR da carteirinha (pública, mínima)
app.use('/public', publicSiteRouter);
app.use('/search', searchRouter);

// Rota não encontrada
app.use((req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Rota não encontrada.' } });
});

// Tratamento centralizado de erros — deve ser o último middleware
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`Servidor BrCode >_ rodando na porta ${env.port} (${env.nodeEnv})`);
  const reminderTimer = setInterval(() => sendAutomaticDonationReminders().catch((error) => console.error('Falha no lembrete automático de doações:', error.message)), 60 * 60 * 1000);
  reminderTimer.unref();
});
