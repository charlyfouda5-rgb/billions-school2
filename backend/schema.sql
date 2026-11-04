-- DELTA SCHOOL — schéma PostgreSQL (Supabase) pour passer de la démo locale à une base distante.
create table schools(id bigserial primary key,name text not null,country text,status text default 'attente',plan text default 'Essai',expires_on date,note_delay_hours int default 24);
create table catalog(id bigserial primary key,kind text check(kind in('section','system','track','lang')),label text not null,unique(kind,label));
create table profiles(id uuid primary key references auth.users,full_name text,role text check(role in('super','chef','prof','comptable','censeur','eleve','parent')),school_id bigint references schools,active boolean default true,matricule text unique,follow_code text unique,class_id bigint);
create table classes(id bigserial primary key,school_id bigint references schools,name text,system text,section text,track text);
create table subjects(id bigserial primary key,school_id bigint references schools,name text,coef numeric);
create table grades(id bigserial primary key,school_id bigint references schools,student_id uuid references profiles,teacher_id uuid references profiles,subject text,coef numeric,score numeric check(score between 0 and 20),period text,kind text,created_at timestamptz default now());
create table parent_children(parent_id uuid references profiles,child_id uuid references profiles,primary key(parent_id,child_id));
create table finance(id bigserial primary key,school_id bigint references schools,kind text,label text,amount numeric,on_date date);
create table discipline(id bigserial primary key,school_id bigint references schools,student_id uuid references profiles,kind text,details text,on_date date);
create table messages(id bigserial primary key,sender uuid references profiles,recipient uuid references profiles,body text,created_at timestamptz default now());
create table audit_log(id bigserial primary key,actor uuid,action text,created_at timestamptz default now());
-- Sécurité côté serveur (exemples) : chaque utilisateur ne lit que son établissement.
alter table grades enable row level security;
create policy grades_read on grades for select using(
  student_id=auth.uid()
  or school_id=(select school_id from profiles where id=auth.uid()) and (select role from profiles where id=auth.uid()) in('chef','prof')
  or exists(select 1 from parent_children pc where pc.parent_id=auth.uid() and pc.child_id=grades.student_id));
create policy grades_edit_window on grades for update using(teacher_id=auth.uid() and now()-created_at < (select make_interval(hours=>note_delay_hours) from schools where id=grades.school_id));
-- À faire de même pour finance (comptable+chef), discipline (censeur+chef), messages (expéditeur/destinataire), etc.


-- Politiques complémentaires de cloisonnement multi-établissements.
-- À exécuter après création des tables et adaptation des rôles côté Supabase.
alter table profiles enable row level security;
alter table classes enable row level security;
alter table subjects enable row level security;
alter table parent_children enable row level security;
alter table finance enable row level security;
alter table discipline enable row level security;
alter table messages enable row level security;

create policy profiles_read_scoped on profiles for select using (
  id = auth.uid()
  or exists (select 1 from profiles me where me.id = auth.uid() and me.role = 'super')
  or (school_id = (select p.school_id from profiles p where p.id = auth.uid())
      and (select p.role from profiles p where p.id = auth.uid()) in ('chef','prof','comptable','censeur'))
  or exists (select 1 from parent_children pc where pc.parent_id = auth.uid() and pc.child_id = profiles.id)
);
create policy classes_read_scoped on classes for select using (
  school_id = (select p.school_id from profiles p where p.id = auth.uid())
  or exists (select 1 from parent_children pc join profiles child on child.id=pc.child_id
             where pc.parent_id=auth.uid() and child.school_id=classes.school_id)
  or exists (select 1 from profiles p where p.id=auth.uid() and p.role='super')
);
create policy subjects_read_scoped on subjects for select using (
  school_id = (select p.school_id from profiles p where p.id = auth.uid())
  or exists (select 1 from profiles p where p.id=auth.uid() and p.role='super')
);
create policy parent_children_read_own on parent_children for select using (
  parent_id = auth.uid()
  or exists (select 1 from profiles p where p.id=auth.uid() and p.role='super')
);
create policy finance_read_scoped on finance for select using (
  school_id = (select p.school_id from profiles p where p.id=auth.uid())
  and (select p.role from profiles p where p.id=auth.uid()) in ('chef','comptable')
  or exists (select 1 from profiles p where p.id=auth.uid() and p.role='super')
);
create policy discipline_read_scoped on discipline for select using (
  school_id = (select p.school_id from profiles p where p.id=auth.uid())
  and (select p.role from profiles p where p.id=auth.uid()) in ('chef','censeur')
  or exists (select 1 from parent_children pc where pc.parent_id=auth.uid() and pc.child_id=discipline.student_id)
  or exists (select 1 from profiles p where p.id=auth.uid() and p.role='super')
);
create policy messages_read_participants on messages for select using (
  sender = auth.uid() or recipient = auth.uid()
  or exists (select 1 from profiles p where p.id=auth.uid() and p.role='super')
);


-- Codes élèves individuels : le code est attribué par l'établissement et visible
-- dans l'espace du super administrateur. Le code sert d'identifiant, mais ne remplace
-- jamais le mot de passe. Un élève ne peut lire que son propre profil et ses propres notes.
create unique index if not exists profiles_follow_code_unique
  on profiles(follow_code) where follow_code is not null;

-- Politique explicite de lecture du dossier personnel de l'élève.
-- À fusionner avec les politiques de lecture existantes si le script est déjà appliqué.
create policy profiles_student_read_self on profiles for select using (
  id = auth.uid() and role = 'eleve'
);

-- Ressources pédagogiques envoyées par un professeur à un ou plusieurs élèves.
create table if not exists learning_resources (
  id bigserial primary key,
  school_id bigint not null references schools(id),
  sender uuid not null references profiles(id),
  title text not null,
  note text,
  storage_path text,
  file_name text,
  mime_type text,
  allow_download boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists learning_resource_recipients (
  resource_id bigint not null references learning_resources(id) on delete cascade,
  student_id uuid not null references profiles(id),
  read_at timestamptz,
  downloaded_at timestamptz,
  primary key(resource_id, student_id)
);
alter table learning_resources enable row level security;
alter table learning_resource_recipients enable row level security;
create policy learning_resources_read_scoped on learning_resources for select using (
  sender = auth.uid()
  or exists (select 1 from profiles p where p.id=auth.uid() and p.role='super')
  or exists (select 1 from learning_resource_recipients rr where rr.resource_id=learning_resources.id and rr.student_id=auth.uid())
);
create policy learning_resources_teacher_insert on learning_resources for insert with check (
  sender = auth.uid()
  and exists (select 1 from profiles p where p.id=auth.uid() and p.role='prof' and p.school_id=subscription_renewal_requests.school_id)
);
create policy learning_resource_recipients_read_scoped on learning_resource_recipients for select using (
  student_id=auth.uid()
  or exists (select 1 from learning_resources lr where lr.id=resource_id and lr.sender=auth.uid())
  or exists (select 1 from profiles p where p.id=auth.uid() and p.role='super')
);
create policy learning_resource_recipients_update_self on learning_resource_recipients for update using (
  student_id=auth.uid()
) with check (student_id=auth.uid());
create policy learning_resource_recipients_teacher_insert on learning_resource_recipients for insert with check (
  exists (select 1 from learning_resources lr join profiles teacher on teacher.id=lr.sender join profiles student on student.id=student_id
          where lr.id=resource_id and lr.sender=auth.uid() and teacher.role='prof' and student.role='eleve'
          and student.school_id=lr.school_id and teacher.school_id=lr.school_id)
);
-- Pour les fichiers réels, utiliser un bucket privé Supabase Storage et des URLs signées,
-- ne jamais rendre le bucket public. Le super administrateur dispose de vues de suivi,
-- tandis que les règles ci-dessus limitent la lecture des contenus aux personnes autorisées.

-- Historique des connexions/déconnexions et positions explicitement partagées.
-- Les coordonnées sont optionnelles : le navigateur peut refuser la géolocalisation.
create table if not exists access_sessions (
  id bigserial primary key,
  user_id uuid not null references profiles(id),
  school_id bigint references schools(id),
  login_at timestamptz not null default now(),
  logout_at timestamptz,
  location_status text not null default 'non_partagee'
    check (location_status in ('autorisee','refusee','non_partagee','indisponible')),
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  accuracy_m double precision,
  created_at timestamptz not null default now(),
  check ((latitude is null and longitude is null) or (latitude is not null and longitude is not null))
);
alter table access_sessions enable row level security;
create policy access_sessions_read_self on access_sessions for select using (user_id = auth.uid());
create policy access_sessions_insert_self on access_sessions for insert with check (user_id = auth.uid());
create policy access_sessions_update_self on access_sessions for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy access_sessions_super_read on access_sessions for select using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'super')
);
-- En production, enregistrer les événements via une fonction serveur sécurisée,
-- limiter l'accès aux coordonnées aux rôles autorisés et définir une durée de conservation.


-- Abonnements et réactivation manuelle des établissements.
alter table schools add column if not exists renewed_at timestamptz;
alter table schools add column if not exists activated_at timestamptz;
alter table schools add column if not exists suspended_at timestamptz;
create table if not exists subscription_renewal_requests(
 id bigserial primary key, school_id bigint not null references schools(id), requested_by uuid references profiles(id),
 payment_reference text, status text not null default 'pending' check(status in('pending','approved','rejected')),
 requested_at timestamptz not null default now(), reviewed_at timestamptz, reviewed_by uuid references profiles(id), notes text
);
create table if not exists tutor_profiles(
 id bigserial primary key, user_id uuid not null unique references profiles(id), first_name text not null, last_name text not null, education_level text,
 subjects text[] not null default '{}', region text, city text, quarter text, teaching_mode text, price_description text, orange_money_private text,
 payment_sender text, selfie_path text, status text not null default 'pending' check(status in('pending','active','rejected','blocked')),
 initial_fee numeric default 300, monthly_fee numeric default 5000, expires_on date, renewed_at timestamptz, created_at timestamptz default now()
);
create table if not exists tutor_conversations(
 id bigserial primary key, tutor_id bigint not null references tutor_profiles(id), client_id uuid not null references profiles(id),
 created_at timestamptz default now(), reveal_client_requested_at timestamptz, reveal_tutor_requested_at timestamptz, reveal_approved_at timestamptz, reveal_approved_by uuid references profiles(id)
);
create table if not exists tutor_conversation_messages(
 id bigserial primary key, conversation_id bigint not null references tutor_conversations(id) on delete cascade, sender uuid not null references profiles(id),
 body text, media_path text, media_type text, created_at timestamptz default now()
);
-- Ces tables contiennent des données personnelles et doivent être complétées par des politiques RLS strictes.
alter table subscription_renewal_requests enable row level security;
alter table tutor_profiles enable row level security;
alter table tutor_conversations enable row level security;
alter table tutor_conversation_messages enable row level security;

-- Politiques RLS complémentaires : à tester dans un projet Supabase de test avant production.
-- Les contacts privés sont séparés du profil public afin que les familles ne puissent pas
-- récupérer les numéros via une simple requête de liste.
alter table tutor_profiles drop column if exists orange_money_private;
alter table tutor_profiles drop column if exists payment_sender;
create table if not exists tutor_private_contacts(
 tutor_id bigint primary key references tutor_profiles(id) on delete cascade,
 orange_money_private text,
 payment_sender text,
 phone_private text,
 updated_at timestamptz not null default now()
);
alter table tutor_private_contacts enable row level security;
create policy tutor_profiles_public_listing on tutor_profiles for select using (
 status='active' and expires_on >= current_date
 or user_id=auth.uid()
 or exists(select 1 from profiles p where p.id=auth.uid() and p.role='super')
);
create policy tutor_profiles_owner_insert on tutor_profiles for insert with check (user_id=auth.uid() and status='pending' and expires_on is null);
create policy tutor_profiles_super_update on tutor_profiles for update using (
 exists(select 1 from profiles p where p.id=auth.uid() and p.role='super')
);
create policy tutor_private_contacts_private_read on tutor_private_contacts for select using (
 exists(select 1 from tutor_profiles t where t.id=tutor_id and t.user_id=auth.uid())
 or exists(select 1 from profiles p where p.id=auth.uid() and p.role='super')
);
create policy tutor_private_contacts_super_insert on tutor_private_contacts for insert with check (
 exists(select 1 from profiles p where p.id=auth.uid() and p.role='super')
 or exists(select 1 from tutor_profiles t where t.id=tutor_id and t.user_id=auth.uid())
);
create policy tutor_conversations_participant_read on tutor_conversations for select using (
 client_id=auth.uid() or exists(select 1 from tutor_profiles t where t.id=tutor_id and t.user_id=auth.uid())
 or exists(select 1 from profiles p where p.id=auth.uid() and p.role='super')
);
create policy tutor_conversations_client_insert on tutor_conversations for insert with check (client_id=auth.uid());
create policy tutor_conversation_messages_participant_read on tutor_conversation_messages for select using (
 exists(select 1 from tutor_conversations c join tutor_profiles t on t.id=c.tutor_id where c.id=conversation_id and (c.client_id=auth.uid() or t.user_id=auth.uid()))
 or exists(select 1 from profiles p where p.id=auth.uid() and p.role='super')
);
create policy tutor_conversation_messages_participant_insert on tutor_conversation_messages for insert with check (
 sender=auth.uid() and exists(select 1 from tutor_conversations c join tutor_profiles t on t.id=c.tutor_id where c.id=conversation_id and (c.client_id=auth.uid() or t.user_id=auth.uid()))
);
create policy renewal_requests_super_or_own_chef_read on subscription_renewal_requests for select using (
 exists(select 1 from profiles p where p.id=auth.uid() and p.role='super')
 or exists(select 1 from profiles p where p.id=auth.uid() and p.role='chef' and p.school_id=subscription_renewal_requests.school_id)
);
create policy renewal_requests_chef_insert on subscription_renewal_requests for insert with check (
 requested_by=auth.uid() and exists(select 1 from profiles p where p.id=auth.uid() and p.role='chef' and p.school_id=subscription_renewal_requests.school_id)
);
create policy renewal_requests_super_update on subscription_renewal_requests for update using (
 exists(select 1 from profiles p where p.id=auth.uid() and p.role='super')
);


-- =====================================================================
-- Compléments DELTA SCHOOL (fusion) : inscriptions, numéros, photos, domicile, périodes
-- =====================================================================
alter table schools add column if not exists renewed_at timestamptz;
alter table schools add column if not exists note_delay_hours int default 24;
alter table schools add column if not exists period_types text[] default '{Séquences,Trimestres,Semestres}';
alter table schools add column if not exists titular_sees_all boolean default true;
-- statut d'un établissement : 'attente' | 'actif' | 'bloque' (abonnement expiré, bloqué automatiquement) | 'suspendu'
alter table profiles add column if not exists follow_code text unique;   -- numéro de suivi de l'élève (saisi par le parent)
alter table profiles add column if not exists matricule text unique;
alter table profiles add column if not exists phone text unique;
alter table profiles add column if not exists class_id bigint references classes;

create table if not exists signup_requests(
  id bigserial primary key, kind text check(kind in('user','staff','rep')), account_type text,
  full_name text, first_name text, phone text, selfie_path text, pay_operator text, pay_number text, fee_fcfa int,
  status text default 'pending' check(status in('pending','refused','accepted','filtre','access','active')),
  monthly_fcfa int, acknowledged boolean default false, school_name text, details jsonb, created_at timestamptz default now());
create table if not exists used_numbers(num text primary key, request_id bigint references signup_requests, kind text);   -- un numéro = un seul compte
create table if not exists number_alerts(id bigserial primary key, num text, who text, field text, resolved boolean default false, created_at timestamptz default now());
create table if not exists user_photos(id bigserial primary key, user_id uuid references profiles, school_id bigint references schools,
  storage_path text not null, is_current boolean default true, deleted_by_user boolean default false, created_at timestamptz default now());   -- jamais supprimée physiquement
create table if not exists staff_access_requests(id bigserial primary key, request_id bigint references signup_requests, school_id bigint references schools,
  status text default 'pending', read_by_super boolean default false, created_at timestamptz default now());
create table if not exists tutor_domicile_requests(id bigserial primary key, client_id uuid references profiles, tutor_id bigint, status text default 'request'
  check(status in('request','proposed','client_ok','authorized','closed')), tutor_consent boolean, thread jsonb default '[]', created_at timestamptz default now());

alter table user_photos enable row level security;
create policy photos_own_current on user_photos for select using(user_id=auth.uid() and is_current and not deleted_by_user);
create policy photos_super_all on user_photos for select using((select role from profiles where id=auth.uid())='super');
create policy photos_chef_school on user_photos for select using(
  school_id=(select school_id from profiles where id=auth.uid()) and (select role from profiles where id=auth.uid())='chef');
alter table signup_requests enable row level security;
create policy signup_super_all on signup_requests for all using((select role from profiles where id=auth.uid())='super');
alter table tutor_domicile_requests enable row level security;
create policy domicile_parties_read on tutor_domicile_requests for select using(client_id=auth.uid() or (select role from profiles where id=auth.uid())='super');
-- Blocage automatique des abonnements expirés : planifier (pg_cron) une fonction qui passe schools.status à 'bloque'
-- quand expires_on < current_date, et tutor_profiles.status à 'blocked' ; la réactivation reste manuelle (super administrateur).
