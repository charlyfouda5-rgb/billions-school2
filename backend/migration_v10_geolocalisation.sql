-- DELTA SCHOOL V10 : position GPS obligatoire à la connexion + heure de déconnexion.
-- À exécuter après schema.sql (la table access_sessions existe déjà).

alter table access_sessions add column if not exists logout_type text
  check (logout_type in ('deconnexion','fermeture','expiree'));
alter table access_sessions add column if not exists role text;

-- Un utilisateur autre que le super administrateur ne peut pas ouvrir de session sans position.
create or replace function enforce_geo_on_login() returns trigger language plpgsql security definer as $$
declare r text;
begin
  select role into r from profiles where id = new.user_id;
  new.role := r;
  if r is distinct from 'super' and (new.latitude is null or new.longitude is null) then
    raise exception 'Position GPS obligatoire pour se connecter';
  end if;
  if r is distinct from 'super' then new.location_status := 'autorisee'; end if;
  return new;
end $$;
drop trigger if exists trg_enforce_geo on access_sessions;
create trigger trg_enforce_geo before insert on access_sessions
  for each row execute function enforce_geo_on_login();

-- Après insertion, l'utilisateur ne peut modifier que l'heure et le type de déconnexion
-- (jamais les coordonnées ni l'heure d'entrée).
create or replace function lock_session_fields() returns trigger language plpgsql as $$
begin
  if new.latitude is distinct from old.latitude or new.longitude is distinct from old.longitude
     or new.accuracy_m is distinct from old.accuracy_m or new.login_at is distinct from old.login_at
     or new.user_id is distinct from old.user_id then
    raise exception 'Champs de session non modifiables';
  end if;
  return new;
end $$;
drop trigger if exists trg_lock_session on access_sessions;
create trigger trg_lock_session before update on access_sessions
  for each row execute function lock_session_fields();

-- Seul le super administrateur lit les positions de tous ; chacun lit les siennes (politiques de schema.sql).
create index if not exists access_sessions_user_login on access_sessions(user_id, login_at desc);
-- Rappel : prévoir une durée de conservation des positions et informer les utilisateurs (protection des données).
