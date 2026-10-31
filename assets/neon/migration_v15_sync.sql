-- BILLIONS SCHOOL V15 — synchronisation multi-appareils (Neon PostgreSQL)
-- À exécuter une fois dans Neon SQL Editor, après schema.sql. Ne supprime rien.
CREATE TABLE IF NOT EXISTS app_state (
  state_key VARCHAR(100) PRIMARY KEY,
  state_data JSONB NOT NULL,
  version BIGINT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Mots de passe hachés (scrypt + sel). Jamais renvoyés au navigateur.
CREATE TABLE IF NOT EXISTS app_secrets (
  kind VARCHAR(10) NOT NULL,
  ref  VARCHAR(40) NOT NULL,
  pwh  TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (kind, ref)
);
-- Limitation des tentatives de connexion
CREATE TABLE IF NOT EXISTS login_attempts (
  k VARCHAR(200) PRIMARY KEY,
  n INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ
);
