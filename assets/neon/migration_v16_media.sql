-- BILLIONS SCHOOL V16 — envoi multipart de gros fichiers + rendu traduit. Exécuter après migration_v14_multimedia.sql.
ALTER TABLE translation_jobs ADD COLUMN IF NOT EXISTS upload_id TEXT;
ALTER TABLE translation_jobs ADD COLUMN IF NOT EXISTS part_size BIGINT;
ALTER TABLE translation_jobs ADD COLUMN IF NOT EXISTS output_name TEXT;
ALTER TABLE translation_jobs ADD COLUMN IF NOT EXISTS output_bytes BIGINT;
ALTER TABLE translation_jobs ADD COLUMN IF NOT EXISTS options JSONB NOT NULL DEFAULT '{}'::jsonb;
