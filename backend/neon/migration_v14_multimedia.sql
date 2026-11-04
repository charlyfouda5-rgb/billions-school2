-- BILLIONS SCHOOL V14 — file de traduction multimédia (Neon PostgreSQL)
-- Exécuter après les migrations V13. Ne supprime aucune table existante.
CREATE TABLE IF NOT EXISTS translation_jobs (
  id BIGSERIAL PRIMARY KEY,
  requester_id TEXT NOT NULL,
  establishment_id TEXT,
  source_filename TEXT NOT NULL,
  source_mime TEXT NOT NULL,
  source_bytes BIGINT NOT NULL CHECK (source_bytes >= 0),
  source_object_key TEXT NOT NULL UNIQUE,
  target_language VARCHAR(16) NOT NULL,
  source_language VARCHAR(16),
  task_type VARCHAR(24) NOT NULL CHECK (task_type IN ('document','audio','video','image','text')),
  output_object_key TEXT,
  status VARCHAR(24) NOT NULL DEFAULT 'uploaded' CHECK (status IN ('awaiting_upload','uploaded','queued','processing','completed','failed','cancelled')),
  progress SMALLINT NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  error_code TEXT,
  error_message TEXT,
  provider_job_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_translation_jobs_requester_created ON translation_jobs(requester_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_translation_jobs_status_created ON translation_jobs(status, created_at);
CREATE TABLE IF NOT EXISTS translation_job_parts (
  id BIGSERIAL PRIMARY KEY,
  job_id BIGINT NOT NULL REFERENCES translation_jobs(id) ON DELETE CASCADE,
  part_number INTEGER NOT NULL,
  start_ms BIGINT,
  end_ms BIGINT,
  status VARCHAR(20) NOT NULL DEFAULT 'queued',
  input_object_key TEXT,
  output_object_key TEXT,
  error_message TEXT,
  UNIQUE(job_id, part_number)
);
CREATE TABLE IF NOT EXISTS translation_usage (
  id BIGSERIAL PRIMARY KEY,
  requester_id TEXT NOT NULL,
  job_id BIGINT REFERENCES translation_jobs(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  units BIGINT NOT NULL DEFAULT 0,
  unit_type TEXT NOT NULL,
  estimated_cost NUMERIC(14,4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS translation_language_preferences (
  user_id TEXT PRIMARY KEY,
  language_code VARCHAR(16) NOT NULL,
  auto_translate_messages BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
