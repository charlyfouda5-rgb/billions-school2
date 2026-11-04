-- DELTA SCHOOL V33 : numéro mondial unique pour chaque changement de classe / redoublement.
-- À exécuter après V32 dans Neon. Le service serveur doit appeler ds_register_class_change.
CREATE TABLE IF NOT EXISTS ds_student_class_history (
  id BIGSERIAL PRIMARY KEY,
  student_id TEXT NOT NULL,
  school_id TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  cycle TEXT,
  previous_class TEXT,
  new_class TEXT NOT NULL,
  is_repetition BOOLEAN NOT NULL DEFAULT FALSE,
  tracking_number TEXT NOT NULL UNIQUE,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ds_class_history_student_idx
  ON ds_student_class_history(student_id, academic_year DESC);
CREATE INDEX IF NOT EXISTS ds_class_history_school_idx
  ON ds_student_class_history(school_id, academic_year DESC);
-- Numéro de suivi mondial atomique : réutilise le compteur global V32.
CREATE OR REPLACE FUNCTION ds_register_class_change(
  p_student_id TEXT, p_school_id TEXT, p_academic_year TEXT,
  p_cycle TEXT, p_previous_class TEXT, p_new_class TEXT,
  p_is_repetition BOOLEAN, p_created_by TEXT
) RETURNS TABLE(tracking_number TEXT, history_id BIGINT)
LANGUAGE plpgsql AS $$
DECLARE v_code TEXT; v_id BIGINT; v_type TEXT;
BEGIN
  IF coalesce(trim(p_student_id),'')='' OR coalesce(trim(p_school_id),'')='' OR coalesce(trim(p_new_class),'')='' OR coalesce(trim(p_created_by),'')='' THEN
    RAISE EXCEPTION 'Informations obligatoires manquantes';
  END IF;
  v_type := CASE WHEN p_is_repetition THEN 'RED' ELSE 'CLS' END;
  v_code := ds_next_global_tracking(v_type);
  INSERT INTO ds_tracking_registry(tracking_number,student_id,school_id,operation_type,created_by,status)
  VALUES(v_code,p_student_id,p_school_id,v_type,p_created_by,'En attente');
  INSERT INTO ds_student_class_history(student_id,school_id,academic_year,cycle,previous_class,new_class,is_repetition,tracking_number,created_by)
  VALUES(p_student_id,p_school_id,p_academic_year,p_cycle,p_previous_class,p_new_class,p_is_repetition,v_code,p_created_by)
  RETURNING id INTO v_id;
  RETURN QUERY SELECT v_code,v_id;
END; $$;
-- La règle de conservation du matricule dans le même cycle est explicite :
-- aucune mise à jour de ds_student_cycle_matricules n'est effectuée lors d'un simple changement de classe.
