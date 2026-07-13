-- =============================================================================
-- IncluHub Dashboard — Package A.1 verification (read-only)
-- =============================================================================

SELECT
  'start_team_stage_journey_exists' AS check_name,
  CASE
    WHEN to_regprocedure('public.start_team_stage_journey(uuid)') IS NOT NULL THEN 'PASS'
    ELSE 'FAIL'
  END AS result;

SELECT
  'start_team_stage_journey_security_definer' AS check_name,
  CASE
    WHEN p.prosecdef THEN 'PASS'
    ELSE 'FAIL'
  END AS result
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'start_team_stage_journey';

SELECT
  'start_team_stage_journey_grants' AS check_name,
  CASE
    WHEN bool_or(grantee = 'authenticated' AND privilege_type = 'EXECUTE') THEN 'PASS'
    ELSE 'FAIL'
  END AS result,
  coalesce(string_agg(grantee || ':' || privilege_type, ', '), 'none') AS grants
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name = 'start_team_stage_journey';

SELECT
  'teams_current_stage_nullable' AS check_name,
  CASE
    WHEN is_nullable = 'YES' THEN 'PASS'
    ELSE 'FAIL'
  END AS result
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'teams'
  AND column_name = 'current_stage_number';

SELECT
  'students_current_stage_nullable' AS check_name,
  CASE
    WHEN is_nullable = 'YES' THEN 'PASS'
    ELSE 'FAIL'
  END AS result
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'students'
  AND column_name = 'current_stage_number';

SELECT
  'not_enrolled_teams' AS check_name,
  'INFO' AS result,
  count(*)::text AS team_count
FROM teams t
WHERE t.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM team_stage_progress tsp WHERE tsp.team_id = t.id
  );

SELECT
  'enrolled_teams_stage_2' AS check_name,
  'INFO' AS result,
  count(*)::text AS team_count
FROM teams
WHERE status = 'active'
  AND current_stage_number = 2;
