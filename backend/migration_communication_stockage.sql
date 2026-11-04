-- BILLIONS SCHOOL / DELTA SCHOOL — migration de communication et fichiers
-- À exécuter sur Supabase APRÈS le schéma de base et après revue des politiques RLS.
-- Les octets des fichiers ne sont PAS stockés dans PostgreSQL : seulement leurs métadonnées.
create table if not exists message_threads (
  id bigserial primary key,
  created_by uuid not null references profiles(id),
  school_id bigint references schools(id),
  thread_type text not null check (thread_type in ('direct','group','meeting')),
  title text,
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

create table if not exists thread_members (
  thread_id bigint not null references message_threads(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  primary key(thread_id,user_id)
);

create table if not exists thread_messages (
  id bigserial primary key,
  thread_id bigint not null references message_threads(id) on delete cascade,
  sender_id uuid not null references profiles(id),
  body text,
  message_type text not null default 'text'
    check (message_type in ('text','voice','file','system')),
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  check (body is not null or message_type in ('voice','file','system'))
);

create table if not exists message_receipts (
  message_id bigint not null references thread_messages(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  delivered_at timestamptz,
  read_at timestamptz,
  primary key(message_id,user_id)
);

-- Photos initiales (selfie) et changements historisés sans écraser les anciennes entrées.
create table if not exists profile_photo_history (
  id bigserial primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  storage_path text not null,
  source text not null check(source in ('selfie_initial','galerie','selfie_remplacement')),
  captured_at timestamptz,
  uploaded_at timestamptz not null default now(),
  is_current boolean not null default false,
  removed_at timestamptz,
  year_num int generated always as (extract(year from uploaded_at)::int) stored
);
create unique index if not exists one_current_photo_per_user
  on profile_photo_history(user_id) where is_current and removed_at is null;

-- Demandes d'ouverture et d'adhésion à un espace pédagogique.
create table if not exists learning_group_requests (
  id bigserial primary key,
  requester_id uuid not null references profiles(id),
  school_id bigint references schools(id),
  title text not null,
  subject text,
  description text,
  request_type text not null default 'open' check(request_type in ('open','join')),
  group_id bigint,
  status text not null default 'pending' check(status in ('pending','approved','rejected','cancelled')),
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists learning_groups (
  id bigserial primary key,
  request_id bigint references learning_group_requests(id),
  school_id bigint references schools(id),
  title text not null,
  subject text,
  description text,
  owner_id uuid not null references profiles(id),
  status text not null default 'open' check(status in ('open','closed')),
  created_at timestamptz not null default now()
);
alter table learning_group_requests
  add constraint learning_group_requests_group_fk
  foreign key(group_id) references learning_groups(id) on delete set null;
create table if not exists learning_group_members (
  group_id bigint not null references learning_groups(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  approved_by uuid references profiles(id),
  approved_at timestamptz,
  joined_at timestamptz not null default now(),
  primary key(group_id,user_id)
);

-- Réunions proposées par le chef, validées par le super administrateur.
create table if not exists school_meeting_requests (
  id bigserial primary key,
  school_id bigint not null references schools(id),
  requester_id uuid not null references profiles(id),
  title text not null,
  details text not null,
  starts_at timestamptz not null,
  audience text not null check(audience in ('parents','staff','parents_and_staff')),
  status text not null default 'pending' check(status in ('pending','approved','rejected','cancelled')),
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists school_meetings (
  id bigserial primary key,
  request_id bigint not null unique references school_meeting_requests(id),
  school_id bigint not null references schools(id),
  thread_id bigint references message_threads(id),
  created_at timestamptz not null default now()
);
create table if not exists school_meeting_invites (
  meeting_id bigint not null references school_meetings(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  invited_at timestamptz not null default now(),
  joined_at timestamptz,
  primary key(meeting_id,user_id)
);

-- Métadonnées de fichiers privés ; la limite applicative est strictement inférieure ou égale à 200 Go.
-- Autoriser >20 Go nécessite un stockage objet compatible multipart/resumable, pas un champ base64.
create table if not exists private_file_objects (
  id bigserial primary key,
  owner_id uuid not null references profiles(id),
  school_id bigint references schools(id),
  storage_bucket text not null default 'private-school-files',
  storage_path text not null unique,
  original_name text not null,
  mime_type text not null,
  size_bytes bigint not null check(size_bytes > 0 and size_bytes <= 200000000000),
  sha256 text,
  upload_status text not null default 'pending'
    check(upload_status in ('pending','uploading','complete','rejected','deleted')),
  allow_download boolean not null default true,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  deleted_at timestamptz
);
create table if not exists private_file_recipients (
  file_id bigint not null references private_file_objects(id) on delete cascade,
  recipient_id uuid not null references profiles(id) on delete cascade,
  sent_by uuid not null references profiles(id),
  sent_at timestamptz not null default now(),
  read_at timestamptz,
  downloaded_at timestamptz,
  primary key(file_id,recipient_id)
);

-- Journal d'audit append-only pour les opérations sensibles.
create table if not exists platform_audit_events (
  id bigserial primary key,
  actor_id uuid references profiles(id),
  subject_user_id uuid references profiles(id),
  school_id bigint references schools(id),
  event_type text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table message_threads enable row level security;
alter table thread_members enable row level security;
alter table thread_messages enable row level security;
alter table message_receipts enable row level security;
alter table profile_photo_history enable row level security;
alter table learning_group_requests enable row level security;
alter table learning_groups enable row level security;
alter table learning_group_members enable row level security;
alter table school_meeting_requests enable row level security;
alter table school_meetings enable row level security;
alter table school_meeting_invites enable row level security;
alter table private_file_objects enable row level security;
alter table private_file_recipients enable row level security;
alter table platform_audit_events enable row level security;

-- Membres d'une discussion uniquement ; super administrateur voit les journaux selon la politique déclarée.
create policy thread_members_read_self_or_super on thread_members for select using (
  user_id = auth.uid()
  or exists(select 1 from profiles p where p.id=auth.uid() and p.role='super')
);
create policy thread_messages_read_member_or_super on thread_messages for select using (
  exists(select 1 from thread_members tm where tm.thread_id=thread_messages.thread_id and tm.user_id=auth.uid() and tm.left_at is null)
  or exists(select 1 from profiles p where p.id=auth.uid() and p.role='super')
);
create policy thread_messages_insert_member on thread_messages for insert with check (
  sender_id=auth.uid()
  and exists(select 1 from thread_members tm where tm.thread_id=thread_messages.thread_id and tm.user_id=auth.uid() and tm.left_at is null)
);
create policy message_receipts_read_self_or_super on message_receipts for select using (
  user_id=auth.uid() or exists(select 1 from profiles p where p.id=auth.uid() and p.role='super')
);
create policy message_receipts_update_self on message_receipts for update using(user_id=auth.uid()) with check(user_id=auth.uid());

create policy photos_read_owner_or_super on profile_photo_history for select using (
  user_id=auth.uid() or exists(select 1 from profiles p where p.id=auth.uid() and p.role='super')
);
create policy photos_insert_owner on profile_photo_history for insert with check(user_id=auth.uid());

create policy group_requests_read_requester_school_or_super on learning_group_requests for select using (
  requester_id=auth.uid()
  or school_id=(select p.school_id from profiles p where p.id=auth.uid() and p.role='chef')
  or exists(select 1 from profiles p where p.id=auth.uid() and p.role='super')
);
create policy groups_read_members_school_or_super on learning_groups for select using (
  exists(select 1 from learning_group_members gm where gm.group_id=learning_groups.id and gm.user_id=auth.uid())
  or school_id=(select p.school_id from profiles p where p.id=auth.uid())
  or exists(select 1 from profiles p where p.id=auth.uid() and p.role='super')
);
create policy group_members_read_self_or_super on learning_group_members for select using (
  user_id=auth.uid() or exists(select 1 from profiles p where p.id=auth.uid() and p.role='super')
);

create policy meeting_requests_read_school_or_super on school_meeting_requests for select using (
  school_id=(select p.school_id from profiles p where p.id=auth.uid())
  or requester_id=auth.uid()
  or exists(select 1 from profiles p where p.id=auth.uid() and p.role='super')
);
create policy meetings_read_invited_school_or_super on school_meetings for select using (
  exists(select 1 from school_meeting_invites i where i.meeting_id=school_meetings.id and i.user_id=auth.uid())
  or exists(select 1 from profiles p where p.id=auth.uid() and p.role in ('chef','super') and (p.role='super' or p.school_id=school_meetings.school_id))
);
create policy meeting_invites_read_self_or_super on school_meeting_invites for select using (
  user_id=auth.uid() or exists(select 1 from profiles p where p.id=auth.uid() and p.role='super')
);

create policy private_files_read_owner_recipient_or_super on private_file_objects for select using (
  owner_id=auth.uid()
  or exists(select 1 from private_file_recipients r where r.file_id=private_file_objects.id and r.recipient_id=auth.uid())
  or exists(select 1 from profiles p where p.id=auth.uid() and p.role='super')
);
create policy private_files_insert_owner on private_file_objects for insert with check(owner_id=auth.uid());
create policy file_recipients_read_self_sender_or_super on private_file_recipients for select using (
  recipient_id=auth.uid() or sent_by=auth.uid()
  or exists(select 1 from profiles p where p.id=auth.uid() and p.role='super')
);
create policy audit_read_super on platform_audit_events for select using (
  exists(select 1 from profiles p where p.id=auth.uid() and p.role='super')
);
create policy audit_insert_authenticated on platform_audit_events for insert with check(actor_id=auth.uid());

-- IMPORTANT :
-- 1) Ajouter des politiques INSERT/UPDATE dédiées à chaque action via fonctions RPC serveur sécurisées.
-- 2) Ne jamais autoriser le navigateur à valider lui-même un groupe, une réunion ou un abonnement.
-- 3) Configurer un bucket privé et les politiques Storage, ainsi que les uploads resumable/multipart.
-- 4) Pour des fichiers >20 Go, vérifier la limite réelle du fournisseur et configurer le multipart côté serveur.
-- 5) La suppression doit respecter la durée légale de conservation, les sauvegardes et les obligations d'audit.
