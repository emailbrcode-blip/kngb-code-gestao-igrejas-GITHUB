-- Site público: conteúdo extra (imagens, vídeos, ministérios, logo, links...) em JSON.
-- Incremental e seguro: só ADICIONA uma coluna opcional. Não apaga nem altera dados.
-- Pode ser executado mais de uma vez (IF NOT EXISTS).
-- Aplicar no Supabase: SQL Editor > New query > colar e executar.
ALTER TABLE "churches" ADD COLUMN IF NOT EXISTS "public_extras" JSONB;
