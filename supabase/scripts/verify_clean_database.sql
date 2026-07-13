-- =============================================================================
-- IncluHub Dashboard — Verify database after test-data reset
-- =============================================================================
--
-- READ-ONLY. Does not modify any data.
--
-- Run this AFTER reset_test_data.sql to confirm the cleanup succeeded.
-- Intended for development / test databases only.
-- =============================================================================

WITH config AS (
  SELECT 'admin@incluhub.test'::text AS preserved_admin_email
),
preserved AS (
  SELECT
    u.id,
    u.email,
    p.full_name,
    p.role,
    p.status
  FROM config c
  INNER JOIN auth.users u ON lower(u.email) = lower(c.preserved_admin_email)
  INNER JOIN public.profiles p ON p.id = u.id
  WHERE p.role = 'admin'
    AND p.status = 'active'
),
counts AS (
  SELECT
    (SELECT count(*) FROM auth.users) AS auth_users,
    (SELECT count(*) FROM public.profiles) AS profiles,
    (SELECT count(*) FROM public.profiles WHERE role = 'admin') AS admin_profiles,
    (SELECT count(*) FROM public.students) AS students,
    (SELECT count(*) FROM public.educators) AS educators,
    (SELECT count(*) FROM public.external_members) AS external_members,
    (SELECT count(*) FROM public.institutes) AS institutes,
    (SELECT count(*) FROM public.programs) AS programs,
    (SELECT count(*) FROM public.teams) AS teams,
    (SELECT count(*) FROM public.portfolio_outputs) AS portfolio_outputs,
    (SELECT count(*) FROM public.projects) AS projects,
    (SELECT count(*) FROM public.notifications) AS notifications,
    (SELECT count(*) FROM public.activity_logs) AS activity_logs,
    (SELECT count(*) FROM public.stages) AS stages_total,
    (SELECT count(*) FROM public.stages WHERE stage_number BETWEEN 0 AND 5) AS stages_mvp,
  CASE
    WHEN to_regclass('public.program_enrollments') IS NULL THEN 0
    ELSE (SELECT count(*) FROM public.program_enrollments)
  END AS program_enrollments
)

-- ---------------------------------------------------------------------------
-- Summary checks (PASS / FAIL)
-- ---------------------------------------------------------------------------
SELECT
  'verification_summary' AS section,
  p.email AS preserved_admin_email,
  p.full_name AS preserved_admin_name,
  p.status AS preserved_admin_status,
  c.auth_users,
  c.profiles,
  CASE WHEN c.auth_users = 1 THEN 'PASS' ELSE 'FAIL' END AS auth_users_check,
  CASE WHEN c.profiles = 1 THEN 'PASS' ELSE 'FAIL' END AS profiles_check,
  CASE WHEN c.admin_profiles = 1 THEN 'PASS' ELSE 'FAIL' END AS admin_profiles_check,
  CASE WHEN p.id IS NOT NULL AND p.status = 'active' THEN 'PASS' ELSE 'FAIL' END AS admin_active_check,
  CASE WHEN c.students = 0 THEN 'PASS' ELSE 'FAIL' END AS students_check,
  CASE WHEN c.educators = 0 THEN 'PASS' ELSE 'FAIL' END AS educators_check,
  CASE WHEN c.external_members = 0 THEN 'PASS' ELSE 'FAIL' END AS external_members_check,
  CASE WHEN c.institutes = 0 THEN 'PASS' ELSE 'FAIL' END AS institutes_check,
  CASE WHEN c.programs = 0 THEN 'PASS' ELSE 'FAIL' END AS programs_check,
  CASE WHEN c.program_enrollments = 0 THEN 'PASS' ELSE 'FAIL' END AS program_enrollments_check,
  CASE WHEN c.teams = 0 THEN 'PASS' ELSE 'FAIL' END AS teams_check,
  CASE WHEN c.portfolio_outputs = 0 THEN 'PASS' ELSE 'FAIL' END AS portfolio_check,
  CASE WHEN c.projects = 0 THEN 'PASS' ELSE 'FAIL' END AS projects_check,
  CASE WHEN c.notifications = 0 THEN 'PASS' ELSE 'FAIL' END AS notifications_check,
  CASE WHEN c.activity_logs = 0 THEN 'PASS' ELSE 'FAIL' END AS activity_logs_check,
  CASE WHEN c.stages_total = 6 AND c.stages_mvp = 6 THEN 'PASS' ELSE 'FAIL' END AS stages_check
FROM counts c
LEFT JOIN preserved p ON true;

-- ---------------------------------------------------------------------------
-- Fixed stage master data (must still exist)
-- ---------------------------------------------------------------------------
SELECT
  'stages_master_data' AS section,
  stage_number,
  name,
  status,
  CASE
    WHEN stage_number = 0 AND name = 'Onboarding' THEN 'OK'
    WHEN stage_number = 1 AND name = 'Team Assignment' THEN 'OK'
    WHEN stage_number = 2 AND name = 'BMS Session' THEN 'OK'
    WHEN stage_number = 3 AND name = 'Portfolio Submission' THEN 'OK'
    WHEN stage_number = 4 AND name = 'Brand / Creative Project' THEN 'OK'
    WHEN stage_number = 5 AND name = 'Ecosystem / Application Unlock' THEN 'OK'
    ELSE 'UNEXPECTED'
  END AS expected_name_check
FROM public.stages
ORDER BY stage_number;

-- ---------------------------------------------------------------------------
-- Remaining auth accounts (should be only the preserved admin)
-- ---------------------------------------------------------------------------
WITH config AS (
  SELECT 'admin@incluhub.test'::text AS preserved_admin_email
)
SELECT
  'remaining_auth_users' AS section,
  u.id,
  u.email,
  p.full_name,
  p.role,
  p.status
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
ORDER BY u.email;

-- ---------------------------------------------------------------------------
-- Leftover operational rows (all should be zero)
-- ---------------------------------------------------------------------------
SELECT 'leftover_students' AS metric, count(*)::bigint AS value FROM public.students
UNION ALL
SELECT 'leftover_educators', count(*)::bigint FROM public.educators
UNION ALL
SELECT 'leftover_external_members', count(*)::bigint FROM public.external_members
UNION ALL
SELECT 'leftover_institutes', count(*)::bigint FROM public.institutes
UNION ALL
SELECT 'leftover_programs', count(*)::bigint FROM public.programs
UNION ALL
SELECT 'leftover_teams', count(*)::bigint FROM public.teams
UNION ALL
SELECT 'leftover_portfolio_outputs', count(*)::bigint FROM public.portfolio_outputs
UNION ALL
SELECT 'leftover_projects', count(*)::bigint FROM public.projects
UNION ALL
SELECT 'leftover_notifications', count(*)::bigint FROM public.notifications
UNION ALL
SELECT 'leftover_activity_logs', count(*)::bigint FROM public.activity_logs;
