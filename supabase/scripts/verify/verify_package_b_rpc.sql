-- =============================================================================
-- IncluHub Dashboard — Package B RPC integration checks (ROLLBACK safe)
-- =============================================================================
--
-- SIMULATED-AUTH SQL TESTS ONLY — all mutations run inside BEGIN … ROLLBACK.
-- These tests use transaction-local JWT claim simulation for auth.uid().
-- They do NOT replace browser/manual UI testing.
--
-- Prerequisites:
-- - Migration 008 applied
-- - Policy 004 applied
-- - At least one Stage 3 team with a portfolio in awaiting_booking
--
-- Browser tests (separate): leader books in /student/portfolio, admin views
-- /admin/studio-schedule, Realtime slot updates, etc.
--
-- Usage (Supabase SQL editor): paste and run the full script.
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

CREATE OR REPLACE FUNCTION pg_temp.find_available_studio_slot(
  OUT p_booking_date date,
  OUT p_slot_code text
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_today date := (current_timestamp AT TIME ZONE 'Asia/Kolkata')::date;
  v_slots text[] := ARRAY[
    'slot_06_09',
    'slot_09_12',
    'slot_12_15',
    'slot_15_18',
    'slot_18_21'
  ];
  v_offset integer;
  v_candidate_date date;
  v_candidate_slot text;
BEGIN
  FOR v_offset IN 0..90 LOOP
    v_candidate_date := v_today + v_offset;

    FOREACH v_candidate_slot IN ARRAY v_slots LOOP
      IF NOT EXISTS (
        SELECT 1
        FROM studio_slot_occupancy sso
        WHERE sso.booking_date = v_candidate_date
          AND sso.slot_code = v_candidate_slot
      ) THEN
        p_booking_date := v_candidate_date;
        p_slot_code := v_candidate_slot;
        RETURN;
      END IF;
    END LOOP;
  END LOOP;

  p_booking_date := NULL;
  p_slot_code := NULL;
END;
$$;

DO $$
DECLARE
  v_team_id uuid;
  v_portfolio_id uuid;
  v_leader_profile_id uuid;
  v_leader_student_id uuid;
  v_assistant_profile_id uuid;
  v_other_profile_id uuid;
  v_educator_profile_id uuid;
  v_admin_profile_id uuid;
  v_external_profile_id uuid;
  v_second_portfolio_id uuid;
  v_second_leader_profile_id uuid;
  v_booking_date date;
  v_slot text;
  v_occupancy_before integer;
  v_occupancy_after integer;
  v_booking_before integer;
  v_booking_after integer;
  v_workflow text;
  v_availability_count integer;
  v_private_column_count integer;
  v_ordered_slots text[];
  v_expected_slots text[] := ARRAY[
    'slot_06_09',
    'slot_09_12',
    'slot_12_15',
    'slot_15_18',
    'slot_18_21'
  ];
BEGIN
  SELECT po.id, po.team_id, po.leader_student_id, s.user_id
  INTO v_portfolio_id, v_team_id, v_leader_student_id, v_leader_profile_id
  FROM portfolio_outputs po
  JOIN teams t ON t.id = po.team_id
  JOIN students s ON s.id = po.leader_student_id
  WHERE po.workflow_status = 'awaiting_booking'
    AND t.current_stage_number = 3
    AND t.status = 'active'
  ORDER BY po.sequence_order ASC
  LIMIT 1;

  IF v_portfolio_id IS NULL THEN
    RAISE NOTICE 'SKIP: No Stage 3 portfolio awaiting booking found.';
    RETURN;
  END IF;

  SELECT p_booking_date, p_slot_code
  INTO v_booking_date, v_slot
  FROM pg_temp.find_available_studio_slot();

  IF v_booking_date IS NULL OR v_slot IS NULL THEN
    RAISE NOTICE 'SKIP: No available studio date/slot found in the next 90 days.';
    RETURN;
  END IF;

  RAISE NOTICE 'Using dynamically selected test slot % on %', v_slot, v_booking_date;

  SELECT p.id
  INTO v_assistant_profile_id
  FROM team_members tm
  JOIN students s ON s.id = tm.student_id
  JOIN profiles p ON p.id = s.user_id
  WHERE tm.team_id = v_team_id
    AND tm.member_status = 'active'
    AND tm.student_id <> v_leader_student_id
  LIMIT 1;

  SELECT p.id
  INTO v_other_profile_id
  FROM students s
  JOIN profiles p ON p.id = s.user_id
  WHERE s.status = 'active'
    AND s.id NOT IN (
      SELECT tm.student_id
      FROM team_members tm
      WHERE tm.team_id = v_team_id
        AND tm.member_status = 'active'
    )
  LIMIT 1;

  SELECT p.id
  INTO v_educator_profile_id
  FROM educators e
  JOIN profiles p ON p.id = e.user_id
  WHERE e.status = 'active'
  LIMIT 1;

  SELECT p.id
  INTO v_admin_profile_id
  FROM profiles p
  WHERE p.role = 'admin'
    AND p.status = 'active'
  LIMIT 1;

  SELECT p.id
  INTO v_external_profile_id
  FROM external_members em
  JOIN profiles p ON p.id = em.user_id
  WHERE em.status = 'active'
    AND p.role = 'external_member'
    AND p.status = 'active'
  LIMIT 1;

  SELECT po.id, s.user_id
  INTO v_second_portfolio_id, v_second_leader_profile_id
  FROM portfolio_outputs po
  JOIN teams t ON t.id = po.team_id
  JOIN students s ON s.id = po.leader_student_id
  WHERE po.workflow_status = 'awaiting_booking'
    AND t.current_stage_number = 3
    AND t.status = 'active'
    AND po.id <> v_portfolio_id
  ORDER BY po.sequence_order ASC
  LIMIT 1;

  -- Availability RPC: five ordered rows, no private data (WITH ORDINALITY)
  PERFORM pg_temp.set_auth_user(v_leader_profile_id);

  SELECT count(*) INTO v_availability_count
  FROM public.get_studio_slot_availability(v_booking_date);

  IF v_availability_count <> 5 THEN
    RAISE EXCEPTION 'FAIL: availability RPC expected 5 rows, got %', v_availability_count;
  END IF;

  SELECT array_agg(slot_code ORDER BY ordinality)
  INTO v_ordered_slots
  FROM public.get_studio_slot_availability(v_booking_date)
  WITH ORDINALITY AS availability(slot_code, available, ordinality);

  IF v_ordered_slots IS DISTINCT FROM v_expected_slots THEN
    RAISE EXCEPTION 'FAIL: availability RPC slot order mismatch: %', v_ordered_slots;
  END IF;

  SELECT count(*) INTO v_private_column_count
  FROM (
    SELECT *
    FROM public.get_studio_slot_availability(v_booking_date)
  ) availability
  WHERE false
    OR to_jsonb(availability) ? 'team_id'
    OR to_jsonb(availability) ? 'portfolio_output_id'
    OR to_jsonb(availability) ? 'student_id'
    OR to_jsonb(availability) ? 'booking_id'
    OR to_jsonb(availability) ? 'occupancy_id';

  IF v_private_column_count > 0 THEN
    RAISE EXCEPTION 'FAIL: availability RPC exposed private columns';
  END IF;

  RAISE NOTICE 'PASS: availability RPC returns five ordered rows without private data';

  -- external_member cannot access availability RPC
  IF v_external_profile_id IS NOT NULL THEN
    PERFORM pg_temp.set_auth_user(v_external_profile_id);
    BEGIN
      PERFORM public.get_studio_slot_availability(v_booking_date);
      RAISE EXCEPTION 'FAIL: external_member availability RPC should have been blocked';
    EXCEPTION
      WHEN OTHERS THEN
        IF SQLERRM NOT LIKE '%permission%' THEN
          RAISE EXCEPTION 'FAIL: unexpected external_member availability error: %', SQLERRM;
        END IF;
        RAISE NOTICE 'PASS: external_member cannot use availability RPC';
    END;

    IF EXISTS (SELECT 1 FROM studio_slot_occupancy) THEN
      RAISE EXCEPTION 'FAIL: external_member could read studio_slot_occupancy';
    END IF;

    RAISE NOTICE 'PASS: external_member has no studio_slot_occupancy access';
  ELSE
    RAISE NOTICE 'SKIP: no active external_member profile found';
  END IF;

  -- Assistant cannot book
  IF v_assistant_profile_id IS NOT NULL THEN
    PERFORM pg_temp.set_auth_user(v_assistant_profile_id);
    BEGIN
      PERFORM public.book_studio_slot(v_portfolio_id, v_booking_date, v_slot);
      RAISE EXCEPTION 'FAIL: assistant booking should have been blocked';
    EXCEPTION
      WHEN OTHERS THEN
        IF SQLERRM NOT LIKE '%not the current portfolio leader%' THEN
          RAISE EXCEPTION 'FAIL: unexpected assistant booking error: %', SQLERRM;
        END IF;
        RAISE NOTICE 'PASS: assistant cannot book';
    END;
  END IF;

  -- Unrelated student cannot book
  IF v_other_profile_id IS NOT NULL THEN
    PERFORM pg_temp.set_auth_user(v_other_profile_id);
    BEGIN
      PERFORM public.book_studio_slot(v_portfolio_id, v_booking_date, v_slot);
      RAISE EXCEPTION 'FAIL: unrelated student booking should have been blocked';
    EXCEPTION
      WHEN OTHERS THEN
        IF SQLERRM NOT LIKE '%not part of this team%'
           AND SQLERRM NOT LIKE '%not the current portfolio leader%' THEN
          RAISE EXCEPTION 'FAIL: unexpected unrelated student error: %', SQLERRM;
        END IF;
        RAISE NOTICE 'PASS: unrelated student cannot book';
    END;
  END IF;

  -- Educator cannot book
  IF v_educator_profile_id IS NOT NULL THEN
    PERFORM pg_temp.set_auth_user(v_educator_profile_id);
    BEGIN
      PERFORM public.book_studio_slot(v_portfolio_id, v_booking_date, v_slot);
      RAISE EXCEPTION 'FAIL: educator booking should have been blocked';
    EXCEPTION
      WHEN OTHERS THEN
        IF SQLERRM NOT LIKE '%permission%' THEN
          RAISE EXCEPTION 'FAIL: unexpected educator booking error: %', SQLERRM;
        END IF;
        RAISE NOTICE 'PASS: educator cannot book';
    END;
  END IF;

  -- Admin cannot book via student RPC
  IF v_admin_profile_id IS NOT NULL THEN
    PERFORM pg_temp.set_auth_user(v_admin_profile_id);
    BEGIN
      PERFORM public.book_studio_slot(v_portfolio_id, v_booking_date, v_slot);
      RAISE EXCEPTION 'FAIL: admin booking should have been blocked';
    EXCEPTION
      WHEN OTHERS THEN
        IF SQLERRM NOT LIKE '%permission%'
           AND SQLERRM NOT LIKE '%student profile%' THEN
          RAISE EXCEPTION 'FAIL: unexpected admin booking error: %', SQLERRM;
        END IF;
        RAISE NOTICE 'PASS: admin cannot use student booking RPC';
    END;
  END IF;

  -- external_member cannot book
  IF v_external_profile_id IS NOT NULL THEN
    PERFORM pg_temp.set_auth_user(v_external_profile_id);
    BEGIN
      PERFORM public.book_studio_slot(v_portfolio_id, v_booking_date, v_slot);
      RAISE EXCEPTION 'FAIL: external_member booking should have been blocked';
    EXCEPTION
      WHEN OTHERS THEN
        IF SQLERRM NOT LIKE '%permission%' THEN
          RAISE EXCEPTION 'FAIL: unexpected external_member booking error: %', SQLERRM;
        END IF;
        RAISE NOTICE 'PASS: external_member cannot book';
    END;
  END IF;

  -- Past date rejected
  PERFORM pg_temp.set_auth_user(v_leader_profile_id);
  BEGIN
    PERFORM public.book_studio_slot(
      v_portfolio_id,
      ((current_timestamp AT TIME ZONE 'Asia/Kolkata')::date - 1),
      v_slot
    );
    RAISE EXCEPTION 'FAIL: past date booking should have been blocked';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%past%' THEN
        RAISE EXCEPTION 'FAIL: unexpected past date error: %', SQLERRM;
      END IF;
      RAISE NOTICE 'PASS: past date rejected';
  END;

  -- Invalid slot rejected
  BEGIN
    PERFORM public.book_studio_slot(v_portfolio_id, v_booking_date, 'slot_99_99');
    RAISE EXCEPTION 'FAIL: invalid slot should have been blocked';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%Invalid studio slot%' THEN
        RAISE EXCEPTION 'FAIL: unexpected invalid slot error: %', SQLERRM;
      END IF;
      RAISE NOTICE 'PASS: invalid slot rejected';
  END;

  -- Leader can book using dynamically selected available slot
  SELECT count(*) INTO v_occupancy_before FROM studio_slot_occupancy;
  SELECT count(*) INTO v_booking_before FROM studio_bookings;

  PERFORM public.book_studio_slot(v_portfolio_id, v_booking_date, v_slot);

  SELECT count(*) INTO v_occupancy_after FROM studio_slot_occupancy;
  SELECT count(*) INTO v_booking_after FROM studio_bookings;

  IF v_occupancy_after <> v_occupancy_before + 1 THEN
    RAISE EXCEPTION 'FAIL: expected one new occupancy row';
  END IF;

  IF v_booking_after <> v_booking_before + 1 THEN
    RAISE EXCEPTION 'FAIL: expected one new studio booking row';
  END IF;

  SELECT workflow_status
  INTO v_workflow
  FROM portfolio_outputs
  WHERE id = v_portfolio_id;

  IF v_workflow <> 'awaiting_submission' THEN
    RAISE EXCEPTION 'FAIL: portfolio workflow expected awaiting_submission, got %', v_workflow;
  END IF;

  RAISE NOTICE 'PASS: leader booking succeeded and portfolio advanced';

  -- external_member cannot read private bookings after one exists in this transaction
  IF v_external_profile_id IS NOT NULL THEN
    PERFORM pg_temp.set_auth_user(v_external_profile_id);

    IF (SELECT count(*) FROM studio_bookings) <> 0 THEN
      RAISE EXCEPTION 'FAIL: external_member could read private studio_bookings';
    END IF;

    RAISE NOTICE 'PASS: external_member sees zero private booking rows';
  END IF;

  -- Duplicate portfolio booking blocked
  BEGIN
    PERFORM public.book_studio_slot(v_portfolio_id, v_booking_date, v_slot);
    RAISE EXCEPTION 'FAIL: duplicate portfolio booking should have been blocked';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%already has a studio booking%'
         AND SQLERRM NOT LIKE '%not awaiting a studio booking%' THEN
        RAISE EXCEPTION 'FAIL: unexpected duplicate portfolio error: %', SQLERRM;
      END IF;
      RAISE NOTICE 'PASS: duplicate portfolio booking blocked';
  END;

  -- Same date/slot blocked for another portfolio using pre-discovered second portfolio
  IF v_second_portfolio_id IS NOT NULL AND v_second_leader_profile_id IS NOT NULL THEN
    PERFORM pg_temp.set_auth_user(v_second_leader_profile_id);

    BEGIN
      PERFORM public.book_studio_slot(v_second_portfolio_id, v_booking_date, v_slot);
      RAISE EXCEPTION 'FAIL: duplicate slot booking should have been blocked';
    EXCEPTION
      WHEN OTHERS THEN
        IF SQLERRM NOT LIKE '%just booked by another team%' THEN
          RAISE EXCEPTION 'FAIL: unexpected duplicate slot error: %', SQLERRM;
        END IF;
        RAISE NOTICE 'PASS: duplicate date/slot blocked for second portfolio %', v_second_portfolio_id;
    END;
  ELSE
    RAISE NOTICE 'SKIP: no second eligible awaiting_booking portfolio found for duplicate slot test';
  END IF;

  -- Direct student writes blocked
  PERFORM pg_temp.set_auth_user(v_leader_profile_id);

  BEGIN
    INSERT INTO studio_bookings (
      portfolio_output_id,
      team_id,
      leader_student_id,
      occupancy_id,
      created_by
    )
    SELECT
      po.id,
      po.team_id,
      po.leader_student_id,
      sso.id,
      v_leader_profile_id
    FROM portfolio_outputs po
    CROSS JOIN studio_slot_occupancy sso
    WHERE po.workflow_status = 'awaiting_booking'
    LIMIT 1;
    RAISE EXCEPTION 'FAIL: direct student insert should have been blocked';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'PASS: direct student insert blocked';
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%permission%' OR SQLERRM LIKE '%policy%' THEN
        RAISE NOTICE 'PASS: direct student insert blocked';
      ELSE
        RAISE EXCEPTION 'FAIL: unexpected direct insert error: %', SQLERRM;
      END IF;
  END;

  BEGIN
    UPDATE studio_bookings SET booked_at = now();
    RAISE EXCEPTION 'FAIL: student update should have been blocked';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'PASS: student update blocked';
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%permission%' OR SQLERRM LIKE '%policy%' THEN
        RAISE NOTICE 'PASS: student update blocked';
      ELSE
        RAISE EXCEPTION 'FAIL: unexpected update error: %', SQLERRM;
      END IF;
  END;

  BEGIN
    DELETE FROM studio_bookings;
    RAISE EXCEPTION 'FAIL: student delete should have been blocked';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'PASS: student delete blocked';
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%permission%' OR SQLERRM LIKE '%policy%' THEN
        RAISE NOTICE 'PASS: student delete blocked';
      ELSE
        RAISE EXCEPTION 'FAIL: unexpected delete error: %', SQLERRM;
      END IF;
  END;

  -- Unrelated student cannot read private bookings
  IF v_other_profile_id IS NOT NULL THEN
    PERFORM pg_temp.set_auth_user(v_other_profile_id);
    IF EXISTS (SELECT 1 FROM studio_bookings WHERE team_id = v_team_id) THEN
      RAISE EXCEPTION 'FAIL: unrelated student could read private booking';
    END IF;
    RAISE NOTICE 'PASS: unrelated student cannot read private bookings';
  END IF;

  -- Admin can read complete schedule
  IF v_admin_profile_id IS NOT NULL THEN
    PERFORM pg_temp.set_auth_user(v_admin_profile_id);
    IF NOT EXISTS (SELECT 1 FROM studio_bookings) THEN
      RAISE EXCEPTION 'FAIL: admin could not read studio bookings';
    END IF;
    RAISE NOTICE 'PASS: admin can read complete schedule';
  END IF;

  -- Assigned educator can read assigned-team booking
  IF v_educator_profile_id IS NOT NULL THEN
    PERFORM pg_temp.set_auth_user(v_educator_profile_id);
    IF EXISTS (
      SELECT 1
      FROM studio_bookings sb
      JOIN team_educators te ON te.team_id = sb.team_id
      JOIN educators e ON e.id = te.educator_id
      WHERE e.user_id = v_educator_profile_id
        AND te.status = 'active'
    ) THEN
      RAISE NOTICE 'PASS: assigned educator can read assigned-team booking';
    ELSE
      RAISE NOTICE 'SKIP: no assigned educator relationship for booked team';
    END IF;
  END IF;

  RAISE NOTICE 'PASS: Package B simulated-auth RPC integration checks completed';
  RAISE NOTICE 'NOTE: Browser tests are separate — see IMPLEMENTATION_PROGRESS.md';
END $$;

ROLLBACK;
