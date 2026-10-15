-- Contextualiza os visitantes na escala/evento existente sem recriar a tabela.
-- Todos os campos são opcionais para preservar os registros anteriores.

ALTER TABLE visitors ADD COLUMN IF NOT EXISTS schedule_id TEXT;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS event_id TEXT;

CREATE INDEX IF NOT EXISTS visitors_church_schedule_visited_idx
  ON visitors(church_id, schedule_id, visited_at);
CREATE INDEX IF NOT EXISTS visitors_church_event_visited_idx
  ON visitors(church_id, event_id, visited_at);
CREATE INDEX IF NOT EXISTS visitors_worship_id_idx
  ON visitors(worship_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'visitors_schedule_id_fkey' AND conrelid = 'visitors'::regclass) THEN
    ALTER TABLE visitors ADD CONSTRAINT visitors_schedule_id_fkey
      FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'visitors_event_id_fkey' AND conrelid = 'visitors'::regclass) THEN
    ALTER TABLE visitors ADD CONSTRAINT visitors_event_id_fkey
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  -- worship_id já existia na tabela. Só adiciona a FK se os dados antigos
  -- estiverem íntegros, preservando eventuais registros históricos órfãos.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'visitors_worship_id_fkey' AND conrelid = 'visitors'::regclass)
     AND NOT EXISTS (
       SELECT 1 FROM visitors v
       LEFT JOIN worships w ON w.id = v.worship_id
       WHERE v.worship_id IS NOT NULL AND w.id IS NULL
     ) THEN
    ALTER TABLE visitors ADD CONSTRAINT visitors_worship_id_fkey
      FOREIGN KEY (worship_id) REFERENCES worships(id) ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
