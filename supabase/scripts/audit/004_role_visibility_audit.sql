-- ============================================================================
-- 004_role_visibility_audit.sql
-- Simulated-auth RLS visibility checks for each fixture role.
--
-- Repaired 2026-07-14: no PL/pgSQL blocks; uses set_config + SET LOCAL role;
-- teams.team_name; students.student_category; test_user_not_found diagnostics.
--
-- SAFETY: BEGIN/ROLLBACK per role; transaction-local JWT claims only.
-- No data is created, modified, or deleted.
--
-- Run each role block separately in the SQL editor, or the whole file in psql.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Pattern for every role block:
--   1) fixture-user presence row (always runs; no transaction)
--   2) BEGIN → set_config('request.jwt.claims', …) → SET LOCAL role
--      → visibility SELECT → ROLLBACK
-- When the fixture auth user is missing, visibility rows show
-- diagnostic = 'test_user_not_found' instead of misleading zero counts.
-- ---------------------------------------------------------------------------

-- ============================ ADMIN =========================================
SELECT 'admin_fixture_user' AS section,
       v.expected_email,
       CASE
         WHEN u.id IS NULL THEN 'test_user_not_found'
         ELSE u.id::text
       END AS auth_user_id
FROM (VALUES ('admin@incluhub.test')) AS v(expected_email)
LEFT JOIN auth.users u ON u.email = v.expected_email;

BEGIN;
SELECT set_config(
  'request.jwt.claims',
  COALESCE(
    (
      SELECT json_build_object('sub', id, 'role', 'authenticated')::text
      FROM auth.users
      WHERE email = 'admin@incluhub.test'
    ),
    '{"role":"authenticated"}'
  ),
  true
);
SET LOCAL role = 'authenticated';

SELECT 'admin_visibility' AS section,
       CASE WHEN auth.uid() IS NULL THEN 'test_user_not_found' END AS diagnostic,
       (SELECT COUNT(*) FROM profiles) AS profiles,
       (SELECT COUNT(*) FROM teams) AS teams,
       (SELECT COUNT(*) FROM portfolio_outputs) AS portfolio_outputs,
       (SELECT COUNT(*) FROM portfolio_reviews) AS portfolio_reviews,
       (SELECT COUNT(*) FROM studio_bookings) AS studio_bookings;
ROLLBACK;

-- ==================== PHOTOGRAPHY EDUCATOR ==================================
SELECT 'photo_educator_fixture_user' AS section,
       v.expected_email,
       CASE
         WHEN u.id IS NULL THEN 'test_user_not_found'
         ELSE u.id::text
       END AS auth_user_id
FROM (VALUES ('photo.educator@incluhub.test')) AS v(expected_email)
LEFT JOIN auth.users u ON u.email = v.expected_email;

BEGIN;
SELECT set_config(
  'request.jwt.claims',
  COALESCE(
    (
      SELECT json_build_object('sub', id, 'role', 'authenticated')::text
      FROM auth.users
      WHERE email = 'photo.educator@incluhub.test'
    ),
    '{"role":"authenticated"}'
  ),
  true
);
SET LOCAL role = 'authenticated';

SELECT 'photo_educator_visibility' AS section,
       CASE WHEN auth.uid() IS NULL THEN 'test_user_not_found' END AS diagnostic,
       (SELECT COUNT(*) FROM team_educators te WHERE te.status = 'active') AS my_mappings,
       (SELECT COUNT(*) FROM teams) AS visible_teams,
       (SELECT COUNT(*) FROM portfolio_outputs
          WHERE workflow_status = 'pending_educator') AS visible_pending_educator,
       (SELECT COUNT(*) FROM portfolio_reviews) AS visible_reviews;
ROLLBACK;

-- ======================= MAKEUP EDUCATOR ====================================
SELECT 'makeup_educator_fixture_user' AS section,
       v.expected_email,
       CASE
         WHEN u.id IS NULL THEN 'test_user_not_found'
         ELSE u.id::text
       END AS auth_user_id
FROM (VALUES ('makeup.educator@incluhub.test')) AS v(expected_email)
LEFT JOIN auth.users u ON u.email = v.expected_email;

BEGIN;
SELECT set_config(
  'request.jwt.claims',
  COALESCE(
    (
      SELECT json_build_object('sub', id, 'role', 'authenticated')::text
      FROM auth.users
      WHERE email = 'makeup.educator@incluhub.test'
    ),
    '{"role":"authenticated"}'
  ),
  true
);
SET LOCAL role = 'authenticated';

SELECT 'makeup_educator_visibility' AS section,
       CASE WHEN auth.uid() IS NULL THEN 'test_user_not_found' END AS diagnostic,
       (SELECT COUNT(*) FROM team_educators te WHERE te.status = 'active') AS my_mappings,
       (SELECT COUNT(*) FROM portfolio_outputs
          WHERE workflow_status = 'pending_educator') AS visible_pending_educator;
ROLLBACK;

-- ===================== HAIRSTYLING EDUCATOR =================================
SELECT 'hair_educator_fixture_user' AS section,
       v.expected_email,
       CASE
         WHEN u.id IS NULL THEN 'test_user_not_found'
         ELSE u.id::text
       END AS auth_user_id
FROM (VALUES ('hair.educator@incluhub.test')) AS v(expected_email)
LEFT JOIN auth.users u ON u.email = v.expected_email;

BEGIN;
SELECT set_config(
  'request.jwt.claims',
  COALESCE(
    (
      SELECT json_build_object('sub', id, 'role', 'authenticated')::text
      FROM auth.users
      WHERE email = 'hair.educator@incluhub.test'
    ),
    '{"role":"authenticated"}'
  ),
  true
);
SET LOCAL role = 'authenticated';

SELECT 'hair_educator_visibility' AS section,
       CASE WHEN auth.uid() IS NULL THEN 'test_user_not_found' END AS diagnostic,
       (SELECT COUNT(*) FROM team_educators te WHERE te.status = 'active') AS my_mappings,
       (SELECT COUNT(*) FROM portfolio_outputs
          WHERE workflow_status = 'pending_educator') AS visible_pending_educator;
ROLLBACK;

-- ==================== PHOTOGRAPHY STUDENT 1 =================================
SELECT 'photo_student1_fixture_user' AS section,
       v.expected_email,
       CASE
         WHEN u.id IS NULL THEN 'test_user_not_found'
         ELSE u.id::text
       END AS auth_user_id
FROM (VALUES ('photo.student1@incluhub.test')) AS v(expected_email)
LEFT JOIN auth.users u ON u.email = v.expected_email;

BEGIN;
SELECT set_config(
  'request.jwt.claims',
  COALESCE(
    (
      SELECT json_build_object('sub', id, 'role', 'authenticated')::text
      FROM auth.users
      WHERE email = 'photo.student1@incluhub.test'
    ),
    '{"role":"authenticated"}'
  ),
  true
);
SET LOCAL role = 'authenticated';

SELECT 'photo_student1_visibility' AS section,
       CASE WHEN auth.uid() IS NULL THEN 'test_user_not_found' END AS diagnostic,
       (SELECT COUNT(*) FROM teams) AS visible_teams,
       (SELECT COUNT(*) FROM portfolio_outputs) AS visible_portfolios,
       (SELECT COUNT(*) FROM portfolio_outputs po
          JOIN students s ON s.id = po.leader_student_id
          WHERE s.user_id = auth.uid()) AS own_led_portfolios,
       (SELECT string_agg(po.workflow_status::text, ',' ORDER BY po.sequence_order)
          FROM portfolio_outputs po
          JOIN students s ON s.id = po.leader_student_id
          WHERE s.user_id = auth.uid()) AS own_portfolio_statuses,
       (SELECT COUNT(*) FROM teams t
          WHERE t.team_name ILIKE '%alpha%') AS sees_team_alpha;
ROLLBACK;

-- ======================= MAKEUP STUDENT 1 ===================================
SELECT 'makeup_student1_fixture_user' AS section,
       v.expected_email,
       CASE
         WHEN u.id IS NULL THEN 'test_user_not_found'
         ELSE u.id::text
       END AS auth_user_id
FROM (VALUES ('makeup.student1@incluhub.test')) AS v(expected_email)
LEFT JOIN auth.users u ON u.email = v.expected_email;

BEGIN;
SELECT set_config(
  'request.jwt.claims',
  COALESCE(
    (
      SELECT json_build_object('sub', id, 'role', 'authenticated')::text
      FROM auth.users
      WHERE email = 'makeup.student1@incluhub.test'
    ),
    '{"role":"authenticated"}'
  ),
  true
);
SET LOCAL role = 'authenticated';

SELECT 'makeup_student1_visibility' AS section,
       CASE WHEN auth.uid() IS NULL THEN 'test_user_not_found' END AS diagnostic,
       (SELECT COUNT(*) FROM teams) AS visible_teams,
       (SELECT string_agg(po.workflow_status::text, ',' ORDER BY po.sequence_order)
          FROM portfolio_outputs po
          JOIN students s ON s.id = po.leader_student_id
          WHERE s.user_id = auth.uid()) AS own_portfolio_statuses;
ROLLBACK;

-- ===================== HAIRSTYLING STUDENT 1 ================================
SELECT 'hair_student1_fixture_user' AS section,
       v.expected_email,
       CASE
         WHEN u.id IS NULL THEN 'test_user_not_found'
         ELSE u.id::text
       END AS auth_user_id
FROM (VALUES ('hair.student1@incluhub.test')) AS v(expected_email)
LEFT JOIN auth.users u ON u.email = v.expected_email;

BEGIN;
SELECT set_config(
  'request.jwt.claims',
  COALESCE(
    (
      SELECT json_build_object('sub', id, 'role', 'authenticated')::text
      FROM auth.users
      WHERE email = 'hair.student1@incluhub.test'
    ),
    '{"role":"authenticated"}'
  ),
  true
);
SET LOCAL role = 'authenticated';

SELECT 'hair_student1_visibility' AS section,
       CASE WHEN auth.uid() IS NULL THEN 'test_user_not_found' END AS diagnostic,
       (SELECT COUNT(*) FROM teams) AS visible_teams,
       (SELECT string_agg(po.workflow_status::text, ',' ORDER BY po.sequence_order)
          FROM portfolio_outputs po
          JOIN students s ON s.id = po.leader_student_id
          WHERE s.user_id = auth.uid()) AS own_portfolio_statuses;
ROLLBACK;

-- ============================= ANON =========================================
BEGIN;
SET LOCAL role = 'anon';

SELECT 'anon_visibility' AS section,
       (SELECT COUNT(*) FROM profiles) AS profiles,
       (SELECT COUNT(*) FROM teams) AS teams,
       (SELECT COUNT(*) FROM portfolio_outputs) AS portfolio_outputs;
ROLLBACK;
