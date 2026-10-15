-- Fase 3 aditiva: campanhas em bens/serviços, trilha de auditoria,
-- integração financeira explícita e estruturas de conteúdo/atendimento.
-- Reexecutável. Não remove tabelas, colunas, linhas ou permissões existentes.

ALTER TYPE "UserStatus" ADD VALUE IF NOT EXISTS 'archived';
ALTER TYPE "WorkerStatus" ADD VALUE IF NOT EXISTS 'archived';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'campaign';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'worship';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'ministry';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'volunteer';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'meeting';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'birthday';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'visitor';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'prayer_request';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'other';

ALTER TABLE churches ADD COLUMN IF NOT EXISTS public_history TEXT;
ALTER TABLE churches ADD COLUMN IF NOT EXISTS public_mission TEXT;
ALTER TABLE churches ADD COLUMN IF NOT EXISTS public_vision TEXT;
ALTER TABLE churches ADD COLUMN IF NOT EXISTS public_values TEXT;
ALTER TABLE churches ADD COLUMN IF NOT EXISTS public_whatsapp TEXT;
ALTER TABLE churches ADD COLUMN IF NOT EXISTS public_instagram TEXT;
ALTER TABLE churches ADD COLUMN IF NOT EXISTS public_facebook TEXT;
ALTER TABLE churches ADD COLUMN IF NOT EXISTS public_youtube TEXT;
ALTER TABLE churches ADD COLUMN IF NOT EXISTS public_pix_key TEXT;
ALTER TABLE churches ADD COLUMN IF NOT EXISTS public_pix_instructions TEXT;

ALTER TABLE donation_campaigns ADD COLUMN IF NOT EXISTS goal_quantity DECIMAL(12,3);
ALTER TABLE donation_campaigns ADD COLUMN IF NOT EXISTS quantity_unit TEXT;
ALTER TABLE donation_campaigns ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE donation_campaigns ADD COLUMN IF NOT EXISTS responsible_name TEXT;
ALTER TABLE donation_campaigns ADD COLUMN IF NOT EXISTS responsible_id TEXT;
ALTER TABLE donation_campaigns ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT TRUE;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'donation_campaigns_responsible_id_fkey') THEN
    ALTER TABLE donation_campaigns ADD CONSTRAINT donation_campaigns_responsible_id_fkey FOREIGN KEY (responsible_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE donation_items ADD COLUMN IF NOT EXISTS target_quantity DECIMAL(12,3);
ALTER TABLE donation_items ADD COLUMN IF NOT EXISTS unit TEXT;
ALTER TABLE donations ALTER COLUMN amount DROP NOT NULL;
ALTER TABLE donations ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'money';
ALTER TABLE donations ADD COLUMN IF NOT EXISTS quantity DECIMAL(12,3);
ALTER TABLE donations ADD COLUMN IF NOT EXISTS unit TEXT;
ALTER TABLE donations ADD COLUMN IF NOT EXISTS estimated_amount DECIMAL(12,2);
ALTER TABLE donations ADD COLUMN IF NOT EXISTS service_description TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link TEXT;

CREATE TABLE IF NOT EXISTS donation_status_history (
  id TEXT PRIMARY KEY,
  church_id TEXT NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  donation_id TEXT NOT NULL REFERENCES donations(id) ON DELETE CASCADE,
  changed_by_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  from_status "DonationStatus",
  to_status "DonationStatus" NOT NULL,
  amount DECIMAL(12,2),
  quantity DECIMAL(12,3),
  note TEXT,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS donation_status_history_church_donation_idx ON donation_status_history(church_id, donation_id);

CREATE TABLE IF NOT EXISTS campaign_expenses (
  id TEXT PRIMARY KEY,
  church_id TEXT NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  campaign_id TEXT NOT NULL REFERENCES donation_campaigns(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  date TIMESTAMP(3) NOT NULL,
  notes TEXT,
  created_by_id TEXT,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS campaign_expenses_church_campaign_date_idx ON campaign_expenses(church_id, campaign_id, date);

CREATE TABLE IF NOT EXISTS campaign_finance_transfers (
  id TEXT PRIMARY KEY,
  church_id TEXT NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  campaign_id TEXT NOT NULL REFERENCES donation_campaigns(id) ON DELETE RESTRICT,
  financial_entry_id TEXT NOT NULL UNIQUE REFERENCES financial_entries(id) ON DELETE RESTRICT,
  amount DECIMAL(12,2) NOT NULL,
  date TIMESTAMP(3) NOT NULL,
  reference TEXT,
  notes TEXT,
  created_by_id TEXT,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS campaign_finance_transfers_church_campaign_idx ON campaign_finance_transfers(church_id, campaign_id);

CREATE TABLE IF NOT EXISTS reminder_logs (
  id TEXT PRIMARY KEY,
  church_id TEXT NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  automatic BOOLEAN NOT NULL DEFAULT FALSE,
  sent_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS reminder_logs_source_time_idx ON reminder_logs(church_id, source_type, source_id, sent_at);

CREATE TABLE IF NOT EXISTS ministries (
  id TEXT PRIMARY KEY,
  church_id TEXT NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  leader_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  image_url TEXT,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ministries_church_active_idx ON ministries(church_id, active);

CREATE TABLE IF NOT EXISTS media_items (
  id TEXT PRIMARY KEY,
  church_id TEXT NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  kind TEXT NOT NULL,
  url TEXT NOT NULL,
  published BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMP(3),
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS media_items_church_published_idx ON media_items(church_id, published, published_at);

CREATE TABLE IF NOT EXISTS live_streams (
  id TEXT PRIMARY KEY,
  church_id TEXT NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  starts_at TIMESTAMP(3),
  live BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS live_streams_church_live_idx ON live_streams(church_id, live);

CREATE TABLE IF NOT EXISTS visitors (
  id TEXT PRIMARY KEY,
  church_id TEXT NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  whatsapp TEXT,
  visited_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  worship_id TEXT,
  how_found TEXT,
  address TEXT,
  notes TEXT,
  companions TEXT,
  may_contact BOOLEAN NOT NULL DEFAULT FALSE,
  interest TEXT,
  follow_up_needed BOOLEAN NOT NULL DEFAULT FALSE,
  created_by_id TEXT,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS visitors_church_visited_idx ON visitors(church_id, visited_at);

CREATE TABLE IF NOT EXISTS prayer_requests (
  id TEXT PRIMARY KEY,
  church_id TEXT NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT,
  anonymous BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS prayer_requests_church_status_created_idx ON prayer_requests(church_id, status, created_at);

CREATE TABLE IF NOT EXISTS small_groups (
  id TEXT PRIMARY KEY,
  church_id TEXT NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  leader_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  location TEXT,
  meeting_schedule TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS small_groups_church_active_idx ON small_groups(church_id, active);

CREATE TABLE IF NOT EXISTS bulletins (
  id TEXT PRIMARY KEY,
  church_id TEXT NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  published BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMP(3),
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS bulletins_church_published_idx ON bulletins(church_id, published, published_at);

-- Indisponibilidade pontual em uma data específica (a disponibilidade
-- semanal existente permanece intacta e é avaliada junto com esta tabela).
CREATE TABLE IF NOT EXISTS availability_exceptions (
  id TEXT PRIMARY KEY,
  church_id TEXT NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  worker_id TEXT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status "AvailabilityStatus" NOT NULL,
  start_time TEXT,
  end_time TEXT,
  notes TEXT,
  changed_by_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  active BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS availability_exceptions_church_worker_date_idx ON availability_exceptions(church_id, worker_id, date);

INSERT INTO permissions (id, slug, description, created_at) VALUES
  (gen_random_uuid()::text, 'donations.finance_post', 'Registrar transferência de campanha no financeiro oficial', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'donations.expenses.manage', 'Gerenciar despesas internas de campanha', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'donations.reminders.send', 'Enviar lembretes manuais de pendências de doação', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'schedule.reminders.send', 'Enviar lembretes manuais de confirmação de escala', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'visitors.view', 'Visualizar cadastro de visitantes', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'visitors.create', 'Cadastrar visitantes', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'visitors.manage', 'Gerenciar visitantes e retornos', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'prayer_requests.view', 'Visualizar pedidos de oração autorizados', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'prayer_requests.create', 'Enviar pedidos de oração', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'prayer_requests.manage', 'Gerenciar pedidos de oração', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'ministries.manage', 'Gerenciar ministérios e conteúdo', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'media.manage', 'Gerenciar conteúdo de mídia e transmissão', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'groups.manage', 'Gerenciar pequenos grupos', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'bulletins.manage', 'Gerenciar boletins', CURRENT_TIMESTAMP)
ON CONFLICT (slug) DO NOTHING;

-- Admins, secretaria e admin de obreiros podem consultar/contribuir; só permissões já administrativas confirmam.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.slug IN ('admin_financeiro', 'admin_obreiros', 'secretaria') AND p.slug IN ('donations.view', 'donations.participate')
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.slug = 'admin_financeiro' AND p.slug IN ('donations.finance_post', 'donations.expenses.manage', 'donations.reminders.send')
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.slug = 'admin_geral' AND p.slug IN ('donations.finance_post', 'donations.expenses.manage', 'donations.reminders.send', 'schedule.reminders.send', 'visitors.view', 'visitors.create', 'visitors.manage', 'prayer_requests.view', 'prayer_requests.create', 'prayer_requests.manage', 'ministries.manage', 'media.manage', 'groups.manage', 'bulletins.manage')
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.slug IN ('admin_financeiro', 'secretaria') AND p.slug IN ('visitors.view', 'visitors.create', 'visitors.manage')
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.slug = 'admin_obreiros' AND p.slug IN ('schedule.reminders.send', 'groups.manage', 'ministries.manage')
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.slug IN ('membro', 'obreiro') AND p.slug IN ('prayer_requests.create')
ON CONFLICT (role_id, permission_id) DO NOTHING;
