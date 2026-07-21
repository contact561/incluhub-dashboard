-- =============================================================================
-- IncluHub Dashboard — Package A RPC integration checks (ROLLBACK safe)
-- =============================================================================
--
-- All mutations run inside BEGIN … ROLLBACK.
-- Requires at least one active Stage 2 team created via create_balanced_team.
--
-- Usage (Supabase SQL editor): paste and run the full script.
-- =============================================================================

BEGIN;

DO $$
DECLARE
  v_team_id uuid;
  v_before_stage integer;
  v_after_stage integer;
  v_portfolio_count integer;
  v_participant_count integer;
BEGIN
  SELECT id, current_stage_number
  INTO v_team_id, v_before_stage
  FROM teams
  WHERE status = 'active'
    AND current_stage_number = 2
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_team_id IS NULL THEN
    RAISE NOTICE 'SKIP: No active Stage 2 team found for RPC integration test.';
    RETURN;
  END IF;

  RAISE NOTICE 'Testing complete_bms_session for team %', v_team_id;

  PERFORM public.complete_bms_session(
    v_team_id::uuid,
    current_date::date,
    'Package A verification'::text
  );

  SELECT current_stage_number INTO v_after_stage
  FROM teams
  WHERE id = v_team_id;

  IF v_after_stage <> 3 THEN
    RAISE EXCEPTION 'FAIL: team current_stage_number expected 3, got %', v_after_stage;
  END IF;

  SELECT count(*) INTO v_portfolio_count
  FROM portfolio_outputs
  WHERE team_id = v_team_id;

  IF v_portfolio_count <> 3 THEN
    RAISE EXCEPTION 'FAIL: expected 3 portfolio outputs, got %', v_portfolio_count;
  END IF;

  SELECT count(*) INTO v_participant_count
  FROM portfolio_participants pp
  JOIN portfolio_outputs po ON po.id = pp.portfolio_output_id
  WHERE po.team_id = v_team_id;

  IF v_participant_count <> 9 THEN
    RAISE EXCEPTION 'FAIL: expected 9 participants, got %', v_participant_count;
  END IF;

  BEGIN
    PERFORM public.complete_bms_session(
      v_team_id::uuid,
      current_date::date,
      'duplicate attempt'::text
    );
    RAISE EXCEPTION 'FAIL: duplicate complete_bms_session should have been blocked';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%BMS session was already completed%' THEN
        RAISE EXCEPTION 'FAIL: unexpected duplicate error: %', SQLERRM;
      END IF;
      RAISE NOTICE 'PASS: duplicate complete_bms_session blocked';
  END;

  RAISE NOTICE 'PASS: Package A RPC integration checks completed for team %', v_team_id;
END $$;

ROLLBACK;
