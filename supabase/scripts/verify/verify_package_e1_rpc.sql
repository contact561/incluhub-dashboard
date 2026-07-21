-- =============================================================================
-- Package E1 disposable workflow, permission, idempotency, and RLS checks
-- ALL CHANGES ARE ROLLED BACK.
-- Requires one active enrolled team with three active members and educators.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION pg_temp.set_auth_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', p_user_id::text, true);
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', p_user_id::text)::text,
    true
  );
  SET LOCAL ROLE authenticated;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.elevate_for_fixture()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  RESET ROLE;
END;
$$;

DO $$
DECLARE
  v_team_id uuid;
  v_admin_id uuid;
  v_student_id uuid;
  v_student_profile_id uuid;
  v_educator_profile_id uuid;
  v_unrelated_student_id uuid;
  v_unrelated_educator_id uuid;
  v_external_id uuid;
  v_future_date date := (current_timestamp AT TIME ZONE 'Asia/Kolkata')::date + 2;
  v_today date := (current_timestamp AT TIME ZONE 'Asia/Kolkata')::date;
  v_scheduled_at timestamptz;
  v_completed_at timestamptz;
  v_count integer;
  v_status4 text;
  v_status5 text;
  v_team_stage integer;
BEGIN
  SELECT t.id
  INTO v_team_id
  FROM public.teams AS t
  WHERE t.status = 'active'
    AND EXISTS (
      SELECT 1 FROM public.team_stage_progress AS tsp
      WHERE tsp.team_id = t.id AND tsp.stage_number IN (3, 4, 5)
      GROUP BY tsp.team_id HAVING count(*) = 3
    )
    AND (
      SELECT count(*) FROM public.team_members AS tm
      WHERE tm.team_id = t.id AND tm.member_status = 'active'
    ) = 3
    AND NOT EXISTS (
      SELECT 1
      FROM public.team_members AS tm
      JOIN public.students AS s ON s.id = tm.student_id
      WHERE tm.team_id = t.id
        AND tm.member_status = 'active'
        AND s.current_team_id IS DISTINCT FROM t.id
    )
    AND EXISTS (
      SELECT 1 FROM public.team_educators AS te
      WHERE te.team_id = t.id AND te.status = 'active'
    )
  ORDER BY t.created_at
  LIMIT 1;

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'FIXTURE REQUIRED: no eligible active team was found';
  END IF;

  SELECT p.id INTO v_admin_id
  FROM public.profiles AS p
  WHERE p.role = 'admin' AND p.status = 'active'
  ORDER BY p.created_at LIMIT 1;

  SELECT tm.student_id, s.user_id
  INTO v_student_id, v_student_profile_id
  FROM public.team_members AS tm
  JOIN public.students AS s ON s.id = tm.student_id
  WHERE tm.team_id = v_team_id AND tm.member_status = 'active'
  LIMIT 1;

  SELECT e.user_id INTO v_educator_profile_id
  FROM public.team_educators AS te
  JOIN public.educators AS e ON e.id = te.educator_id
  WHERE te.team_id = v_team_id
    AND te.status = 'active'
    AND e.status = 'active'
  LIMIT 1;

  SELECT s.user_id INTO v_unrelated_student_id
  FROM public.students AS s
  WHERE s.status = 'active'
    AND s.user_id <> v_student_profile_id
    AND NOT EXISTS (
      SELECT 1 FROM public.team_members AS tm
      WHERE tm.team_id = v_team_id
        AND tm.student_id = s.id
        AND tm.member_status = 'active'
    )
  LIMIT 1;

  SELECT e.user_id INTO v_unrelated_educator_id
  FROM public.educators AS e
  WHERE e.status = 'active'
    AND e.user_id <> v_educator_profile_id
    AND NOT EXISTS (
      SELECT 1
      FROM public.team_educators AS te
      WHERE te.team_id = v_team_id
        AND te.educator_id = e.id
        AND te.status = 'active'
    )
  LIMIT 1;

  SELECT p.id INTO v_external_id
  FROM public.profiles AS p
  WHERE p.role = 'external_member' AND p.status = 'active'
  LIMIT 1;

  IF v_admin_id IS NULL OR v_student_profile_id IS NULL
     OR v_educator_profile_id IS NULL THEN
    RAISE EXCEPTION 'FIXTURE REQUIRED: active admin/student/educator profiles are required';
  END IF;

  -- Build a disposable Stage 4 state from the selected team. ROLLBACK restores it.
  UPDATE public.team_stage_progress
  SET status = 'completed', completed_at = coalesce(completed_at, now())
  WHERE team_id = v_team_id AND stage_number = 3;

  UPDATE public.team_stage_progress
  SET
    status = 'in_progress',
    started_at = coalesce(started_at, now()),
    completed_at = NULL,
    brand_works_date = NULL,
    brand_works_remarks = NULL,
    brand_works_scheduled_at = NULL,
    brand_works_scheduled_by = NULL,
    brand_works_completed_at = NULL,
    brand_works_completed_by = NULL
  WHERE team_id = v_team_id AND stage_number = 4;

  UPDATE public.team_stage_progress
  SET status = 'locked', started_at = NULL, completed_at = NULL
  WHERE team_id = v_team_id AND stage_number = 5;

  UPDATE public.teams
  SET current_stage_number = 4, stage_status = 'in_progress'
  WHERE id = v_team_id;

  UPDATE public.students AS s
  SET current_stage_number = 4
  FROM public.team_members AS tm
  WHERE tm.team_id = v_team_id
    AND tm.student_id = s.id
    AND tm.member_status = 'active';

  -- Student can read the team's Stage 4 row, but cannot execute admin RPCs.
  PERFORM pg_temp.set_auth_user(v_student_profile_id);
  SELECT count(*) INTO v_count
  FROM public.team_stage_progress
  WHERE team_id = v_team_id AND stage_number = 4;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'FAIL: own-team student cannot read Stage 4';
  END IF;

  BEGIN
    PERFORM public.schedule_brand_works(v_team_id, v_future_date, 'blocked');
    RAISE EXCEPTION 'FAIL: student scheduled Brand Works';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%permission%' THEN RAISE; END IF;
  END;

  BEGIN
    UPDATE public.team_stage_progress
    SET brand_works_remarks = 'direct write'
    WHERE team_id = v_team_id AND stage_number = 4;
    RAISE EXCEPTION 'FAIL: authenticated direct update succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
  PERFORM pg_temp.elevate_for_fixture();
  RAISE NOTICE 'PASS: student read-only visibility and RPC permission';

  IF v_unrelated_student_id IS NOT NULL THEN
    PERFORM pg_temp.set_auth_user(v_unrelated_student_id);
    SELECT count(*) INTO v_count
    FROM public.team_stage_progress
    WHERE team_id = v_team_id AND stage_number = 4;
    IF v_count <> 0 THEN
      RAISE EXCEPTION 'FAIL: unrelated student can read Stage 4';
    END IF;
    PERFORM pg_temp.elevate_for_fixture();
  END IF;

  PERFORM pg_temp.set_auth_user(v_educator_profile_id);
  SELECT count(*) INTO v_count
  FROM public.team_stage_progress
  WHERE team_id = v_team_id AND stage_number = 4;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'FAIL: assigned educator cannot read Stage 4';
  END IF;
  BEGIN
    PERFORM public.complete_brand_works(v_team_id);
    RAISE EXCEPTION 'FAIL: educator completed Brand Works';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%permission%' THEN RAISE; END IF;
  END;
  PERFORM pg_temp.elevate_for_fixture();

  IF v_unrelated_educator_id IS NOT NULL THEN
    PERFORM pg_temp.set_auth_user(v_unrelated_educator_id);
    SELECT count(*) INTO v_count
    FROM public.team_stage_progress
    WHERE team_id = v_team_id AND stage_number = 4;
    IF v_count <> 0 THEN
      RAISE EXCEPTION 'FAIL: unrelated educator can read Stage 4';
    END IF;
    PERFORM pg_temp.elevate_for_fixture();
  END IF;
  RAISE NOTICE 'PASS: educator read-only visibility and isolation';

  IF v_external_id IS NOT NULL THEN
    PERFORM pg_temp.set_auth_user(v_external_id);
    BEGIN
      PERFORM public.schedule_brand_works(v_team_id, v_today, NULL);
      RAISE EXCEPTION 'FAIL: external member scheduled Brand Works';
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%permission%' THEN RAISE; END IF;
    END;
    PERFORM pg_temp.elevate_for_fixture();
  END IF;

  -- Admin scheduling, rescheduling, validation, and idempotency.
  PERFORM pg_temp.set_auth_user(v_admin_id);
  PERFORM public.schedule_brand_works(v_team_id, v_future_date, 'QA future schedule');
  SELECT brand_works_scheduled_at INTO v_scheduled_at
  FROM public.team_stage_progress
  WHERE team_id = v_team_id AND stage_number = 4;

  PERFORM public.schedule_brand_works(v_team_id, v_future_date, 'QA future schedule');
  IF (SELECT brand_works_scheduled_at FROM public.team_stage_progress
      WHERE team_id = v_team_id AND stage_number = 4) IS DISTINCT FROM v_scheduled_at THEN
    RAISE EXCEPTION 'FAIL: identical schedule retry changed audit timestamp';
  END IF;

  BEGIN
    PERFORM public.complete_brand_works(v_team_id);
    RAISE EXCEPTION 'FAIL: future Brand Works completed early';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%scheduled date%' THEN RAISE; END IF;
  END;

  PERFORM public.schedule_brand_works(v_team_id, v_today, 'QA completion schedule');
  PERFORM public.complete_brand_works(v_team_id);

  SELECT status::text, brand_works_completed_at
  INTO v_status4, v_completed_at
  FROM public.team_stage_progress
  WHERE team_id = v_team_id AND stage_number = 4;

  SELECT status::text INTO v_status5
  FROM public.team_stage_progress
  WHERE team_id = v_team_id AND stage_number = 5;

  SELECT current_stage_number INTO v_team_stage
  FROM public.teams WHERE id = v_team_id;

  IF v_status4 <> 'completed' OR v_status5 <> 'completed' OR v_team_stage <> 5 THEN
    RAISE EXCEPTION 'FAIL: atomic Stage 4 to Stage 5 transition is incomplete';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.team_members AS tm
    JOIN public.students AS s ON s.id = tm.student_id
    WHERE tm.team_id = v_team_id
      AND tm.member_status = 'active'
      AND s.current_stage_number <> 5
  ) THEN
    RAISE EXCEPTION 'FAIL: an active team student did not move to Stage 5';
  END IF;

  PERFORM public.complete_brand_works(v_team_id);
  IF (SELECT brand_works_completed_at FROM public.team_stage_progress
      WHERE team_id = v_team_id AND stage_number = 4) IS DISTINCT FROM v_completed_at THEN
    RAISE EXCEPTION 'FAIL: completion retry changed audit timestamp';
  END IF;
  PERFORM pg_temp.elevate_for_fixture();

  RAISE NOTICE 'PASS: schedule/reschedule/date validation/atomic completion/idempotency';
  RAISE NOTICE 'PASS: Package E1 disposable fixture tests complete; ROLLBACK follows';
END;
$$;

ROLLBACK;
