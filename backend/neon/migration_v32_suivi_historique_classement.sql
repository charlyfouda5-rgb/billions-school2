-- DELTA SCHOOL V32 — unicité mondiale des suivis, archives annuelles et accès contrôlé.
-- Exécuter après les migrations V30 et V31 dans Neon.
CREATE TABLE IF NOT EXISTS ds_global_counters (
  counter_name TEXT PRIMARY KEY,
  last_value BIGINT NOT NULL DEFAULT 0 CHECK(last_value >= 0)
);
-- Séquence centrale : la fonction est atomique et sûre en concurrence multi-établissements.
CREATE OR REPLACE FUNCTION ds_next_global_tracking(p_type TEXT DEFAULT 'SUI') RETURNS TEXT
LANGUAGE plpgsql AS $$
DECLARE n BIGINT; t TEXT;
BEGIN
  t := upper(regexp_replace(coalesce(p_type,'SUI'), '[^A-Z0-9]', '', 'g'));
  IF t = '' THEN t := 'SUI'; END IF;
  INSERT INTO ds_global_counters(counter_name,last_value) VALUES ('TRACKING_GLOBAL',1)
  ON CONFLICT(counter_name) DO UPDATE SET last_value=ds_global_counters.last_value+1
  RETURNING last_value INTO n;
  RETURN 'DS-'||t||'-'||to_char(current_date,'YYYY')||'-'||lpad(n::TEXT,12,'0');
END; $$;
-- Registre d'identifiants : tracking_number UNIQUE au niveau de toute la plateforme.
CREATE TABLE IF NOT EXISTS ds_tracking_registry (
  id BIGSERIAL PRIMARY KEY,
  tracking_number TEXT NOT NULL UNIQUE,
  student_id TEXT,
  school_id TEXT,
  operation_type VARCHAR(16) NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'En attente'
);
CREATE INDEX IF NOT EXISTS ds_tracking_registry_student_idx ON ds_tracking_registry(student_id,created_at DESC);
CREATE INDEX IF NOT EXISTS ds_tracking_registry_school_idx ON ds_tracking_registry(school_id,created_at DESC);
-- Situations annuelles figées pour préserver les résultats même après modification des notes.
CREATE TABLE IF NOT EXISTS ds_student_annual_situations (
  id BIGSERIAL PRIMARY KEY,
  student_id TEXT NOT NULL,
  isii TEXT,
  school_id TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  cycle TEXT,
  class_name TEXT,
  matricule TEXT,
  tracking_numbers JSONB NOT NULL DEFAULT '[]'::jsonb,
  grades_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  average NUMERIC(6,2),
  absences INTEGER,
  archived_by TEXT NOT NULL,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id,school_id,academic_year)
);
CREATE INDEX IF NOT EXISTS ds_annual_situation_student_idx ON ds_student_annual_situations(student_id,academic_year DESC);
CREATE INDEX IF NOT EXISTS ds_annual_situation_school_idx ON ds_student_annual_situations(school_id,academic_year DESC);
-- Accès accordé à l'établissement destinataire lors d'une demande/transfert, sans ouvrir tous les dossiers.
CREATE TABLE IF NOT EXISTS ds_student_school_access (
  id BIGSERIAL PRIMARY KEY,
  student_id TEXT NOT NULL,
  school_id TEXT NOT NULL,
  access_reason TEXT NOT NULL CHECK(access_reason IN ('current_school','transfer_destination','super_admin')),
  granted_by TEXT,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  UNIQUE(student_id,school_id,access_reason)
);
CREATE INDEX IF NOT EXISTS ds_student_school_access_lookup_idx ON ds_student_school_access(student_id,school_id) WHERE revoked_at IS NULL;
-- Journal d'audit des consultations annuelles et historiques sensibles.
CREATE TABLE IF NOT EXISTS ds_student_record_access_log (
  id BIGSERIAL PRIMARY KEY,
  student_id TEXT NOT NULL,
  school_id TEXT,
  academic_year TEXT,
  viewer_user_id TEXT NOT NULL,
  viewer_role TEXT NOT NULL,
  action TEXT NOT NULL,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ds_record_access_student_idx ON ds_student_record_access_log(student_id,accessed_at DESC);
-- Historique des matricules par cycle : aucun écrasement des anciens matricules.
CREATE TABLE IF NOT EXISTS ds_student_cycle_matricules (
  id BIGSERIAL PRIMARY KEY,
  student_id TEXT NOT NULL,
  isii TEXT,
  cycle TEXT NOT NULL CHECK(cycle IN ('maternelle','primaire','secondaire','universite')),
  school_id TEXT NOT NULL,
  matricule TEXT NOT NULL UNIQUE,
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_to DATE,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ds_cycle_matricule_student_idx ON ds_student_cycle_matricules(student_id,valid_from DESC);
-- Règle applicative : même cycle = conserver le matricule ; nouveau matricule uniquement à la transition de cycle.
-- Le service API doit contrôler les droits et inscrire chaque changement dans ds_student_cycle_matricules.
-- Classements : calculer un classement global, puis des classements filtrés par cycle à partir d'indicateurs comparables.
CREATE TABLE IF NOT EXISTS ds_school_rankings (
  id BIGSERIAL PRIMARY KEY,
  school_id TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  scope TEXT NOT NULL CHECK(scope IN ('general','maternelle','primaire','secondaire','universite')),
  score NUMERIC(6,2) NOT NULL CHECK(score BETWEEN 0 AND 20),
  methodology_version TEXT NOT NULL DEFAULT 'V32',
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(school_id,academic_year,scope,methodology_version)
);
CREATE INDEX IF NOT EXISTS ds_school_rankings_scope_idx ON ds_school_rankings(academic_year,scope,score DESC);
