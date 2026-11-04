-- DELTA SCHOOL V11 : journal des connexions (avec position GPS) et copies de sauvegarde sur le serveur.
-- À exécuter UNE FOIS dans Supabase > SQL Editor (indépendant des autres fichiers SQL). Peut être relancé sans risque.
--
-- Principe de sécurité :
--  * les utilisateurs de l'application n'ont AUCUN accès direct aux tables ;
--  * ils passent par deux fonctions (log_login / log_logout) qui n'acceptent que l'écriture ;
--  * seul le super administrateur (compte Supabase Auth déclaré ci-dessous) peut lire le journal
--    et enregistrer / lire les copies de sauvegarde.

-- 1) Super administrateurs du serveur ------------------------------------------------------------
create table if not exists super_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table super_admins enable row level security;   -- aucune politique : lecture réservée aux fonctions

create or replace function is_super() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from super_admins where user_id = auth.uid());
$$;
revoke all on function is_super() from public;
grant execute on function is_super() to authenticated;

-- 2) Journal des connexions -------------------------------------------------------------------
create table if not exists app_connexions (
  id bigserial primary key,
  session_key text not null unique check (char_length(session_key) between 16 and 64),
  user_ref text not null check (char_length(user_ref) <= 64),
  user_name text not null check (char_length(user_name) <= 120),
  role text not null check (role in ('chef','prof','comptable','censeur','eleve','parent','repetiteur')),
  school_ref text check (char_length(school_ref) <= 64),
  school_name text check (char_length(school_name) <= 160),
  login_at timestamptz not null default now(),
  logout_at timestamptz,
  logout_type text check (logout_type in ('deconnexion','fermeture','expiree')),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  accuracy_m double precision check (accuracy_m >= 0),
  user_agent text check (char_length(user_agent) <= 300),
  created_at timestamptz not null default now()
);
create index if not exists app_connexions_login on app_connexions(login_at desc);
create index if not exists app_connexions_user on app_connexions(user_ref, login_at desc);

alter table app_connexions enable row level security;
revoke all on app_connexions from anon, authenticated;
grant select on app_connexions to authenticated;
drop policy if exists app_connexions_super_read on app_connexions;
create policy app_connexions_super_read on app_connexions for select to authenticated using (is_super());

-- Enregistre une connexion : la position GPS est obligatoire.
create or replace function log_login(
  p_key text, p_user_ref text, p_name text, p_role text, p_school_ref text, p_school_name text,
  p_lat double precision, p_lng double precision, p_acc double precision, p_ua text
) returns void language plpgsql security definer set search_path = public as $$
begin
  if p_lat is null or p_lng is null then
    raise exception 'Position GPS obligatoire';
  end if;
  insert into app_connexions(session_key,user_ref,user_name,role,school_ref,school_name,latitude,longitude,accuracy_m,user_agent)
  values (p_key,p_user_ref,left(p_name,120),p_role,p_school_ref,left(p_school_name,160),p_lat,p_lng,p_acc,left(p_ua,300))
  on conflict (session_key) do nothing;
end $$;

-- Enregistre l'heure de déconnexion (une seule fois par session ; la clé secrète n'est connue que de l'appareil).
create or replace function log_logout(p_key text, p_type text) returns void
language plpgsql security definer set search_path = public as $$
begin
  update app_connexions
     set logout_at = now(),
         logout_type = case when p_type in ('deconnexion','fermeture','expiree') then p_type else 'deconnexion' end
   where session_key = p_key and logout_at is null;
end $$;

-- Test de disponibilité du serveur (voyant vert / rouge dans l'application).
create or replace function ping_db() returns timestamptz
language sql security definer set search_path = public as $$ select now(); $$;

revoke all on function log_login(text,text,text,text,text,text,double precision,double precision,double precision,text) from public;
revoke all on function log_logout(text,text) from public;
revoke all on function ping_db() from public;
grant execute on function log_login(text,text,text,text,text,text,double precision,double precision,double precision,text) to anon, authenticated;
grant execute on function log_logout(text,text) to anon, authenticated;
grant execute on function ping_db() to anon, authenticated;

-- 3) Copies de sauvegarde (super administrateur uniquement) ---------------------------------------
create table if not exists app_backups (
  id bigserial primary key,
  saved_at timestamptz not null default now(),
  saved_by uuid default auth.uid(),
  size_bytes integer,
  data jsonb not null
);
alter table app_backups enable row level security;
revoke all on app_backups from anon, authenticated;
grant select on app_backups to authenticated;
drop policy if exists app_backups_super_read on app_backups;
create policy app_backups_super_read on app_backups for select to authenticated using (is_super());

-- Enregistre une copie et ne garde que les 30 dernières.
create or replace function save_backup(p_data jsonb) returns bigint
language plpgsql security definer set search_path = public as $$
declare new_id bigint;
begin
  if not is_super() then raise exception 'Réservé au super administrateur'; end if;
  insert into app_backups(size_bytes, data) values (octet_length(p_data::text), p_data) returning id into new_id;
  delete from app_backups where id not in (select id from app_backups order by saved_at desc limit 30);
  return new_id;
end $$;
revoke all on function save_backup(jsonb) from public;
grant execute on function save_backup(jsonb) to authenticated;

-- 4) À FAIRE À LA MAIN (une fois) -------------------------------------------------------------
-- a) Supabase > Authentication > Users > "Add user" : créer l'e-mail et le mot de passe du super administrateur du serveur.
-- b) Puis exécuter (en remplaçant l'e-mail) :
--    insert into super_admins(user_id) select id from auth.users where email = 'VOTRE_EMAIL' on conflict do nothing;
-- c) Rappel : informer les utilisateurs de la collecte de position, fixer une durée de conservation
--    (ex. : delete from app_connexions where login_at < now() - interval '12 months';).
