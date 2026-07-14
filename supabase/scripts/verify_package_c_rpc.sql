-- =============================================================================
-- IncluHub Dashboard — Package C RPC integration checks (ROLLBACK safe)
-- =============================================================================
--
-- SIMULATED-AUTH SQL TESTS ONLY — all mutations run inside BEGIN … ROLLBACK.
-- These tests use transaction-local JWT claim simulation for auth.uid().
-- They do NOT replace browser/manual UI testing.
--
-- Prerequisites:
-- - Migration 010 applied
-- - Policy 005 applied
-- - At least one Stage 3 portfolio in awaiting_submission with a studio booking
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

CREATE OR REPLACE FUNCTION pg_temp.elevate_for_fixture()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Leave authenticated so fixture mutations can run as SQL-editor owner.
  RESET ROLE;
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
  v_locked_portfolio_id uuid;
  v_locked_leader_profile_id uuid;
  v_makeup_portfolio_id uuid;
  v_hair_portfolio_id uuid;
  v_booking_exists boolean;
  v_submission_count integer;
  v_workflow text;
  v_stage integer;
  v_title text;
  v_url text;
  v_notes text;
  v_read_count integer;
  v_snapshot_title text;
  v_snapshot_link text;
  v_snapshot_notes text;
  v_snapshot_submitted_at timestamptz;
  v_hist_title text;
  v_hist_url text;
  v_hist_notes text;
  v_hist_created_at timestamptz;
BEGIN
  SELECT
    po.id,
    po.team_id,
    po.leader_student_id,
    s.user_id
  INTO
    v_portfolio_id,
    v_team_id,
    v_leader_student_id,
    v_leader_profile_id
  FROM portfolio_outputs po
  JOIN teams t ON t.id = po.team_id
  JOIN students s ON s.id = po.leader_student_id
  WHERE po.workflow_status = 'awaiting_submission'
    AND t.current_stage_number = 3
    AND t.status = 'active'
  ORDER BY po.sequence_order ASC
  LIMIT 1;

  IF v_portfolio_id IS NULL THEN
    RAISE NOTICE 'SKIP: No Stage 3 portfolio awaiting_submission found.';
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM studio_bookings sb
    WHERE sb.portfolio_output_id = v_portfolio_id
  )
  INTO v_booking_exists;

  IF NOT v_booking_exists THEN
    RAISE NOTICE 'SKIP: Awaiting-submission portfolio has no studio booking.';
    RETURN;
  END IF;

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
    AND s.id <> v_leader_student_id
    AND NOT EXISTS (
      SELECT 1
      FROM team_members tm
      WHERE tm.team_id = v_team_id
        AND tm.student_id = s.id
        AND tm.member_status = 'active'
    )
  LIMIT 1;

  -- Matching educator mapped to the portfolio leader (not an arbitrary team educator).
  SELECT p.id
  INTO v_educator_profile_id
  FROM public.team_educators te
  JOIN public.educators e
    ON e.id = te.educator_id
  JOIN public.profiles p
    ON p.id = e.user_id
  WHERE te.team_id = v_team_id
    AND te.student_id = v_leader_student_id
    AND te.status = 'active'
    AND e.status = 'active'
    AND p.status = 'active'
    AND p.role = 'educator'::user_role
  LIMIT 1;

  SELECT id
  INTO v_admin_profile_id
  FROM profiles
  WHERE role = 'admin'
    AND status = 'active'
  LIMIT 1;

  SELECT id
  INTO v_external_profile_id
  FROM profiles
  WHERE role = 'external_member'
    AND status = 'active'
  LIMIT 1;

  SELECT po.id, s.user_id
  INTO v_locked_portfolio_id, v_locked_leader_profile_id
  FROM portfolio_outputs po
  JOIN students s ON s.id = po.leader_student_id
  WHERE po.team_id = v_team_id
    AND po.workflow_status = 'locked'
  ORDER BY po.sequence_order ASC
  LIMIT 1;

  SELECT id
  INTO v_makeup_portfolio_id
  FROM portfolio_outputs
  WHERE team_id = v_team_id
    AND portfolio_type = 'makeup_artist'
  LIMIT 1;

  SELECT id
  INTO v_hair_portfolio_id
  FROM portfolio_outputs
  WHERE team_id = v_team_id
    AND portfolio_type = 'hairstylist'
  LIMIT 1;

  RAISE NOTICE 'Using portfolio % on team %', v_portfolio_id, v_team_id;

  -- -------------------------------------------------------------------------
  -- Role denial tests
  -- -------------------------------------------------------------------------

  IF v_assistant_profile_id IS NULL THEN
    RAISE NOTICE 'SKIP: No assistant profile found for assistant-submit test.';
  ELSE
    PERFORM pg_temp.set_auth_user(v_assistant_profile_id);
    BEGIN
      PERFORM * FROM submit_portfolio(
        v_portfolio_id,
        'Assistant submission',
        'https://example.com/portfolio',
        NULL
      );
      RAISE EXCEPTION 'FAIL: Assistant was allowed to submit.';
    EXCEPTION
      WHEN OTHERS THEN
        IF SQLERRM LIKE '%not the current portfolio leader%' THEN
          RAISE NOTICE 'PASS: Assistant cannot submit.';
        ELSE
          RAISE EXCEPTION 'FAIL: Assistant submit unexpected error: %', SQLERRM;
        END IF;
    END;
  END IF;

  IF v_other_profile_id IS NULL THEN
    RAISE NOTICE 'SKIP: No unrelated student for cross-team submit test.';
  ELSE
    PERFORM pg_temp.set_auth_user(v_other_profile_id);
    BEGIN
      PERFORM * FROM submit_portfolio(
        v_portfolio_id,
        'Other student submission',
        'https://example.com/portfolio',
        NULL
      );
      RAISE EXCEPTION 'FAIL: Unrelated student was allowed to submit.';
    EXCEPTION
      WHEN OTHERS THEN
        IF SQLERRM LIKE '%not part of this team%'
           OR SQLERRM LIKE '%not the current portfolio leader%'
           OR SQLERRM LIKE '%permission%'
           OR SQLERRM LIKE '%student profile%' THEN
          RAISE NOTICE 'PASS: Unrelated student cannot submit.';
        ELSE
          RAISE EXCEPTION 'FAIL: Unrelated student unexpected error: %', SQLERRM;
        END IF;
    END;
  END IF;

  IF v_educator_profile_id IS NULL THEN
    RAISE NOTICE 'SKIP: No active matching educator mapping exists for the portfolio leader (educator-submit test).';
  ELSE
    -- Authenticate as the matching educator mapped to the portfolio leader.
    PERFORM pg_temp.set_auth_user(v_educator_profile_id);
    BEGIN
      PERFORM * FROM submit_portfolio(
        v_portfolio_id,
        'Educator submission',
        'https://example.com/portfolio',
        NULL
      );
      RAISE EXCEPTION 'FAIL: Matching educator mapped to the portfolio leader was allowed to submit.';
    EXCEPTION
      WHEN OTHERS THEN
        IF SQLERRM LIKE '%permission%'
           OR SQLERRM LIKE '%student profile%' THEN
          RAISE NOTICE 'PASS: Matching educator mapped to the portfolio leader cannot submit.';
        ELSE
          RAISE EXCEPTION 'FAIL: Matching educator submit unexpected error: %', SQLERRM;
        END IF;
    END;
  END IF;

  IF v_admin_profile_id IS NULL THEN
    RAISE NOTICE 'SKIP: No admin profile for admin-submit test.';
  ELSE
    PERFORM pg_temp.set_auth_user(v_admin_profile_id);
    BEGIN
      PERFORM * FROM submit_portfolio(
        v_portfolio_id,
        'Admin submission',
        'https://example.com/portfolio',
        NULL
      );
      RAISE EXCEPTION 'FAIL: Admin was allowed to submit via student RPC.';
    EXCEPTION
      WHEN OTHERS THEN
        IF SQLERRM LIKE '%permission%'
           OR SQLERRM LIKE '%student profile%' THEN
          RAISE NOTICE 'PASS: Admin cannot submit via student RPC.';
        ELSE
          RAISE EXCEPTION 'FAIL: Admin submit unexpected error: %', SQLERRM;
        END IF;
    END;
  END IF;

  IF v_external_profile_id IS NULL THEN
    RAISE NOTICE 'SKIP: No external member for external-submit test.';
  ELSE
    PERFORM pg_temp.set_auth_user(v_external_profile_id);
    BEGIN
      PERFORM * FROM submit_portfolio(
        v_portfolio_id,
        'External submission',
        'https://example.com/portfolio',
        NULL
      );
      RAISE EXCEPTION 'FAIL: External member was allowed to submit.';
    EXCEPTION
      WHEN OTHERS THEN
        IF SQLERRM LIKE '%permission%'
           OR SQLERRM LIKE '%student profile%' THEN
          RAISE NOTICE 'PASS: External member cannot submit.';
        ELSE
          RAISE EXCEPTION 'FAIL: External submit unexpected error: %', SQLERRM;
        END IF;
    END;
  END IF;

  -- -------------------------------------------------------------------------
  -- Locked portfolio — authenticate as the locked portfolio's own leader
  -- -------------------------------------------------------------------------
  IF v_locked_portfolio_id IS NULL OR v_locked_leader_profile_id IS NULL THEN
    RAISE NOTICE 'SKIP: No locked portfolio with resolvable leader for locked-submit test.';
  ELSE
    PERFORM pg_temp.set_auth_user(v_locked_leader_profile_id);
    BEGIN
      PERFORM * FROM submit_portfolio(
        v_locked_portfolio_id,
        'Locked submission',
        'https://example.com/portfolio',
        NULL
      );
      RAISE EXCEPTION 'FAIL: Locked portfolio submission was allowed.';
    EXCEPTION
      WHEN OTHERS THEN
        IF SQLERRM LIKE '%This portfolio is locked.%' THEN
          RAISE NOTICE 'PASS: Locked portfolio cannot submit (locked-status guard).';
        ELSIF SQLERRM LIKE '%not the current portfolio leader%' THEN
          RAISE EXCEPTION
            'FAIL: Locked portfolio test hit not-leader error instead of locked-status guard: %',
            SQLERRM;
        ELSE
          RAISE EXCEPTION 'FAIL: Locked portfolio unexpected error: %', SQLERRM;
        END IF;
    END;
  END IF;

  -- -------------------------------------------------------------------------
  -- Nested-subtransaction fixtures (auto-restored by savepoint rollback)
  -- -------------------------------------------------------------------------

  -- Missing studio booking
  BEGIN
    PERFORM pg_temp.elevate_for_fixture();

    DELETE FROM studio_bookings
    WHERE portfolio_output_id = v_portfolio_id;

    PERFORM pg_temp.set_auth_user(v_leader_profile_id);

    BEGIN
      PERFORM * FROM submit_portfolio(
        v_portfolio_id,
        'Missing Booking Title',
        'https://example.com/portfolio',
        NULL
      );
      RAISE EXCEPTION 'FAIL: Missing studio booking was accepted.';
    EXCEPTION
      WHEN OTHERS THEN
        IF SQLERRM LIKE '%studio booking is required%' THEN
          NULL;
        ELSE
          RAISE EXCEPTION
            'FAIL: Missing booking unexpected error: %', SQLERRM;
        END IF;
    END;

    RAISE EXCEPTION 'ROLLBACK_FIXTURE_MISSING_BOOKING';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'ROLLBACK_FIXTURE_MISSING_BOOKING' THEN
        RAISE NOTICE 'PASS: Missing studio booking blocked.';
      ELSE
        RAISE;
      END IF;
  END;

  -- workflow_status = awaiting_booking
  BEGIN
    PERFORM pg_temp.elevate_for_fixture();

    UPDATE portfolio_outputs
    SET workflow_status = 'awaiting_booking'
    WHERE id = v_portfolio_id;

    PERFORM pg_temp.set_auth_user(v_leader_profile_id);

    BEGIN
      PERFORM * FROM submit_portfolio(
        v_portfolio_id,
        'Awaiting Booking Title',
        'https://example.com/portfolio',
        NULL
      );
      RAISE EXCEPTION 'FAIL: awaiting_booking status was allowed to submit.';
    EXCEPTION
      WHEN OTHERS THEN
        IF SQLERRM LIKE '%not awaiting submission%' THEN
          NULL;
        ELSE
          RAISE EXCEPTION
            'FAIL: awaiting_booking unexpected error: %', SQLERRM;
        END IF;
    END;

    RAISE EXCEPTION 'ROLLBACK_FIXTURE_AWAITING_BOOKING';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'ROLLBACK_FIXTURE_AWAITING_BOOKING' THEN
        RAISE NOTICE 'PASS: awaiting_booking cannot submit.';
      ELSE
        RAISE;
      END IF;
  END;

  -- Non-Stage-3 team
  BEGIN
    PERFORM pg_temp.elevate_for_fixture();

    UPDATE teams
    SET current_stage_number = 2
    WHERE id = v_team_id;

    PERFORM pg_temp.set_auth_user(v_leader_profile_id);

    BEGIN
      PERFORM * FROM submit_portfolio(
        v_portfolio_id,
        'Non Stage 3 Title',
        'https://example.com/portfolio',
        NULL
      );
      RAISE EXCEPTION 'FAIL: Non-Stage-3 team was allowed to submit.';
    EXCEPTION
      WHEN OTHERS THEN
        IF SQLERRM LIKE '%permission%' THEN
          NULL;
        ELSE
          RAISE EXCEPTION
            'FAIL: Non-Stage-3 unexpected error: %', SQLERRM;
        END IF;
    END;

    RAISE EXCEPTION 'ROLLBACK_FIXTURE_NON_STAGE_3';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'ROLLBACK_FIXTURE_NON_STAGE_3' THEN
        RAISE NOTICE 'PASS: Non-Stage-3 team cannot submit.';
      ELSE
        RAISE;
      END IF;
  END;

  -- -------------------------------------------------------------------------
  -- Input validation (leader context)
  -- -------------------------------------------------------------------------
  PERFORM pg_temp.set_auth_user(v_leader_profile_id);

  BEGIN
    PERFORM * FROM submit_portfolio(
      v_portfolio_id,
      '   ',
      'https://example.com/portfolio',
      NULL
    );
    RAISE EXCEPTION 'FAIL: Blank title was accepted.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%Portfolio title is required%' THEN
        RAISE NOTICE 'PASS: Missing title blocked.';
      ELSE
        RAISE EXCEPTION 'FAIL: Missing title unexpected error: %', SQLERRM;
      END IF;
  END;

  BEGIN
    PERFORM * FROM submit_portfolio(
      v_portfolio_id,
      'ab',
      'https://example.com/portfolio',
      NULL
    );
    RAISE EXCEPTION 'FAIL: Short title was accepted.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%between 3 and 150%' THEN
        RAISE NOTICE 'PASS: Short title blocked.';
      ELSE
        RAISE EXCEPTION 'FAIL: Short title unexpected error: %', SQLERRM;
      END IF;
  END;

  BEGIN
    PERFORM * FROM submit_portfolio(
      v_portfolio_id,
      repeat('t', 151),
      'https://example.com/portfolio',
      NULL
    );
    RAISE EXCEPTION 'FAIL: Overlong title was accepted.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%between 3 and 150%' THEN
        RAISE NOTICE 'PASS: Overlong title blocked.';
      ELSE
        RAISE EXCEPTION 'FAIL: Overlong title unexpected error: %', SQLERRM;
      END IF;
  END;

  BEGIN
    PERFORM * FROM submit_portfolio(
      v_portfolio_id,
      'Valid Portfolio Title',
      '   ',
      NULL
    );
    RAISE EXCEPTION 'FAIL: Blank URL was accepted.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%HTTP or HTTPS%' THEN
        RAISE NOTICE 'PASS: Missing URL blocked.';
      ELSE
        RAISE EXCEPTION 'FAIL: Missing URL unexpected error: %', SQLERRM;
      END IF;
  END;

  BEGIN
    PERFORM * FROM submit_portfolio(
      v_portfolio_id,
      'Valid Portfolio Title',
      'javascript:alert(1)',
      NULL
    );
    RAISE EXCEPTION 'FAIL: javascript: URL was accepted.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%HTTP or HTTPS%' THEN
        RAISE NOTICE 'PASS: Invalid URL scheme blocked.';
      ELSE
        RAISE EXCEPTION 'FAIL: Invalid scheme unexpected error: %', SQLERRM;
      END IF;
  END;

  BEGIN
    PERFORM * FROM submit_portfolio(
      v_portfolio_id,
      'Valid Portfolio Title',
      '/relative/path',
      NULL
    );
    RAISE EXCEPTION 'FAIL: Relative URL was accepted.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%HTTP or HTTPS%' THEN
        RAISE NOTICE 'PASS: Relative URL blocked.';
      ELSE
        RAISE EXCEPTION 'FAIL: Relative URL unexpected error: %', SQLERRM;
      END IF;
  END;

  BEGIN
    PERFORM * FROM submit_portfolio(
      v_portfolio_id,
      'Valid Portfolio Title',
      'https://example.com/portfolio',
      repeat('n', 2001)
    );
    RAISE EXCEPTION 'FAIL: Overlong notes were accepted.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%2000 characters%' THEN
        RAISE NOTICE 'PASS: Overlong notes blocked.';
      ELSE
        RAISE EXCEPTION 'FAIL: Overlong notes unexpected error: %', SQLERRM;
      END IF;
  END;

  -- -------------------------------------------------------------------------
  -- Successful HTTPS submission (authoritative path)
  -- -------------------------------------------------------------------------
  SELECT title, portfolio_url, notes
  INTO v_title, v_url, v_notes
  FROM submit_portfolio(
    v_portfolio_id,
    'Photography Final Portfolio',
    'https://behance.net/example-portfolio',
    'Optional submission notes'
  );

  IF v_title IS DISTINCT FROM 'Photography Final Portfolio' THEN
    RAISE EXCEPTION 'FAIL: Unexpected returned title %.', v_title;
  END IF;

  IF v_url IS DISTINCT FROM 'https://behance.net/example-portfolio' THEN
    RAISE EXCEPTION 'FAIL: Unexpected returned URL %.', v_url;
  END IF;

  RAISE NOTICE 'PASS: Valid HTTPS link succeeds via submit_portfolio.';

  SELECT count(*)
  INTO v_submission_count
  FROM portfolio_submissions
  WHERE portfolio_output_id = v_portfolio_id
    AND version_number = 1;

  IF v_submission_count <> 1 THEN
    RAISE EXCEPTION
      'FAIL: Expected exactly one version 1 submission, found %.',
      v_submission_count;
  END IF;

  RAISE NOTICE 'PASS: Exactly one version 1 submission created.';

  SELECT workflow_status::text
  INTO v_workflow
  FROM portfolio_outputs
  WHERE id = v_portfolio_id;

  IF v_workflow <> 'pending_educator' THEN
    RAISE EXCEPTION 'FAIL: Expected pending_educator, got %.', v_workflow;
  END IF;

  RAISE NOTICE 'PASS: Portfolio becomes pending_educator.';

  SELECT current_stage_number
  INTO v_stage
  FROM teams
  WHERE id = v_team_id;

  IF v_stage <> 3 THEN
    RAISE EXCEPTION 'FAIL: Team left Stage 3 (now %).', v_stage;
  END IF;

  RAISE NOTICE 'PASS: Team stays in Stage 3.';

  IF v_makeup_portfolio_id IS NOT NULL THEN
    SELECT workflow_status::text INTO v_workflow
    FROM portfolio_outputs WHERE id = v_makeup_portfolio_id;
    IF v_workflow <> 'locked' THEN
      RAISE EXCEPTION 'FAIL: Makeup portfolio status changed to %.', v_workflow;
    END IF;
  END IF;

  IF v_hair_portfolio_id IS NOT NULL THEN
    SELECT workflow_status::text INTO v_workflow
    FROM portfolio_outputs WHERE id = v_hair_portfolio_id;
    IF v_workflow <> 'locked' THEN
      RAISE EXCEPTION 'FAIL: Hairstyling portfolio status changed to %.', v_workflow;
    END IF;
  END IF;

  RAISE NOTICE 'PASS: Makeup and Hairstyling stay locked.';

  -- Snapshot on portfolio_outputs must match authoritative submission row
  SELECT
    po.portfolio_title,
    po.portfolio_link,
    po.notes,
    po.submitted_at,
    ps.title,
    ps.portfolio_url,
    ps.notes,
    ps.created_at
  INTO
    v_snapshot_title,
    v_snapshot_link,
    v_snapshot_notes,
    v_snapshot_submitted_at,
    v_hist_title,
    v_hist_url,
    v_hist_notes,
    v_hist_created_at
  FROM portfolio_outputs po
  JOIN portfolio_submissions ps
    ON ps.portfolio_output_id = po.id
   AND ps.version_number = 1
  WHERE po.id = v_portfolio_id;

  IF v_snapshot_title IS DISTINCT FROM v_hist_title
     OR v_snapshot_link IS DISTINCT FROM v_hist_url
     OR v_snapshot_notes IS DISTINCT FROM v_hist_notes
     OR v_snapshot_submitted_at IS DISTINCT FROM v_hist_created_at THEN
    RAISE EXCEPTION
      'FAIL: portfolio_outputs latest snapshot does not match portfolio_submissions row.';
  END IF;

  RAISE NOTICE 'PASS: portfolio_outputs latest snapshot matches submission row.';

  -- Duplicate initial submission blocked
  BEGIN
    PERFORM * FROM submit_portfolio(
      v_portfolio_id,
      'Duplicate Portfolio Title',
      'https://example.com/again',
      NULL
    );
    RAISE EXCEPTION 'FAIL: Duplicate submission was allowed.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%already been submitted%'
         OR SQLERRM LIKE '%not awaiting submission%' THEN
        RAISE NOTICE 'PASS: Duplicate initial submission blocked.';
      ELSE
        RAISE EXCEPTION 'FAIL: Duplicate submit unexpected error: %', SQLERRM;
      END IF;
  END;

  -- Direct insert / update / delete remain blocked
  BEGIN
    INSERT INTO portfolio_submissions (
      portfolio_output_id,
      version_number,
      title,
      portfolio_url,
      submitted_by_student_id,
      created_by
    ) VALUES (
      v_portfolio_id,
      2,
      'Direct Insert',
      'https://example.com/direct',
      v_leader_student_id,
      v_leader_profile_id
    );
    RAISE EXCEPTION 'FAIL: Direct insert was allowed.';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'PASS: Direct insert blocked.';
    WHEN OTHERS THEN
      IF SQLERRM ILIKE '%policy%' OR SQLERRM ILIKE '%permission%' THEN
        RAISE NOTICE 'PASS: Direct insert blocked.';
      ELSE
        RAISE EXCEPTION 'FAIL: Direct insert unexpected error: %', SQLERRM;
      END IF;
  END;

  BEGIN
    UPDATE portfolio_submissions
    SET title = 'Hacked Title'
    WHERE portfolio_output_id = v_portfolio_id
      AND version_number = 1;
    IF FOUND THEN
      RAISE EXCEPTION 'FAIL: Direct update was allowed.';
    ELSE
      IF EXISTS (
        SELECT 1 FROM portfolio_submissions
        WHERE portfolio_output_id = v_portfolio_id
          AND version_number = 1
          AND title = 'Hacked Title'
      ) THEN
        RAISE EXCEPTION 'FAIL: Direct update persisted.';
      END IF;
      RAISE NOTICE 'PASS: Update blocked.';
    END IF;
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'PASS: Update blocked.';
    WHEN OTHERS THEN
      IF SQLERRM ILIKE '%policy%' OR SQLERRM ILIKE '%permission%' THEN
        RAISE NOTICE 'PASS: Update blocked.';
      ELSE
        RAISE;
      END IF;
  END;

  BEGIN
    DELETE FROM portfolio_submissions
    WHERE portfolio_output_id = v_portfolio_id
      AND version_number = 1;
    IF FOUND THEN
      RAISE EXCEPTION 'FAIL: Direct delete was allowed.';
    ELSE
      IF EXISTS (
        SELECT 1 FROM portfolio_submissions
        WHERE portfolio_output_id = v_portfolio_id
          AND version_number = 1
      ) THEN
        RAISE NOTICE 'PASS: Delete blocked.';
      ELSE
        RAISE EXCEPTION 'FAIL: Direct delete removed the row.';
      END IF;
    END IF;
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'PASS: Delete blocked.';
    WHEN OTHERS THEN
      IF SQLERRM ILIKE '%policy%' OR SQLERRM ILIKE '%permission%' THEN
        RAISE NOTICE 'PASS: Delete blocked.';
      ELSE
        RAISE;
      END IF;
  END;

  -- Read visibility
  IF v_assistant_profile_id IS NOT NULL THEN
    PERFORM pg_temp.set_auth_user(v_assistant_profile_id);
    SELECT count(*) INTO v_read_count
    FROM portfolio_submissions
    WHERE portfolio_output_id = v_portfolio_id;
    IF v_read_count < 1 THEN
      RAISE EXCEPTION 'FAIL: Team member cannot read submission.';
    END IF;
    RAISE NOTICE 'PASS: Team members can read the submission.';
  ELSE
    RAISE NOTICE 'SKIP: No assistant for team-member read test.';
  END IF;

  IF v_other_profile_id IS NOT NULL THEN
    PERFORM pg_temp.set_auth_user(v_other_profile_id);
    SELECT count(*) INTO v_read_count
    FROM portfolio_submissions
    WHERE portfolio_output_id = v_portfolio_id;
    IF v_read_count <> 0 THEN
      RAISE EXCEPTION 'FAIL: Unrelated student can read submission.';
    END IF;
    RAISE NOTICE 'PASS: Unrelated student cannot read it.';
  ELSE
    RAISE NOTICE 'SKIP: No unrelated student for read isolation test.';
  END IF;

  IF v_educator_profile_id IS NOT NULL THEN
    -- Authenticate as the matching educator mapped to the portfolio leader.
    PERFORM pg_temp.set_auth_user(v_educator_profile_id);
    SELECT count(*) INTO v_read_count
    FROM portfolio_submissions
    WHERE portfolio_output_id = v_portfolio_id;
    IF v_read_count < 1 THEN
      RAISE EXCEPTION 'FAIL: Matching educator mapped to the portfolio leader cannot read submission.';
    END IF;
    RAISE NOTICE 'PASS: Matching educator mapped to the portfolio leader can read submission.';
  ELSE
    RAISE NOTICE 'SKIP: No active matching educator mapping exists for the portfolio leader.';
  END IF;

  IF v_admin_profile_id IS NOT NULL THEN
    PERFORM pg_temp.set_auth_user(v_admin_profile_id);
    SELECT count(*) INTO v_read_count
    FROM portfolio_submissions
    WHERE portfolio_output_id = v_portfolio_id;
    IF v_read_count < 1 THEN
      RAISE EXCEPTION 'FAIL: Admin cannot read submission.';
    END IF;
    RAISE NOTICE 'PASS: Admin can read it.';
  ELSE
    RAISE NOTICE 'SKIP: No admin for admin-read test.';
  END IF;

  IF v_external_profile_id IS NOT NULL THEN
    PERFORM pg_temp.set_auth_user(v_external_profile_id);
    SELECT count(*) INTO v_read_count
    FROM portfolio_submissions
    WHERE portfolio_output_id = v_portfolio_id;
    IF v_read_count <> 0 THEN
      RAISE EXCEPTION 'FAIL: External member can read submission.';
    END IF;
    RAISE NOTICE 'PASS: External member cannot read it.';
  ELSE
    RAISE NOTICE 'SKIP: No external member for external-read test.';
  END IF;

  RAISE NOTICE 'PASS: Package C RPC checks completed inside transaction.';
END;
$$;

ROLLBACK;
