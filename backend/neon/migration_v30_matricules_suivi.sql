-- DELTA SCHOOL V30 : registre des matricules et numéros de suivi.
-- À exécuter dans Neon SQL Editor. La génération en production doit passer par une API
-- transactionnelle (et non par le navigateur) afin de garantir l'unicité multi-établissements.
CREATE TABLE IF NOT EXISTS student_matricules (
  id BIGSERIAL PRIMARY KEY,
  student_id TEXT NOT NULL,
  school_id TEXT NOT NULL,
  country_code CHAR(2) NOT NULL DEFAULT 'CM',
  academic_year TEXT NOT NULL,
  matricule TEXT NOT NULL UNIQUE,
  is_current BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,
  UNIQUE(student_id, school_id, matricule)
);
CREATE UNIQUE INDEX IF NOT EXISTS student_matricules_one_current_per_school
  ON student_matricules(student_id, school_id) WHERE is_current = TRUE;
CREATE INDEX IF NOT EXISTS student_matricules_school_idx ON student_matricules(school_id, matricule);
CREATE INDEX IF NOT EXISTS student_matricules_student_idx ON student_matricules(student_id, created_at DESC);
CREATE TABLE IF NOT EXISTS tracking_records (
  id BIGSERIAL PRIMARY KEY,
  tracking_number TEXT NOT NULL UNIQUE,
  operation_type VARCHAR(12) NOT NULL,
  creator_id TEXT NOT NULL,
  school_id TEXT,
  student_id TEXT,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'En attente' CHECK (status IN ('En attente','Reçue','En cours de traitement','En attente de validation','Validée','Rejetée','Terminée')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT
);
CREATE INDEX IF NOT EXISTS tracking_records_school_idx ON tracking_records(school_id, created_at DESC);
CREATE INDEX IF NOT EXISTS tracking_records_creator_idx ON tracking_records(creator_id, created_at DESC);
CREATE TABLE IF NOT EXISTS tracking_status_history (
  id BIGSERIAL PRIMARY KEY,
  tracking_id BIGINT NOT NULL REFERENCES tracking_records(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  comment TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS tracking_history_record_idx ON tracking_status_history(tracking_id, changed_at DESC);
CREATE TABLE IF NOT EXISTS identifier_counters (
  counter_key TEXT PRIMARY KEY,
  last_value BIGINT NOT NULL DEFAULT 0 CHECK (last_value >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Exemple de réservation atomique d'un numéro :
-- INSERT INTO identifier_counters(counter_key,last_value) VALUES ('MAT:school:2026',1)
-- ON CONFLICT(counter_key) DO UPDATE SET last_value=identifier_counters.last_value+1,updated_at=now()
-- RETURNING last_value;
