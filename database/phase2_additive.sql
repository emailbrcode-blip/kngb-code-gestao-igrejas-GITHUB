-- Additive migration for public site, campaign needs and participation.
-- Safe to re-run. Does not drop/recreate existing tables, rows or IDs.
BEGIN;

ALTER TABLE churches ADD COLUMN IF NOT EXISTS public_site_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE churches ADD COLUMN IF NOT EXISTS public_description TEXT;
ALTER TABLE churches ADD COLUMN IF NOT EXISTS public_address TEXT;
ALTER TABLE churches ADD COLUMN IF NOT EXISTS public_phone TEXT;
ALTER TABLE churches ADD COLUMN IF NOT EXISTS public_email TEXT;
ALTER TABLE churches ADD COLUMN IF NOT EXISTS public_service_times TEXT;

ALTER TABLE events ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS donation_items (
  id TEXT PRIMARY KEY,
  church_id TEXT NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  campaign_id TEXT NOT NULL REFERENCES donation_campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  target_amount DECIMAL(12,2),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS donation_items_church_id_campaign_id_idx ON donation_items(church_id, campaign_id);

ALTER TABLE donations ADD COLUMN IF NOT EXISTS item_id TEXT;
ALTER TABLE donations ADD COLUMN IF NOT EXISTS donor_user_id TEXT;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'donations_item_id_fkey') THEN
    ALTER TABLE donations ADD CONSTRAINT donations_item_id_fkey FOREIGN KEY (item_id) REFERENCES donation_items(id) ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'donations_donor_user_id_fkey') THEN
    ALTER TABLE donations ADD CONSTRAINT donations_donor_user_id_fkey FOREIGN KEY (donor_user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'donation';

INSERT INTO permissions (id, slug, description, created_at)
VALUES
  (gen_random_uuid()::text, 'donations.participate', 'Registrar intenção de doação em campanhas públicas', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'public_site.manage', 'Gerenciar conteúdo público da igreja', CURRENT_TIMESTAMP)
ON CONFLICT (slug) DO NOTHING;

-- Secretaria: apenas escopo próprio de doações. Nenhuma permissão finance.* é concedida.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.slug = 'secretaria' AND p.slug IN ('donations.view', 'donations.create', 'donations.manage')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Participação pode registrar somente intenção pendente; administração confirma/cancela.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.slug IN ('membro', 'obreiro') AND p.slug = 'donations.participate'
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.slug = 'admin_geral' AND p.slug = 'public_site.manage'
ON CONFLICT (role_id, permission_id) DO NOTHING;

COMMIT;
