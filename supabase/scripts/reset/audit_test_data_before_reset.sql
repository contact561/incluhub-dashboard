-- =============================================================================
-- IncluHub Dashboard — Audit test data BEFORE reset
-- =============================================================================
--
-- READ-ONLY. Does not modify any data.
--
-- Run this first in the Supabase SQL Editor to review what will be removed.
-- Intended for development / test databases only.
-- =============================================================================

-- Change this email only if your preserved administrator is different.
-- Must match reset_test_data.sql exactly.
WITH config AS (
  SELECT 'admin@incluhub.test'::text AS preserved_admin_email
)

-- ---------------------------------------------------------------------------
-- Preserved administrator
-- ---------------------------------------------------------------------------
SELECT
  'preserved_admin' AS section,
  u.id AS auth_user_id,
  u.email AS auth_email,
  p.full_name,
  p.role,
  p.status AS profile_status,
  CASE
    WHEN u.id IS NULL THEN 'MISSING from auth.users'
    WHEN p.id IS NULL THEN 'MISSING matching profiles row'
    WHEN p.role IS DISTINCT FROM 'admin' THEN 'NOT admin'
    WHEN p.status IS DISTINCT FROM 'active' THEN 'NOT active'
    ELSE 'OK — will be preserved'
  END AS preservation_status
FROM config c
LEFT JOIN auth.users u ON lower(u.email) = lower(c.preserved_admin_email)
LEFT JOIN public.profiles p ON p.id = u.id;

-- ---------------------------------------------------------------------------
-- Auth and profile totals
-- ---------------------------------------------------------------------------
SELECT 'auth_users_total' AS metric, count(*)::bigint AS value
FROM auth.users;

SELECT 'profiles_total' AS metric, count(*)::bigint AS value
FROM public.profiles;

SELECT
  'profiles_by_role' AS section,
  role,
  count(*)::bigint AS user_count
FROM public.profiles
GROUP BY role
ORDER BY role;

-- ---------------------------------------------------------------------------
-- Operational data counts
-- ---------------------------------------------------------------------------
SELECT 'students_total' AS metric, count(*)::bigint AS value
FROM public.students;

SELECT
  'students_by_institute_and_category' AS section,
  coalesce(i.name, '(no institute)') AS institute_name,
  s.student_category,
  count(*)::bigint AS student_count
FROM public.students s
LEFT JOIN public.institutes i ON i.id = s.institute_id
GROUP BY i.name, s.student_category
ORDER BY institute_name, s.student_category;

SELECT 'educators_total' AS metric, count(*)::bigint AS value
FROM public.educators;

SELECT
  'educators_by_institute_and_type' AS section,
  coalesce(i.name, '(no institute)') AS institute_name,
  e.educator_type,
  count(*)::bigint AS educator_count
FROM public.educators e
LEFT JOIN public.institutes i ON i.id = e.institute_id
GROUP BY i.name, e.educator_type
ORDER BY institute_name, e.educator_type;

SELECT 'external_members_total' AS metric, count(*)::bigint AS value
FROM public.external_members;

SELECT 'institutes_total' AS metric, count(*)::bigint AS value
FROM public.institutes;

SELECT 'programs_total' AS metric, count(*)::bigint AS value
FROM public.programs;

SELECT
  'program_enrollments_total' AS metric,
  CASE
    WHEN to_regclass('public.program_enrollments') IS NULL THEN NULL
    ELSE (SELECT count(*)::bigint FROM public.program_enrollments)
  END AS value;

SELECT 'teams_total' AS metric, count(*)::bigint AS value
FROM public.teams;

SELECT 'portfolio_outputs_total' AS metric, count(*)::bigint AS value
FROM public.portfolio_outputs;

SELECT 'projects_total' AS metric, count(*)::bigint AS value
FROM public.projects;

SELECT 'notifications_total' AS metric, count(*)::bigint AS value
FROM public.notifications;

SELECT 'activity_logs_total' AS metric, count(*)::bigint AS value
FROM public.activity_logs;

-- ---------------------------------------------------------------------------
-- Supporting workflow tables (informational)
-- ---------------------------------------------------------------------------
SELECT 'notification_recipients_total' AS metric, count(*)::bigint AS value
FROM public.notification_recipients;

SELECT 'team_members_total' AS metric, count(*)::bigint AS value
FROM public.team_members;

SELECT 'team_educators_total' AS metric, count(*)::bigint AS value
FROM public.team_educators;

SELECT 'team_stage_progress_total' AS metric, count(*)::bigint AS value
FROM public.team_stage_progress;

SELECT 'portfolio_participants_total' AS metric, count(*)::bigint AS value
FROM public.portfolio_participants;

SELECT 'portfolio_approvals_total' AS metric, count(*)::bigint AS value
FROM public.portfolio_approvals;

SELECT 'project_assignments_total' AS metric, count(*)::bigint AS value
FROM public.project_assignments;

SELECT 'project_approvals_total' AS metric, count(*)::bigint AS value
FROM public.project_approvals;

SELECT
  'program_institutes_total' AS metric,
  CASE
    WHEN to_regclass('public.program_institutes') IS NULL THEN NULL
    ELSE (SELECT count(*)::bigint FROM public.program_institutes)
  END AS value;

-- ---------------------------------------------------------------------------
-- Fixed stages (should remain untouched by reset)
-- ---------------------------------------------------------------------------
SELECT
  'stages_master_data' AS section,
  stage_number,
  name,
  status
FROM public.stages
ORDER BY stage_number;

-- ---------------------------------------------------------------------------
-- Accounts that WILL be deleted (auth.users not matching preserved admin)
-- ---------------------------------------------------------------------------
WITH config AS (
  SELECT 'admin@incluhub.test'::text AS preserved_admin_email
),
preserved AS (
  SELECT u.id
  FROM config c
  INNER JOIN auth.users u ON lower(u.email) = lower(c.preserved_admin_email)
  INNER JOIN public.profiles p ON p.id = u.id
  WHERE p.role = 'admin'
    AND p.status = 'active'
)
SELECT
  'accounts_to_delete' AS section,
  u.id AS auth_user_id,
  u.email,
  p.full_name,
  p.role,
  p.status AS profile_status
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.id NOT IN (SELECT id FROM preserved)
ORDER BY u.email;

WITH config AS (
  SELECT 'admin@incluhub.test'::text AS preserved_admin_email
)
SELECT
  'accounts_to_delete_count' AS metric,
  count(*)::bigint AS value
FROM auth.users u
WHERE u.id NOT IN (
  SELECT p.id
  FROM config c
  INNER JOIN auth.users au ON lower(au.email) = lower(c.preserved_admin_email)
  INNER JOIN public.profiles p ON p.id = au.id
  WHERE p.role = 'admin'
    AND p.status = 'active'
);
