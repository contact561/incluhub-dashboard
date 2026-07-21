-- =============================================================================
-- ⚠️  DESTRUCTIVE OPERATION — READ BEFORE RUNNING  ⚠️
-- =============================================================================
--
-- IncluHub Dashboard — Reset test / development data
--
-- This script PERMANENTLY deletes operational and test data from the database.
--
-- • Intended ONLY for the current development / test Supabase project.
-- • DO NOT run in production.
-- • DO NOT add this script to automatic migrations.
-- • Run manually in the Supabase SQL Editor when you want a clean slate.
--
-- Preserved:
--   • One administrator auth user + matching profile (see v_preserved_admin_email)
--   • All schema objects (tables, enums, functions, RPCs, RLS, triggers)
--   • The six fixed rows in public.stages (Stage 0–5 master data)
--
-- Removed:
--   • All institutes, programs, students, educators, external members, teams,
--     portfolio/project workflow data, notifications, activity logs, and all
--     non-preserved Supabase Auth users.
--
-- Safe to re-run after a successful cleanup (idempotent DELETEs).
--
-- Recommended run order:
--   1. audit_test_data_before_reset.sql
--   2. reset_test_data.sql
--   3. verify_clean_database.sql
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Configuration — change only if your preserved administrator is different
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_preserved_admin_email constant text := 'admin@incluhub.test';
  v_admin_id uuid;
  v_admin_role public.user_role;
  v_admin_status text;
  v_auth_email text;
BEGIN
  -- Resolve preserved admin from auth.users + profiles (must be active admin)
  SELECT
    u.id,
    u.email,
    p.role,
    p.status
  INTO
    v_admin_id,
    v_auth_email,
    v_admin_role,
    v_admin_status
  FROM auth.users u
  INNER JOIN public.profiles p ON p.id = u.id
  WHERE lower(u.email) = lower(v_preserved_admin_email);

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION
      'Preserved admin % not found in auth.users with a matching profiles row. Aborting — no data deleted.',
      v_preserved_admin_email;
  END IF;

  IF v_admin_role IS DISTINCT FROM 'admin'::public.user_role THEN
    RAISE EXCEPTION
      'Preserved account % (id=%) has role=% — expected admin. Aborting — no data deleted.',
      v_preserved_admin_email, v_admin_id, v_admin_role;
  END IF;

  IF v_admin_status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION
      'Preserved account % (id=%) has status=% — expected active. Aborting — no data deleted.',
      v_preserved_admin_email, v_admin_id, v_admin_status;
  END IF;

  -- Store for later auth cleanup (transaction-local)
  CREATE TEMP TABLE IF NOT EXISTS _incluhub_reset_preserved_admin (
    id uuid PRIMARY KEY
  ) ON COMMIT DROP;

  TRUNCATE _incluhub_reset_preserved_admin;

  INSERT INTO _incluhub_reset_preserved_admin (id)
  VALUES (v_admin_id);

  RAISE NOTICE 'Preserved admin validated: % (id=%)', v_auth_email, v_admin_id;
END $$;

-- ---------------------------------------------------------------------------
-- 1. Notifications (deepest leaf: notification_recipients → notifications)
-- ---------------------------------------------------------------------------
DELETE FROM public.notification_recipients;
DELETE FROM public.notifications;

-- ---------------------------------------------------------------------------
-- 2. Projects (project_approvals, project_assignments → projects)
-- ---------------------------------------------------------------------------
DELETE FROM public.project_approvals;
DELETE FROM public.project_assignments;
DELETE FROM public.projects;

-- ---------------------------------------------------------------------------
-- 3. Portfolios (approvals, participants → outputs; leader_student_id is RESTRICT)
-- ---------------------------------------------------------------------------
DELETE FROM public.portfolio_approvals;
DELETE FROM public.portfolio_participants;
DELETE FROM public.portfolio_outputs;

-- ---------------------------------------------------------------------------
-- 4. Team workflow (stage progress, educators, members → teams)
-- ---------------------------------------------------------------------------
DELETE FROM public.team_stage_progress;
DELETE FROM public.team_educators;
DELETE FROM public.team_members;
DELETE FROM public.teams;

-- ---------------------------------------------------------------------------
-- 5. Program links (migration 005 tables, if present)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.program_enrollments') IS NOT NULL THEN
    DELETE FROM public.program_enrollments;
  END IF;

  IF to_regclass('public.program_institutes') IS NOT NULL THEN
    DELETE FROM public.program_institutes;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 6. Programs (references institutes; teams already removed)
-- ---------------------------------------------------------------------------
DELETE FROM public.programs;

-- ---------------------------------------------------------------------------
-- 7. Role-specific user tables (reference profiles + institutes with RESTRICT)
-- ---------------------------------------------------------------------------
DELETE FROM public.students;
DELETE FROM public.educators;
DELETE FROM public.external_members;

-- ---------------------------------------------------------------------------
-- 8. Activity logs (append-only audit history)
-- ---------------------------------------------------------------------------
DELETE FROM public.activity_logs;

-- ---------------------------------------------------------------------------
-- 9. Institutes (students/educators removed; created_by will SET NULL)
-- ---------------------------------------------------------------------------
DELETE FROM public.institutes;

-- ---------------------------------------------------------------------------
-- 10. Non-preserved profiles (orphan safety before auth cleanup)
--     profiles.id → auth.users(id) ON DELETE CASCADE, so auth delete is primary.
-- ---------------------------------------------------------------------------
DELETE FROM public.profiles
WHERE id NOT IN (SELECT id FROM _incluhub_reset_preserved_admin);

-- ---------------------------------------------------------------------------
-- 11. Supabase Auth users (except preserved admin)
--     Cascades to profiles for deleted users. Related auth.identities,
--     auth.sessions, and auth.refresh_tokens cascade from auth.users.
-- ---------------------------------------------------------------------------
DELETE FROM auth.users
WHERE id NOT IN (SELECT id FROM _incluhub_reset_preserved_admin);

COMMIT;
