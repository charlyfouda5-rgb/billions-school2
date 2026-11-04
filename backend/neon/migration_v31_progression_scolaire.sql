-- DELTA SCHOOL V31 : historique des passages de cycle et progression scolaire
-- À exécuter après les migrations V28 et V30 dans Neon PostgreSQL.
CREATE TABLE IF NOT EXISTS student_progressions (
  id BIGSERIAL PRIMARY KEY,
  student_id TEXT NOT NULL,
  school_id TEXT,
  from_cycle TEXT NOT NULL,
  to_cycle TEXT NOT NULL,
  from_class TEXT,
  to_class TEXT,
  effective_date DATE NOT NULL,
  old_matricule TEXT,
  new_matricule TEXT,
  isii TEXT,
  tracking_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'validated',
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT progression_cycle_nonempty CHECK (length(trim(from_cycle)) > 0 AND length(trim(to_cycle)) > 0)
);
CREATE INDEX IF NOT EXISTS idx_student_progressions_student ON student_progressions(student_id, effective_date DESC);
CREATE INDEX IF NOT EXISTS idx_student_progressions_school ON student_progressions(school_id, effective_date DESC);
CREATE INDEX IF NOT EXISTS idx_student_progressions_isii ON student_progressions(isii);

-- Historique des matricules : ne jamais écraser les anciennes valeurs.
CREATE TABLE IF NOT EXISTS student_matricule_history (
  id BIGSERIAL PRIMARY KEY,
  student_id TEXT NOT NULL,
  isii TEXT,
  school_id TEXT,
  matricule TEXT NOT NULL,
  cycle TEXT,
  valid_from DATE,
  valid_to DATE,
  reason TEXT,
  recorded_by TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (school_id, matricule)
);
CREATE INDEX IF NOT EXISTS idx_matricule_history_student ON student_matricule_history(student_id, recorded_at DESC);

-- L'unicité des numéros de suivi est imposée par la contrainte UNIQUE de student_progressions.
-- Les matricules sont uniques par établissement, pas mondialement : l'ISII est l'identifiant global.
