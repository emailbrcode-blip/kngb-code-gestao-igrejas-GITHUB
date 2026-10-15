-- Índices para reduzir lentidão (aditivo e seguro: só CRIA índices, não altera nem apaga dados).
-- Pode ser executado mais de uma vez (IF NOT EXISTS). Rodar no Supabase: SQL Editor > New query > Run.
-- Dica: faça em um horário de pouco uso; em tabelas pequenas leva menos de 1 segundo.

-- 1) Refresh: a busca é por token_hash (antes sem índice => varredura da tabela inteira).
CREATE INDEX IF NOT EXISTS "refresh_tokens_token_hash_idx" ON "refresh_tokens" ("token_hash");

-- 2) Dashboard "atividade recente": WHERE church_id = ? ORDER BY created_at DESC LIMIT 8.
CREATE INDEX IF NOT EXISTS "audit_logs_church_created_idx" ON "audit_logs" ("church_id", "created_at" DESC);

-- 3) Sino/dashboard: notificações do usuário, mais recentes primeiro.
CREATE INDEX IF NOT EXISTS "notifications_user_created_idx" ON "notifications" ("user_id", "created_at" DESC);

-- OPCIONAL (NÃO executado automaticamente; descomente só se quiser e depois de conferir):
-- Limpeza de refresh tokens já vencidos ou revogados há mais de 30 dias (a tabela só cresce).
-- DELETE FROM "refresh_tokens" WHERE ("expires_at" < now() - interval '30 days') OR ("revoked_at" IS NOT NULL AND "revoked_at" < now() - interval '30 days');
