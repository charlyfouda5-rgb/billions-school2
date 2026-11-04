-- Version 9 : traduction, langues, évaluation, préférences (idempotent)
alter table profiles add column if not exists lang_code text default 'fr';
alter table profiles add column if not exists country_iso text;
alter table profiles add column if not exists dial_code text;
alter table profiles add column if not exists currency_code text;
create table if not exists platform_languages(code text primary key, name_fr text not null, name_en text, native_name text not null, flag_iso text, added_by uuid references profiles, created_at timestamptz default now());
create table if not exists message_translations(id bigserial primary key, message_id bigint not null, target_lang text not null, translated_text text not null, provider text, created_at timestamptz default now(), unique(message_id,target_lang));
create table if not exists exchange_rate_overrides(currency_code text primary key, per_one_xaf numeric not null, updated_by uuid references profiles, updated_at timestamptz default now());
create table if not exists app_settings(key text primary key, value jsonb not null);   -- ex. translation = {"mode":"custom","url":"https://..."}
alter table platform_languages enable row level security;
create policy languages_read_all on platform_languages for select using(true);
create policy languages_super_write on platform_languages for all using((select role from profiles where id=auth.uid())='super');
alter table exchange_rate_overrides enable row level security;
create policy rates_read_all on exchange_rate_overrides for select using(true);
create policy rates_super_write on exchange_rate_overrides for all using((select role from profiles where id=auth.uid())='super');
-- Traduction côté serveur recommandée : hébergez un serveur compatible LibreTranslate et renseignez app_settings.translation.
