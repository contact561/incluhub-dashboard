-- =============================================================================
-- IncluHub Education Management Dashboard
-- Migration 002: Table Grants for Supabase API roles
--
-- Run AFTER 001_initial_schema.sql
-- Fixes: "permission denied for table profiles" (403 / login profile lookup fails)
-- =============================================================================

grant usage on schema public to postgres, anon, authenticated, service_role;

-- Service role + postgres: full access (service role bypasses RLS)
grant all privileges on all tables in schema public to postgres, service_role;

-- Authenticated users: CRUD (RLS still applies)
grant select, insert, update, delete on all tables in schema public to authenticated;

-- Anonymous: read only where RLS allows (login page does not use this for profiles)
grant select on all tables in schema public to anon;

-- Sequences (if any are added later)
grant usage, select on all sequences in schema public to postgres, service_role, authenticated, anon;

-- Default privileges for future tables in this schema
alter default privileges in schema public
  grant all on tables to postgres, service_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;

alter default privileges in schema public
  grant select on tables to anon;

alter default privileges in schema public
  grant usage, select on sequences to postgres, service_role, authenticated, anon;

-- Enum types used by tables
grant usage on type user_role to postgres, anon, authenticated, service_role;
grant usage on type student_category to postgres, anon, authenticated, service_role;
grant usage on type educator_type to postgres, anon, authenticated, service_role;
grant usage on type external_member_type to postgres, anon, authenticated, service_role;
grant usage on type stage_status to postgres, anon, authenticated, service_role;
grant usage on type approval_status to postgres, anon, authenticated, service_role;
grant usage on type payment_status to postgres, anon, authenticated, service_role;
