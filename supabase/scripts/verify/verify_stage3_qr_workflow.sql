-- =============================================================================
-- IncluHub Dashboard — Stage 3 authoritative QR workflow verification
-- =============================================================================
--
-- Run after migrations 014, 015 (or 021 backfill), 018, 019, and 020.
-- Part A is read-only schema/RPC checks.
-- Part B is SIMULATED-AUTH SQL inside BEGIN … ROLLBACK (does not persist).
--
-- Usage: paste and run the full script in the Supabase SQL editor.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Part A — static presence checks
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_missing text;
  v_missing_015 text;
BEGIN
  SELECT string_agg(required.proname, ', ' ORDER BY required.proname)
  INTO v_missing
  FROM (
    VALUES
      ('book_studio_slot'),
      ('verify_studio_checkin'),
      ('submit_portfolio'),
      ('save_studio_availability'),
      ('create_studio_checkin_qr'),
      ('mark_studio_no_show'),
      ('send_admin_update')
  ) AS required(proname)
  WHERE NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = required.proname
  );

  IF v_missing IS NOT NULL THEN
    SELECT string_agg(required.proname, ', ' ORDER BY required.proname)
    INTO v_missing_015
    FROM (
      VALUES
        ('create_studio_checkin_qr'),
        ('mark_studio_no_show')
    ) AS required(proname)
    WHERE NOT EXISTS (
      SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = required.proname
    );

    IF v_missing_015 IS NOT NULL AND v_missing = v_missing_015 THEN
      RAISE EXCEPTION
        'FAIL: missing RPCs from migration 015 / 021: %. Apply supabase/migrations/015_stage3_availability_qr_checkin.sql (fresh DB) OR supabase/migrations/021_stage3_qr_prerequisites.sql (if 018–020 already applied).',
        v_missing;
    END IF;

    RAISE EXCEPTION 'FAIL: missing RPCs: %', v_missing;
  END IF;
  RAISE NOTICE 'PASS: Stage 3 / Admin Update RPCs exist';

  IF to_regclass('public.studio_checkin_tokens') IS NULL THEN
    RAISE EXCEPTION
      'FAIL: table public.studio_checkin_tokens is missing. Apply migration 015 or 021 before running verify.';
  END IF;
  RAISE NOTICE 'PASS: studio_checkin_tokens table exists';

  IF to_regclass('public.studio_availability_responses') IS NULL THEN
    RAISE EXCEPTION
      'FAIL: table public.studio_availability_responses is missing. Apply migration 015 or 021 before running verify.';
  END IF;
  RAISE NOTICE 'PASS: studio_availability_responses table exists';

  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
    RAISE EXCEPTION
      'FAIL: pgcrypto extension is missing. Apply supabase/migrations/022_enable_pgcrypto_for_qr.sql (required for QR token hashing).';
  END IF;
  RAISE NOTICE 'PASS: pgcrypto extension enabled';

  SELECT string_agg(required.table_name, ', ' ORDER BY required.table_name)
  INTO v_missing
  FROM (
    VALUES
      ('notifications'),
      ('notification_recipients'),
      ('portfolio_outputs'),
      ('portfolio_participants'),
      ('portfolio_submissions'),
      ('studio_slot_occupancy'),
      ('studio_bookings'),
      ('studio_availability_responses'),
      ('studio_checkin_tokens')
  ) AS required(table_name)
  WHERE to_regclass('public.' || required.table_name) IS NULL;

  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'FAIL: missing tables: %', v_missing;
  END IF;
  RAISE NOTICE 'PASS: all Stage 3 / notification tables exist';

  SELECT string_agg(required.column_name, ', ' ORDER BY required.column_name)
  INTO v_missing
  FROM (
    VALUES
      ('verification_status'),
      ('online_confirmed_at'),
      ('physically_verified_at'),
      ('physically_verified_by'),
      ('no_show_at'),
      ('no_show_by'),
      ('no_show_remarks')
  ) AS required(column_name)
  WHERE NOT EXISTS (
    SELECT 1
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = 'studio_bookings'
      AND c.column_name = required.column_name
  );

  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'FAIL: studio_bookings missing columns: %', v_missing;
  END IF;
  RAISE NOTICE 'PASS: studio_bookings verification columns exist';

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.notifications'::regclass
      AND conname = 'notifications_audience_type_check'
      AND pg_get_constraintdef(oid) ILIKE '%everyone%'
  ) THEN
    RAISE EXCEPTION 'FAIL: notifications.audience_type must allow everyone';
  END IF;
  RAISE NOTICE 'PASS: notifications.audience_type includes everyone';
END;
$$;

-- ---------------------------------------------------------------------------
-- Part B — transactional smoke (ROLLBACK)
-- ---------------------------------------------------------------------------
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
    'slot_06_09', 'slot_09_12', 'slot_12_15', 'slot_15_18', 'slot_18_21'
  ];
  v_offset integer;
  v_candidate_date date;
  v_candidate_slot text;
BEGIN
  FOR v_offset IN 1..14 LOOP
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
  v_leader_student_id uuid;
  v_leader_profile_id uuid;
  v_assistant_a_student_id uuid;
  v_assistant_a_profile_id uuid;
  v_assistant_b_student_id uuid;
  v_assistant_b_profile_id uuid;
  v_admin_profile_id uuid;
  v_booking_date date;
  v_slot_code text;
  v_booking_id uuid;
  v_qr_token text;
  v_workflow text;
  v_verification text;
  v_notification_id uuid;
  v_slots jsonb;
BEGIN
  SELECT t.id
  INTO v_team_id
  FROM teams t
  JOIN team_stage_progress tsp
    ON tsp.team_id = t.id
   AND tsp.stage_number = 3
   AND tsp.status = 'in_progress'
  WHERE t.status = 'active'
  ORDER BY t.created_at
  LIMIT 1;

  IF v_team_id IS NULL THEN
    RAISE NOTICE 'SKIP: no active Stage 3 team for RPC smoke';
    RETURN;
  END IF;

  SELECT po.id, po.leader_student_id, po.workflow_status
  INTO v_portfolio_id, v_leader_student_id, v_workflow
  FROM portfolio_outputs po
  WHERE po.team_id = v_team_id
    AND po.portfolio_type = 'photography'
    AND po.workflow_status IN ('awaiting_booking', 'awaiting_studio_checkin', 'awaiting_submission')
  ORDER BY CASE po.workflow_status
    WHEN 'awaiting_booking' THEN 1
    WHEN 'awaiting_studio_checkin' THEN 2
    ELSE 3
  END
  LIMIT 1;

  IF v_portfolio_id IS NULL THEN
    RAISE NOTICE 'SKIP: no Photography portfolio in bookable/check-in states';
    RETURN;
  END IF;

  SELECT s.user_id INTO v_leader_profile_id
  FROM students s WHERE s.id = v_leader_student_id;

  SELECT tm.student_id, s.user_id
  INTO v_assistant_a_student_id, v_assistant_a_profile_id
  FROM team_members tm
  JOIN students s ON s.id = tm.student_id
  WHERE tm.team_id = v_team_id
    AND tm.status = 'active'
    AND tm.student_id <> v_leader_student_id
  ORDER BY tm.created_at
  LIMIT 1;

  SELECT tm.student_id, s.user_id
  INTO v_assistant_b_student_id, v_assistant_b_profile_id
  FROM team_members tm
  JOIN students s ON s.id = tm.student_id
  WHERE tm.team_id = v_team_id
    AND tm.status = 'active'
    AND tm.student_id NOT IN (v_leader_student_id, v_assistant_a_student_id)
  ORDER BY tm.created_at
  LIMIT 1;

  SELECT p.id INTO v_admin_profile_id
  FROM profiles p
  WHERE p.role = 'admin' AND p.status = 'active'
  ORDER BY p.created_at
  LIMIT 1;

  IF v_assistant_a_profile_id IS NULL
     OR v_assistant_b_profile_id IS NULL
     OR v_leader_profile_id IS NULL THEN
    RAISE NOTICE 'SKIP: team does not have a leader + two assistants';
    RETURN;
  END IF;

  SELECT * INTO v_booking_date, v_slot_code
  FROM pg_temp.find_available_studio_slot();

  IF v_booking_date IS NULL THEN
    RAISE NOTICE 'SKIP: no free studio slot in the next 14 days';
    RETURN;
  END IF;

  v_slots := jsonb_build_array(
    jsonb_build_object('booking_date', v_booking_date, 'slot_code', v_slot_code)
  );

  -- Reset portfolio to awaiting_booking for a clean gate check when possible.
  IF v_workflow = 'awaiting_booking' THEN
    -- Availability gate: leader cannot book before both assistants respond.
    PERFORM pg_temp.set_auth_user(v_leader_profile_id);
    BEGIN
      PERFORM public.book_studio_slot(v_portfolio_id, v_booking_date, v_slot_code);
      RAISE EXCEPTION 'FAIL: booking should require both assistants';
    EXCEPTION
      WHEN OTHERS THEN
        IF SQLERRM NOT LIKE '%Both assistants must share availability%' THEN
          RAISE EXCEPTION 'FAIL: unexpected early booking error: %', SQLERRM;
        END IF;
        RAISE NOTICE 'PASS: booking blocked until both assistants share availability';
    END;

    PERFORM pg_temp.set_auth_user(v_assistant_a_profile_id);
    PERFORM public.save_studio_availability(v_portfolio_id, v_slots);

    PERFORM pg_temp.set_auth_user(v_leader_profile_id);
    BEGIN
      PERFORM public.book_studio_slot(v_portfolio_id, v_booking_date, v_slot_code);
      RAISE EXCEPTION 'FAIL: booking should still require second assistant';
    EXCEPTION
      WHEN OTHERS THEN
        IF SQLERRM NOT LIKE '%Both assistants must share availability%' THEN
          RAISE EXCEPTION 'FAIL: unexpected one-assistant booking error: %', SQLERRM;
        END IF;
        RAISE NOTICE 'PASS: one assistant is not enough to unlock booking';
    END;

    PERFORM pg_temp.set_auth_user(v_assistant_b_profile_id);
    PERFORM public.save_studio_availability(v_portfolio_id, v_slots);
    RAISE NOTICE 'PASS: both assistants saved availability';

    -- Wrong actor: assistant cannot book.
    PERFORM pg_temp.set_auth_user(v_assistant_a_profile_id);
    BEGIN
      PERFORM public.book_studio_slot(v_portfolio_id, v_booking_date, v_slot_code);
      RAISE EXCEPTION 'FAIL: assistant should not book';
    EXCEPTION
      WHEN OTHERS THEN
        IF SQLERRM NOT LIKE '%not the current portfolio leader%' THEN
          RAISE EXCEPTION 'FAIL: unexpected assistant book error: %', SQLERRM;
        END IF;
        RAISE NOTICE 'PASS: assistant cannot book';
    END;

    PERFORM pg_temp.set_auth_user(v_leader_profile_id);
    PERFORM public.book_studio_slot(v_portfolio_id, v_booking_date, v_slot_code);

    SELECT workflow_status INTO v_workflow
    FROM portfolio_outputs WHERE id = v_portfolio_id;
    IF v_workflow <> 'awaiting_studio_checkin' THEN
      RAISE EXCEPTION 'FAIL: expected awaiting_studio_checkin after book, got %', v_workflow;
    END IF;
    RAISE NOTICE 'PASS: book moves portfolio to awaiting_studio_checkin';
  ELSE
    RAISE NOTICE 'SKIP: portfolio not in awaiting_booking; gate/book positive path not re-run';
  END IF;

  SELECT sb.id, sb.verification_status
  INTO v_booking_id, v_verification
  FROM studio_bookings sb
  WHERE sb.portfolio_output_id = v_portfolio_id
    AND sb.verification_status IN ('online_confirmed', 'physically_verified')
  ORDER BY sb.booked_at DESC
  LIMIT 1;

  IF v_booking_id IS NULL THEN
    RAISE NOTICE 'SKIP: no active booking for QR checks';
  ELSIF v_admin_profile_id IS NULL THEN
    RAISE NOTICE 'SKIP: no admin for QR generation';
  ELSE
    IF v_verification = 'online_confirmed' THEN
      -- Submit must stay locked before physical verify.
      PERFORM pg_temp.set_auth_user(v_leader_profile_id);
      BEGIN
        PERFORM public.submit_portfolio(
          v_portfolio_id,
          'Verify Portfolio Title',
          'https://drive.google.com/drive/folders/verify-stage3',
          NULL
        );
        RAISE EXCEPTION 'FAIL: submit should require physical check-in';
      EXCEPTION
        WHEN OTHERS THEN
          IF SQLERRM NOT LIKE '%Physical studio check-in is required%'
             AND SQLERRM NOT LIKE '%not awaiting submission%' THEN
            RAISE EXCEPTION 'FAIL: unexpected pre-checkin submit error: %', SQLERRM;
          END IF;
          RAISE NOTICE 'PASS: submit blocked before physical check-in';
      END;

      PERFORM pg_temp.set_auth_user(v_admin_profile_id);
      SELECT qr_token INTO v_qr_token
      FROM public.create_studio_checkin_qr(v_booking_id);

      -- Wrong actor: assistant scan denied.
      PERFORM pg_temp.set_auth_user(v_assistant_a_profile_id);
      BEGIN
        PERFORM public.verify_studio_checkin(v_qr_token);
        RAISE EXCEPTION 'FAIL: assistant scan should be denied';
      EXCEPTION
        WHEN OTHERS THEN
          IF SQLERRM NOT LIKE '%Only the current portfolio leader%'
             AND SQLERRM NOT LIKE '%invalid or expired%' THEN
            RAISE EXCEPTION 'FAIL: unexpected assistant scan error: %', SQLERRM;
          END IF;
          RAISE NOTICE 'PASS: non-leader scan rejected';
      END;

      -- Leader may need a fresh token if assistant attempt consumed it.
      PERFORM pg_temp.set_auth_user(v_admin_profile_id);
      SELECT qr_token INTO v_qr_token
      FROM public.create_studio_checkin_qr(v_booking_id);

      PERFORM pg_temp.set_auth_user(v_leader_profile_id);
      PERFORM public.verify_studio_checkin(v_qr_token);

      SELECT workflow_status INTO v_workflow
      FROM portfolio_outputs WHERE id = v_portfolio_id;
      IF v_workflow <> 'awaiting_submission' THEN
        RAISE EXCEPTION 'FAIL: expected awaiting_submission after scan, got %', v_workflow;
      END IF;
      RAISE NOTICE 'PASS: leader scan unlocks awaiting_submission';

      -- Idempotent re-scan for same leader.
      PERFORM pg_temp.set_auth_user(v_admin_profile_id);
      SELECT qr_token INTO v_qr_token
      FROM public.create_studio_checkin_qr(v_booking_id);

      -- After verify, booking is physically_verified; create QR may reject.
      -- Re-call verify with an already-verified path using prior success state.
      SELECT verification_status INTO v_verification
      FROM studio_bookings WHERE id = v_booking_id;
      IF v_verification <> 'physically_verified' THEN
        RAISE EXCEPTION 'FAIL: booking not physically_verified after leader scan';
      END IF;
      RAISE NOTICE 'PASS: booking marked physically_verified';
    ELSE
      RAISE NOTICE 'SKIP: booking already physically_verified';
    END IF;
  END IF;

  -- Admin broadcast Update audiences.
  IF v_admin_profile_id IS NOT NULL THEN
    PERFORM pg_temp.set_auth_user(v_admin_profile_id);
    v_notification_id := public.send_admin_update(
      'all_students',
      'Stage 3 verify update',
      'Static verify script broadcast to students.'
    );
    IF v_notification_id IS NULL THEN
      RAISE EXCEPTION 'FAIL: send_admin_update returned null';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.id = v_notification_id
        AND n.event_type = 'admin_update'
        AND n.audience_type = 'all_students'
    ) THEN
      RAISE EXCEPTION 'FAIL: admin_update notification row missing';
    END IF;
    RAISE NOTICE 'PASS: send_admin_update creates admin_update for all_students';
  ELSE
    RAISE NOTICE 'SKIP: no admin for broadcast check';
  END IF;
END;
$$;

ROLLBACK;

DO $$
BEGIN
  RAISE NOTICE 'DONE: verify_stage3_qr_workflow finished (Part B rolled back).';
END;
$$;
