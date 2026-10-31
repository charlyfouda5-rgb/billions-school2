-- BILLIONS SCHOOL / DELTA SCHOOL INTERNATIONAL — migration langues, traductions et devises
-- À exécuter dans Supabase SQL Editor après schema.sql et les migrations précédentes.
-- Les traductions de documents/vidéos nécessitent un worker/Edge Function relié à un fournisseur.

create table if not exists public.platform_languages (
  code text primary key,
  name text not null,
  native_name text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

insert into public.platform_languages(code,name,native_name,active)
values ('fr','French','Français',true),('en','English','English',true)
on conflict (code) do nothing;

create table if not exists public.user_language_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferred_language text not null default 'fr',
  preferred_currency text not null default 'XAF',
  updated_at timestamptz not null default now()
);

create table if not exists public.translation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_file_name text not null,
  source_storage_path text,
  source_mime_type text,
  target_language text not null,
  status text not null default 'queued' check (status in ('queued','processing','completed','failed','cancelled')),
  translated_storage_path text,
  detected_language text,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.currency_rate_cache (
  base_currency text not null default 'XAF',
  quote_currency text not null,
  rate numeric(20,8) not null check (rate > 0),
  provider text,
  observed_at timestamptz not null,
  expires_at timestamptz,
  primary key (base_currency, quote_currency)
);

alter table public.platform_languages enable row level security;
alter table public.user_language_preferences enable row level security;
alter table public.translation_jobs enable row level security;
alter table public.currency_rate_cache enable row level security;

drop policy if exists "Authenticated users can read active platform languages" on public.platform_languages;
create policy "Authenticated users can read active platform languages"
  on public.platform_languages for select to authenticated using (active = true);

drop policy if exists "Users can read own language preferences" on public.user_language_preferences;
create policy "Users can read own language preferences"
  on public.user_language_preferences for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users can insert own language preferences" on public.user_language_preferences;
create policy "Users can insert own language preferences"
  on public.user_language_preferences for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users can update own language preferences" on public.user_language_preferences;
create policy "Users can update own language preferences"
  on public.user_language_preferences for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can read own translation jobs" on public.translation_jobs;
create policy "Users can read own translation jobs"
  on public.translation_jobs for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users can create own translation jobs" on public.translation_jobs;
create policy "Users can create own translation jobs"
  on public.translation_jobs for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Authenticated users can read currency rates" on public.currency_rate_cache;
create policy "Authenticated users can read currency rates"
  on public.currency_rate_cache for select to authenticated using (true);

-- Sécurité : la création/suppression des langues et l'actualisation des taux doivent être
-- réservées à des Edge Functions/Admin APIs qui vérifient le rôle super-administrateur.
-- Ne jamais exposer la clé service_role dans le navigateur.
