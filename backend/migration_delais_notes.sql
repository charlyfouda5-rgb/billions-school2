-- BILLIONS SCHOOL / DELTA SCHOOL — gestion des échéances de saisie des notes
-- À appliquer sur Supabase après schema.sql. Les contrôles d'autorisation doivent rester côté serveur.

alter table schools
  add column if not exists grade_entry_deadline timestamptz,
  add column if not exists grade_entry_deadline_set_by uuid references profiles(id),
  add column if not exists grade_entry_deadline_set_at timestamptz;

create table if not exists grade_entry_unlocks (
  id bigserial primary key,
  school_id bigint not null references schools(id) on delete cascade,
  teacher_id uuid not null references profiles(id) on delete cascade,
  authorized_by uuid not null references profiles(id),
  reason text,
  authorized_at timestamptz not null default now(),
  active boolean not null default true
);
create unique index if not exists grade_entry_unlocks_one_active_per_teacher
  on grade_entry_unlocks(school_id, teacher_id) where active = true;

create table if not exists grade_entry_unlock_requests (
  id bigserial primary key,
  school_id bigint not null references schools(id) on delete cascade,
  teacher_id uuid not null references profiles(id) on delete cascade,
  reason text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  requested_at timestamptz not null default now(),
  decided_by uuid references profiles(id),
  decided_at timestamptz,
  decision_note text
);
create index if not exists grade_entry_unlock_requests_pending_idx
  on grade_entry_unlock_requests(school_id, status, requested_at desc);

create table if not exists grade_entry_delay_events (
  id bigserial primary key,
  school_id bigint not null references schools(id) on delete cascade,
  teacher_id uuid references profiles(id) on delete set null,
  teacher_profile_snapshot jsonb not null default '{}'::jsonb,
  deadline_at timestamptz,
  event_type text not null check (event_type in ('deadline_missed','late_attempt','unlock_requested','unlock_approved','unlock_rejected','disciplinary_decision')),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists grade_entry_delay_events_school_idx
  on grade_entry_delay_events(school_id, created_at desc);

alter table grade_entry_unlocks enable row level security;
alter table grade_entry_unlock_requests enable row level security;
alter table grade_entry_delay_events enable row level security;

-- Lecture : le professeur voit ses demandes, le chef voit celles de son établissement,
-- le super administrateur voit l'ensemble. Les insertions et décisions sont faites par RPC sécurisées.
create policy grade_unlock_requests_read_scoped on grade_entry_unlock_requests
for select using (
  teacher_id = auth.uid()
  or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'super')
  or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'chef' and p.school_id = grade_entry_unlock_requests.school_id)
);
create policy grade_unlocks_read_scoped on grade_entry_unlocks
for select using (
  teacher_id = auth.uid()
  or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'super')
  or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'chef' and p.school_id = grade_entry_unlocks.school_id)
);
create policy grade_delay_events_read_scoped on grade_entry_delay_events
for select using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'super')
  or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'chef' and p.school_id = grade_entry_delay_events.school_id)
  or teacher_id = auth.uid()
);

-- Le délai est vérifié sur le serveur pour empêcher tout contournement du navigateur.
-- Une note ne peut être créée après l'échéance que si une autorisation active existe.
create or replace function public.teacher_can_enter_grades(p_school_id bigint, p_teacher_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles p
    join schools s on s.id = p.school_id
    where p.id = p_teacher_id
      and p.role = 'prof'
      and p.school_id = p_school_id
      and p.active = true
      and (
        s.grade_entry_deadline is null
        or now() <= s.grade_entry_deadline
        or exists (
          select 1 from grade_entry_unlocks u
          where u.school_id = p_school_id and u.teacher_id = p_teacher_id and u.active = true
        )
      )
  );
$$;
revoke all on function public.teacher_can_enter_grades(bigint, uuid) from public;
grant execute on function public.teacher_can_enter_grades(bigint, uuid) to authenticated;

-- À appeler depuis une Edge Function/RPC contrôlée lors de chaque INSERT/UPDATE/DELETE de note.
-- Ne pas se fier uniquement à la validation côté navigateur. Les sanctions sont des décisions humaines
-- du chef d'établissement et doivent être consignées séparément dans le journal d'audit.
