-- DELTA SCHOOL V35 : seul le superadministrateur consulte le registre central ISII.
-- Le chef demande l'identifiant ; le superadministrateur l'envoie par messagerie.
-- À exécuter après V34. Les contrôles réels doivent être appliqués par l'API authentifiée.

ALTER TABLE ds_isii_access_requests
  ALTER COLUMN student_isii DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS student_name_requested TEXT,
  ADD COLUMN IF NOT EXISTS student_birth_date DATE,
  ADD COLUMN IF NOT EXISTS previous_school_label TEXT,
  ADD COLUMN IF NOT EXISTS delivered_to_user_id TEXT,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_by TEXT,
  ADD COLUMN IF NOT EXISTS delivery_message_id TEXT;

-- État supplémentaire : ISII identifié et envoyé au chef par message privé.
ALTER TABLE ds_isii_access_requests DROP CONSTRAINT IF EXISTS ds_isii_access_requests_status_check;
ALTER TABLE ds_isii_access_requests ADD CONSTRAINT ds_isii_access_requests_status_check
 CHECK (status IN ('pending','approved','rejected','revoked','isii_sent'));

CREATE TABLE IF NOT EXISTS ds_isii_registry_access_audit (
  id BIGSERIAL PRIMARY KEY,
  actor_user_id TEXT NOT NULL,
  actor_role TEXT NOT NULL CHECK (actor_role IN ('super','chef')),
  student_isii TEXT,
  request_id BIGINT REFERENCES ds_isii_access_requests(id),
  action TEXT NOT NULL CHECK (action IN ('registry_lookup','request_submitted','isii_identified','isii_delivered_by_message','record_lookup_after_delivery','record_view','access_denied')),
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ds_isii_registry_audit_request_idx
 ON ds_isii_registry_access_audit(request_id,created_at DESC);

-- Politique d'architecture obligatoire pour l'API :
-- 1. Seul un compte superadministrateur authentifié peut interroger ds_students_registry / la table source ISII.
-- 2. Un chef ne peut pas appeler l'endpoint de recherche du registre central, même s'il connaît un ISII.
-- 3. Un chef soumet une demande avec identité de l'élève, date de naissance si disponible,
--    établissement antérieur et motif ; l'API dérive son établissement depuis sa session.
-- 4. Le superadministrateur vérifie l'identité, sélectionne l'élève dans le registre central,
--    puis transmet l'ISII au compte demandeur via le service de messagerie interne.
-- 5. Après réception, le chef saisit l'ISII ; l'API vérifie l'existence d'une communication
--    liée à ce chef et à cette demande avant de retourner les informations autorisées.
-- 6. La communication de l'ISII ne vaut pas automatiquement autorisation de lire tout le dossier.
--    L'API applique une autorisation d'accès distincte, limitée au besoin d'admission/transfert.
-- 7. Ne jamais exposer l'ISII complet dans les données initiales publiques, les exports non autorisés
--    ou les réponses destinées à d'autres rôles. Journaliser chaque recherche et consultation.
-- 8. L'envoi du message, le changement d'état de la demande et l'audit doivent être transactionnels.
