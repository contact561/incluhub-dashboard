-- =============================================================================
-- IncluHub Dashboard — Package A verification (006_stage_bms_foundation)
-- =============================================================================
--
-- READ-ONLY checks for schema, grants, and RPC presence.
-- Does not modify live data.
--
-- For interactive RPC tests, use verify_package_a_rpc.sql in a transaction
-- that you ROLLBACK after inspection.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Stage 3 master name updated
-- ---------------------------------------------------------------------------
SELECT
  'stage_3_name' AS check_name,
  CASE
    WHEN name = 'Sequential Portfolio Production' THEN 'PASS'
    ELSE 'FAIL'
  END AS result,
  name AS actual_name
FROM stages
WHERE stage_number = 3;

-- ---------------------------------------------------------------------------
-- 2. BMS columns exist
-- ---------------------------------------------------------------------------
SELECT
  'bms_columns' AS check_name,
  CASE
    WHEN count(*) = 2 THEN 'PASS'
    ELSE 'FAIL'
  END AS result,
  string_agg(column_name, ', ' ORDER BY column_name) AS columns_found
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'team_stage_progress'
  AND column_name IN ('bms_session_date', 'bms_remarks');

-- ---------------------------------------------------------------------------
-- 3. Portfolio workflow enum exists with exact values
-- ---------------------------------------------------------------------------
SELECT
  'portfolio_workflow_enum' AS check_name,
  CASE
    WHEN array_agg(e.enumlabel ORDER BY e.enumsortorder) = array[
      'locked',
      'awaiting_booking',
      'awaiting_submission',
      'pending_educator',
      'pending_admin',
      'revision_required',
      'completed'
    ]::name[]
    THEN 'PASS'
    ELSE 'FAIL'
  END AS result,
  array_agg(e.enumlabel ORDER BY e.enumsortorder)::text AS enum_values
FROM pg_type t
JOIN pg_enum e ON e.enumtypid = t.oid
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
  AND t.typname = 'portfolio_workflow_status';

-- ---------------------------------------------------------------------------
-- 4. Portfolio workflow columns and indexes exist
-- ---------------------------------------------------------------------------
SELECT
  'portfolio_output_columns' AS check_name,
  CASE
    WHEN count(*) = 2 THEN 'PASS'
    ELSE 'FAIL'
  END AS result,
  string_agg(column_name, ', ' ORDER BY column_name) AS columns_found
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'portfolio_outputs'
  AND column_name IN ('sequence_order', 'workflow_status');

SELECT
  'portfolio_indexes' AS check_name,
  CASE
    WHEN count(*) >= 2 THEN 'PASS'
    ELSE 'FAIL'
  END AS result,
  string_agg(indexname, ', ' ORDER BY indexname) AS indexes_found
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'portfolio_outputs'
  AND indexname IN (
    'uq_portfolio_team_sequence_order',
    'uq_team_one_active_portfolio'
  );

SELECT
  'portfolio_approval_role_uniqueness' AS check_name,
  CASE
    WHEN count(*) = 1 THEN 'PASS'
    ELSE 'FAIL'
  END AS result,
  coalesce(max(indexname), 'missing') AS index_name
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'portfolio_approvals'
  AND indexname = 'uq_portfolio_approval_role_slot';

-- ---------------------------------------------------------------------------
-- 5. complete_bms_session execute grants
-- ---------------------------------------------------------------------------
SELECT
  'complete_bms_session_grants' AS check_name,
  CASE
    WHEN bool_or(
      grantee = 'authenticated' AND privilege_type = 'EXECUTE'
    ) THEN 'PASS'
    ELSE 'FAIL'
  END AS result,
  string_agg(grantee || ':' || privilege_type, ', ') AS grants
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name = 'complete_bms_session';

-- ---------------------------------------------------------------------------
-- 6–14. Post-BMS data checks (informational when no Stage 2 teams exist)
-- ---------------------------------------------------------------------------
SELECT
  'stage_2_teams_available' AS check_name,
  CASE WHEN count(*) > 0 THEN 'INFO' ELSE 'INFO' END AS result,
  count(*)::text AS stage_2_team_count
FROM teams
WHERE status = 'active'
  AND current_stage_number = 2;

SELECT
  'teams_in_stage_3' AS check_name,
  'INFO' AS result,
  count(*)::text AS stage_3_team_count
FROM teams
WHERE status = 'active'
  AND current_stage_number = 3;

SELECT
  'portfolio_outputs_per_stage_3_team' AS check_name,
  CASE
    WHEN count(*) = 0 THEN 'INFO'
    WHEN bool_and(portfolio_count = 3) THEN 'PASS'
    ELSE 'FAIL'
  END AS result,
  coalesce(string_agg(team_id::text || ':' || portfolio_count::text, ', '), 'none') AS details
FROM (
  SELECT team_id, count(*) AS portfolio_count
  FROM portfolio_outputs
  GROUP BY team_id
) counts;

SELECT
  'portfolio_workflow_statuses' AS check_name,
  CASE
    WHEN count(*) = 0 THEN 'INFO'
    WHEN count(*) FILTER (
      WHERE NOT (
        (sequence_order = 1 AND portfolio_type = 'photographer' AND workflow_status = 'awaiting_booking')
        OR (sequence_order = 2 AND portfolio_type = 'makeup_artist' AND workflow_status = 'locked')
        OR (sequence_order = 3 AND portfolio_type = 'hairstylist' AND workflow_status = 'locked')
      )
    ) = 0 THEN 'PASS'
    ELSE 'FAIL'
  END AS result,
  coalesce(
    string_agg(
      sequence_order::text || '=' || portfolio_type::text || ':' || workflow_status::text,
      ', ' ORDER BY team_id, sequence_order
    ),
    'none'
  ) AS details
FROM portfolio_outputs
WHERE workflow_status IS NOT NULL;

SELECT
  'portfolio_participants_count' AS check_name,
  CASE
    WHEN count(*) = 0 THEN 'INFO'
    WHEN count(*) % 9 = 0 THEN 'PASS'
    ELSE 'FAIL'
  END AS result,
  count(*)::text AS participant_rows
FROM portfolio_participants;

SELECT
  'portfolio_participants_roles' AS check_name,
  CASE
    WHEN count(*) = 0 THEN 'INFO'
    WHEN count(*) FILTER (WHERE leader_count <> 1 OR assistant_count <> 2) = 0 THEN 'PASS'
    ELSE 'FAIL'
  END AS result,
  coalesce(string_agg(portfolio_output_id::text || ':L' || leader_count || '/A' || assistant_count, ', '), 'none') AS details
FROM (
  SELECT
    portfolio_output_id,
    count(*) FILTER (WHERE participation_role = 'leader') AS leader_count,
    count(*) FILTER (WHERE participation_role = 'assistant') AS assistant_count
  FROM portfolio_participants
  GROUP BY portfolio_output_id
) role_counts;

-- ---------------------------------------------------------------------------
-- Student stage alignment for Stage 3 teams
-- ---------------------------------------------------------------------------
SELECT
  'stage_3_student_alignment' AS check_name,
  CASE
    WHEN count(*) = 0 THEN 'INFO'
    WHEN count(*) FILTER (WHERE s.current_stage_number <> 3) = 0 THEN 'PASS'
    ELSE 'FAIL'
  END AS result,
  count(*)::text AS students_on_stage_3_teams
FROM teams t
JOIN team_members tm ON tm.team_id = t.id AND tm.member_status = 'active'
JOIN students s ON s.id = tm.student_id
WHERE t.status = 'active'
  AND t.current_stage_number = 3;
