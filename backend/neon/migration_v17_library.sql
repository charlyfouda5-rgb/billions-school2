-- BILLIONS SCHOOL V17 — bibliothèque : livres, vidéos, documents envoyés par le super administrateur. Exécuter après v16.
CREATE TABLE IF NOT EXISTS shared_files (
  id BIGSERIAL PRIMARY KEY,
  owner_id TEXT NOT NULL,
  name TEXT NOT NULL,
  mime TEXT,
  size BIGINT NOT NULL CHECK (size > 0),
  object_key TEXT NOT NULL UNIQUE,
  upload_id TEXT,
  part_size BIGINT,
  status VARCHAR(20) NOT NULL DEFAULT 'awaiting_upload' CHECK (status IN ('awaiting_upload','ready','deleted','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
