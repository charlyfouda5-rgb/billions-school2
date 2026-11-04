-- DELTA SCHOOL V26 : identité scolaire internationale et audit de consultation.
-- À exécuter dans Neon après sauvegarde. Adapter le nom des tables si le schéma réel diffère.
-- Cette migration ne copie pas automatiquement les utilisateurs du stockage local vers Neon.
CREATE TABLE IF NOT EXISTS student_global_identity (
  student_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  isii text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES profiles(id)
);
CREATE TABLE IF NOT EXISTS student_identity_access_audit (
  id bigserial PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  purpose text NOT NULL,
  accessed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE student_global_identity ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_identity_access_audit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS student_identity_read_authorized ON student_global_identity;
CREATE POLICY student_identity_read_authorized ON student_global_identity FOR SELECT USING (
  student_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id=auth.uid() AND p.role='super')
  OR EXISTS (SELECT 1 FROM profiles p JOIN profiles s ON s.school_id=p.school_id
             WHERE p.id=auth.uid() AND p.role='chef' AND s.id=student_global_identity.student_id)
  OR EXISTS (SELECT 1 FROM parent_children pc WHERE pc.parent_id=auth.uid() AND pc.child_id=student_global_identity.student_id)
);
DROP POLICY IF EXISTS student_identity_audit_super_read ON student_identity_access_audit;
CREATE POLICY student_identity_audit_super_read ON student_identity_access_audit FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id=auth.uid() AND p.role='super')
  OR viewer_id=auth.uid()
);
-- IMPORTANT : création/attribution ISII doit être faite par une API serveur transactionnelle
-- qui génère un UUID et insère student_global_identity. Ne pas exposer de clé service_role au navigateur.
-- Les transferts internationaux nécessitent validation, consentement/justification et synchronisation serveur.
