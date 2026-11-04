-- DELTA SCHOOL V28 : conversations, clôture et historique administratif
-- Exécuter dans Neon SQL Editor. Les photos sont référencées par URL/clé de stockage,
-- jamais copiées en clair dans les journaux d'audit.
CREATE TABLE IF NOT EXISTS conversations (
  id BIGSERIAL PRIMARY KEY,
  participant_a TEXT NOT NULL,
  participant_b TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','closed')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  closed_by TEXT,
  close_reason TEXT CHECK (close_reason IS NULL OR close_reason IN ('manual','inactive_24h')),
  CONSTRAINT conversations_pair_unique UNIQUE (participant_a, participant_b),
  CONSTRAINT conversations_pair_order CHECK (participant_a < participant_b)
);
CREATE TABLE IF NOT EXISTS conversation_messages (
  id BIGSERIAL PRIMARY KEY,
  conversation_id BIGINT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  media_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS conversation_messages_thread_idx ON conversation_messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS conversations_activity_idx ON conversations(status, last_message_at);
CREATE TABLE IF NOT EXISTS conversation_admin_audit (
  id BIGSERIAL PRIMARY KEY,
  admin_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('view','export','delete')),
  conversation_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  details JSONB NOT NULL DEFAULT '{}'::jsonb
);
-- Clôture automatique des conversations inactives depuis au moins 24 heures.
CREATE OR REPLACE FUNCTION close_inactive_conversations() RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE n INTEGER;
BEGIN
 UPDATE conversations SET status='closed', closed_at=now(), close_reason='inactive_24h'
 WHERE status='active' AND last_message_at <= now() - INTERVAL '24 hours';
 GET DIAGNOSTICS n = ROW_COUNT;
 RETURN n;
END; $$;
