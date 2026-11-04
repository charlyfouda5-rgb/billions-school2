-- DELTA SCHOOL V34 : recherche ISII et autorisations d'accès inter-établissements.
-- À exécuter après les migrations V26 à V33. Les appels doivent passer par une API authentifiée.
CREATE TABLE IF NOT EXISTS ds_isii_access_requests (
  id BIGSERIAL PRIMARY KEY,
  request_code TEXT NOT NULL UNIQUE,
  student_isii TEXT NOT NULL,
  requesting_school_id TEXT NOT NULL,
  requesting_user_id TEXT NOT NULL,
  current_school_id TEXT,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','revoked')),
  decided_by TEXT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ds_isii_requests_school_status_idx
 ON ds_isii_access_requests(requesting_school_id,status,created_at DESC);
CREATE INDEX IF NOT EXISTS ds_isii_requests_student_idx
 ON ds_isii_access_requests(student_isii,created_at DESC);
CREATE TABLE IF NOT EXISTS ds_isii_access_grants (
  id BIGSERIAL PRIMARY KEY,
  request_id BIGINT NOT NULL REFERENCES ds_isii_access_requests(id),
  student_isii TEXT NOT NULL,
  school_id TEXT NOT NULL,
  granted_by TEXT NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  UNIQUE(request_id)
);
CREATE INDEX IF NOT EXISTS ds_isii_grants_lookup_idx
 ON ds_isii_access_grants(student_isii,school_id,expires_at)
 WHERE revoked_at IS NULL;
CREATE TABLE IF NOT EXISTS ds_isii_access_audit (
  id BIGSERIAL PRIMARY KEY,
  student_isii TEXT NOT NULL,
  actor_user_id TEXT NOT NULL,
  actor_school_id TEXT,
  action TEXT NOT NULL CHECK (action IN ('lookup','view_record','request_access','grant_access','reject_access','revoke_access')),
  request_id BIGINT REFERENCES ds_isii_access_requests(id),
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ds_isii_audit_student_idx
 ON ds_isii_access_audit(student_isii,created_at DESC);
-- Contrat API obligatoire :
-- 1) authentifier l'utilisateur depuis sa session, jamais depuis un user_id fourni par le navigateur ;
-- 2) retrouver l'élève via ISII exact dans le registre central ;
-- 3) autoriser superadmin, établissement courant ou grant valide non expiré ;
-- 4) limiter les données retournées au besoin légitime (admission/transfert) ;
-- 5) écrire ds_isii_access_audit à chaque recherche/consultation/décision ;
-- 6) refuser toute demande d'accès initiée au nom d'un autre établissement.
-- Aucun accès direct public à ces tables ne doit être accordé.
