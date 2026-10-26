-- Baseline: donna's own schema, the role the API connects as, and lock-down of Supabase's
-- Data API roles. Only the FastAPI backend (as donna_api) ever touches app data.

-- App tables live in "app", not "public". The Data API only exposes schemas listed in
-- supabase/config.toml's api.schemas, and "app" is never listed.
create schema if not exists app;

-- The role FastAPI connects as: login only, no superuser, createdb, createrole or
-- bypassrls. Its password is set outside migrations (supabase/seed.sql locally; the
-- dashboard SQL editor plus Doppler in the cloud), so no password is ever committed.
do $$
begin
  if not exists (select from pg_roles where rolname = 'donna_api') then
    create role donna_api with login;
  end if;
end
$$;

-- donna_api gets data access to everything migrations create in "app", and nothing else.
grant usage on schema app to donna_api;
alter default privileges for role postgres in schema app
  grant select, insert, update, delete on tables to donna_api;
alter default privileges for role postgres in schema app
  grant usage, select on sequences to donna_api;
alter default privileges for role postgres in schema app
  grant execute on functions to donna_api;

-- Supabase's Data API roles get nothing in "app"...
revoke all on schema app from public, anon, authenticated;

-- ...and nothing created in "public" later becomes reachable through them by default.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on functions from anon, authenticated;
