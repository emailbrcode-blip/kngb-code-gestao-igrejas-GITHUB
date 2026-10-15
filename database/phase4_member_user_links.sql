-- Link optional member profiles to existing system accounts.
-- Additive and safe to run more than once; existing member rows are preserved.
ALTER TABLE members ADD COLUMN IF NOT EXISTS user_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS members_user_id_key ON members(user_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'members_user_id_fkey'
  ) THEN
    ALTER TABLE members
      ADD CONSTRAINT members_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id)
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
