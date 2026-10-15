-- =============================================================================
-- RMA (registro permanente), data de saída e carteirinha digital.
-- INCREMENTAL e IDEMPOTENTE: só adiciona; não apaga nem altera dados existentes
-- (exceto preencher o RMA de quem ainda não tem). Pode rodar mais de uma vez.
-- Aplicar no Supabase: SQL Editor > New query > colar tudo > Run.
-- =============================================================================

-- 1) Sequência global do RMA (começa em 1; nunca volta, mesmo se alguém for excluído).
CREATE SEQUENCE IF NOT EXISTS rma_number_seq START 1;

-- 2) Colunas novas (nulas no início, para não quebrar nada).
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "rma_number" INTEGER;
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "exit_date" TIMESTAMP(3);
ALTER TABLE "workers" ADD COLUMN IF NOT EXISTS "rma_number" INTEGER;

-- 3) Atribuição controlada aos cadastros existentes, em ordem de cadastro.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM "members" WHERE "rma_number" IS NULL ORDER BY "created_at", "id" LOOP
    UPDATE "members" SET "rma_number" = nextval('rma_number_seq') WHERE "id" = r.id;
  END LOOP;

  -- Obreiro com a MESMA conta de usuário de um membro = mesma pessoa: reaproveita o RMA do membro.
  UPDATE "workers" w SET "rma_number" = m."rma_number"
    FROM "members" m
   WHERE w."rma_number" IS NULL AND w."user_id" IS NOT NULL
     AND m."user_id" = w."user_id" AND m."church_id" = w."church_id";

  FOR r IN SELECT id FROM "workers" WHERE "rma_number" IS NULL ORDER BY "created_at", "id" LOOP
    UPDATE "workers" SET "rma_number" = nextval('rma_number_seq') WHERE "id" = r.id;
  END LOOP;
END $$;

-- 4) A partir de agora o PRÓPRIO BANCO gera o número (seguro com cadastros simultâneos).
ALTER TABLE "members" ALTER COLUMN "rma_number" SET DEFAULT nextval('rma_number_seq');
ALTER TABLE "workers" ALTER COLUMN "rma_number" SET DEFAULT nextval('rma_number_seq');
ALTER TABLE "members" ALTER COLUMN "rma_number" SET NOT NULL;
ALTER TABLE "workers" ALTER COLUMN "rma_number" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "members_rma_number_key" ON "members"("rma_number");
CREATE UNIQUE INDEX IF NOT EXISTS "workers_rma_number_key" ON "workers"("rma_number");

-- 5) O RMA nunca pode ser alterado depois de gerado (nem por engano, nem pela API).
CREATE OR REPLACE FUNCTION prevent_rma_change() RETURNS trigger AS $fn$
BEGIN
  IF NEW."rma_number" IS DISTINCT FROM OLD."rma_number" THEN
    RAISE EXCEPTION 'O número RMA é permanente e não pode ser alterado.';
  END IF;
  RETURN NEW;
END
$fn$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS members_rma_immutable ON "members";
CREATE TRIGGER members_rma_immutable BEFORE UPDATE ON "members" FOR EACH ROW EXECUTE FUNCTION prevent_rma_change();
DROP TRIGGER IF EXISTS workers_rma_immutable ON "workers";
CREATE TRIGGER workers_rma_immutable BEFORE UPDATE ON "workers" FOR EACH ROW EXECUTE FUNCTION prevent_rma_change();

-- 6) Carteirinha digital: um registro por pessoa; "code" é o identificador público do QR Code.
CREATE TABLE IF NOT EXISTS "id_cards" (
  "id"             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "church_id"      TEXT NOT NULL REFERENCES "churches"("id") ON DELETE CASCADE,
  "member_id"      TEXT UNIQUE REFERENCES "members"("id") ON DELETE CASCADE,
  "worker_id"      TEXT UNIQUE REFERENCES "workers"("id") ON DELETE CASCADE,
  "code"           TEXT NOT NULL UNIQUE,
  "issued_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "issue_count"    INTEGER NOT NULL DEFAULT 1,
  "issued_by_id"   TEXT,
  "revoked_at"     TIMESTAMP(3),
  CONSTRAINT "id_cards_one_subject" CHECK ((("member_id" IS NOT NULL)::int + ("worker_id" IS NOT NULL)::int) = 1)
);
CREATE INDEX IF NOT EXISTS "id_cards_church_id_idx" ON "id_cards"("church_id");
