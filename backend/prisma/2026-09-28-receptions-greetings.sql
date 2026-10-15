-- Aplicar somente se as tabelas/ENUMs ainda não existirem no Supabase.
-- O banco do projeto já recebeu receptions e greetings; este arquivo é apenas referência incremental.
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReceptionStatus') THEN CREATE TYPE "ReceptionStatus" AS ENUM ('assigned','confirmed','declined','substituted'); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'GreetingStatus') THEN CREATE TYPE "GreetingStatus" AS ENUM ('assigned','confirmed','declined','substituted'); END IF; END $$;
