-- =============================================================================
-- IncluHub Dashboard — Package A.1 RPC integration checks (ROLLBACK safe)
-- =============================================================================
-- Requires an active unenrolled team with three members and educator mappings.
-- Run as admin session context where possible for item 6.
-- =============================================================================

BEGIN;

DO $$
DECLARE
  v_team_id uuid;
  v_progress_count integer;
  v_portfolio_count integer;
  v_team_stage integer;
  v_student_stage_count integer;
BEGIN
  SELECT t.id
  INTO v_team_id
  FROM teams t
  WHERE t.status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM team_stage_progress tsp WHERE tsp.team_id = t.id
    )
    AND (
      SELECT count(*)
      FROM team_members tm
      WHERE tm.team_id = t.id
        AND tm.member_status = 'active'
    ) = 3
  ORDER BY t.created_at DESC
  LIMIT 1;

  IF v_team_id IS NULL THEN
    RAISE NOTICE 'SKIP: No valid unenrolled team found for RPC integration test.';
    RETURN;
  END IF;

  RAISE NOTICE 'Testing start_team_stage_journey for team %', v_team_id;

  PERFORM public.start_team_stage_journey(v_team_id::uuid);

  SELECT count(*) INTO v_progress_count
  FROM team_stage_progress
  WHERE team_id = v_team_id;

  IF v_progress_count <> 6 THEN
    RAISE EXCEPTION 'FAIL: expected 6 stage progress rows, got %', v_progress_count;
  END IF;

  IF EXISTS (
    SELECT 1 FROM team_stage_progress
    WHERE team_id = v_team_id AND stage_number = 0 AND status <> 'completed'
  ) THEN
    RAISE EXCEPTION 'FAIL: Stage 0 should be completed';
  END IF;

  IF EXISTS (
    SELECT 1 FROM team_stage_progress
    WHERE team_id = v_team_id AND stage_number = 1 AND status <> 'completed'
  ) THEN
    RAISE EXCEPTION 'FAIL: Stage 1 should be completed';
  END IF;

  IF EXISTS (
    SELECT 1 FROM team_stage_progress
    WHERE team_id = v_team_id AND stage_number = 2 AND status <> 'in_progress'
  ) THEN
    RAISE EXCEPTION 'FAIL: Stage 2 should be in_progress';
  END IF;

  IF EXISTS (
    SELECT 1 FROM team_stage_progress
    WHERE team_id = v_team_id
      AND stage_number IN (3, 4, 5)
      AND status <> 'locked'
  ) THEN
    RAISE EXCEPTION 'FAIL: Stages 3-5 should be locked';
  END IF;

  SELECT current_stage_number INTO v_team_stage
  FROM teams
  WHERE id = v_team_id;

  IF v_team_stage <> 2 THEN
    RAISE EXCEPTION 'FAIL: team current_stage_number expected 2, got %', v_team_stage;
  END IF;

  SELECT count(*) INTO v_student_stage_count
  FROM team_members tm
  JOIN students s ON s.id = tm.student_id
  WHERE tm.team_id = v_team_id
    AND tm.member_status = 'active'
    AND s.current_stage_number = 2;

  IF v_student_stage_count <> 3 THEN
    RAISE EXCEPTION 'FAIL: expected 3 students at stage 2, got %', v_student_stage_count;
  END IF;

  SELECT count(*) INTO v_portfolio_count
  FROM portfolio_outputs
  WHERE team_id = v_team_id;

  IF v_portfolio_count <> 0 THEN
    RAISE EXCEPTION 'FAIL: no portfolio outputs should be created, got %', v_portfolio_count;
  END IF;

  BEGIN
    PERFORM public.start_team_stage_journey(v_team_id::uuid);
    RAISE EXCEPTION 'FAIL: duplicate enrollment should have been blocked';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%already has an active stage journey%' THEN
        RAISE EXCEPTION 'FAIL: unexpected duplicate error: %', SQLERRM;
      END IF;
      RAISE NOTICE 'PASS: duplicate enrollment blocked';
  END;

  RAISE NOTICE 'PASS: Package A.1 RPC integration checks completed for team %', v_team_id;
END $$;

ROLLBACK;
