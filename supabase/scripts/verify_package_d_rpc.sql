-- =============================================================================
-- IncluHub Dashboard — Package D1 RPC integration checks (ROLLBACK safe)
-- =============================================================================
--
-- SIMULATED-AUTH SQL TESTS ONLY — all mutations run inside BEGIN … ROLLBACK.
-- Prerequisites:
-- - Migration 011 applied
-- - Policy 006 applied
-- - At least one Stage 3 Photography portfolio in pending_educator with a
--   latest portfolio_submissions row and matching team_educators mapping
--   (team_educators.student_id = portfolio_outputs.leader_student_id)
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
  RESET ROLE;
END;
$$;

DO $$
DECLARE
  v_team_id uuid;
  v_portfolio_id uuid;
  v_leader_student_id uuid;
  v_leader_profile_id uuid;
  v_assistant_profile_id uuid;
  v_other_student_profile_id uuid;
  v_matching_educator_profile_id uuid;
  v_wrong_student_educator_profile_id uuid;
  v_unrelated_educator_profile_id uuid;
  v_admin_profile_id uuid;
  v_external_profile_id uuid;
  v_makeup_id uuid;
  v_hair_id uuid;
  v_submission_id uuid;
  v_newer_submission_id uuid;
  v_version integer;
  v_workflow text;
  v_route text;
  v_review_id uuid;
  v_decision text;
  v_next_id uuid;
  v_team_stage integer;
  v_active_count integer;
  v_stage3_status text;
  v_stage4_status text;
  v_booking_count_before integer;
  v_booking_count_after integer;
  v_read_count integer;
  v_makeup_leader_student_id uuid;
  v_makeup_leader_profile_id uuid;
  v_makeup_educator_profile_id uuid;
  v_hair_leader_student_id uuid;
  v_hair_leader_profile_id uuid;
  v_hair_educator_profile_id uuid;
  v_makeup_submission_id uuid;
  v_hair_submission_id uuid;
  v_start_version integer;
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
  WHERE po.workflow_status = 'pending_educator'
    AND po.sequence_order = 1
    AND t.current_stage_number = 3
    AND t.status = 'active'
    AND EXISTS (
      SELECT 1
      FROM portfolio_submissions ps
      WHERE ps.portfolio_output_id = po.id
    )
    AND NOT EXISTS (
      SELECT 1
      FROM portfolio_submissions ps
      JOIN portfolio_reviews pr ON pr.portfolio_submission_id = ps.id
      WHERE ps.portfolio_output_id = po.id
    )
  ORDER BY po.created_at ASC
  LIMIT 1;

  IF v_portfolio_id IS NULL THEN
    RAISE NOTICE 'SKIP: No Stage 3 Photography portfolio in pending_educator with an unreviewed submission.';
    RETURN;
  END IF;

  SELECT ps.id, ps.version_number
  INTO v_submission_id, v_version
  FROM portfolio_submissions ps
  WHERE ps.portfolio_output_id = v_portfolio_id
  ORDER BY ps.version_number DESC
  LIMIT 1;

  v_start_version := v_version;

  SELECT id INTO v_makeup_id
  FROM portfolio_outputs
  WHERE team_id = v_team_id AND sequence_order = 2;

  SELECT id INTO v_hair_id
  FROM portfolio_outputs
  WHERE team_id = v_team_id AND sequence_order = 3;

  IF v_makeup_id IS NULL OR v_hair_id IS NULL THEN
    RAISE EXCEPTION 'FAIL: Expected Makeup and Hairstyling portfolios for team %', v_team_id;
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
  INTO v_matching_educator_profile_id
  FROM team_educators te
  JOIN educators e ON e.id = te.educator_id
  JOIN profiles p ON p.id = e.user_id
  WHERE te.team_id = v_team_id
    AND te.student_id = v_leader_student_id
    AND te.status = 'active'
    AND e.status = 'active'
    AND p.status = 'active'
    AND p.role = 'educator'
  LIMIT 1;

  IF v_matching_educator_profile_id IS NULL THEN
    RAISE EXCEPTION
      'FAIL: No matching educator mapping (team_educators.student_id = leader) for portfolio %',
      v_portfolio_id;
  END IF;

  SELECT p.id
  INTO v_wrong_student_educator_profile_id
  FROM team_educators te
  JOIN educators e ON e.id = te.educator_id
  JOIN profiles p ON p.id = e.user_id
  WHERE te.team_id = v_team_id
    AND te.student_id <> v_leader_student_id
    AND te.status = 'active'
    AND e.status = 'active'
    AND p.status = 'active'
    AND p.role = 'educator'
    AND p.id <> v_matching_educator_profile_id
  LIMIT 1;

  SELECT p.id
  INTO v_unrelated_educator_profile_id
  FROM profiles p
  JOIN educators e ON e.user_id = p.id
  WHERE p.role = 'educator'
    AND p.status = 'active'
    AND e.status = 'active'
    AND NOT EXISTS (
      SELECT 1
      FROM team_educators te
      WHERE te.team_id = v_team_id
        AND te.educator_id = e.id
        AND te.status = 'active'
    )
  LIMIT 1;

  SELECT id INTO v_admin_profile_id
  FROM profiles
  WHERE role = 'admin' AND status = 'active'
  LIMIT 1;

  IF v_admin_profile_id IS NULL THEN
    RAISE EXCEPTION 'FAIL: No active admin profile found for Package D RPC tests.';
  END IF;

  SELECT id INTO v_external_profile_id
  FROM profiles
  WHERE role = 'external_member' AND status = 'active'
  LIMIT 1;

  SELECT p.id
  INTO v_other_student_profile_id
  FROM students s
  JOIN profiles p ON p.id = s.user_id
  WHERE s.status = 'active'
    AND NOT EXISTS (
      SELECT 1
      FROM team_members tm
      WHERE tm.team_id = v_team_id
        AND tm.student_id = s.id
        AND tm.member_status = 'active'
    )
  LIMIT 1;

  RAISE NOTICE 'Using Photography portfolio % on team % (submission % v%)',
    v_portfolio_id, v_team_id, v_submission_id, v_version;

  -- 3. Wrong student's Educator is blocked
  IF v_wrong_student_educator_profile_id IS NULL THEN
    RAISE NOTICE 'SKIP: No other-team-student educator for wrong-student educator test.';
  ELSE
    PERFORM pg_temp.set_auth_user(v_wrong_student_educator_profile_id);
    BEGIN
      PERFORM * FROM review_portfolio_as_educator(
        v_portfolio_id, v_submission_id, 'approved', NULL
      );
      RAISE EXCEPTION 'FAIL: Wrong-student educator was allowed to review.';
    EXCEPTION
      WHEN OTHERS THEN
        IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF;
        IF SQLERRM = 'You are not the matching educator for this portfolio.' THEN
          RAISE NOTICE 'PASS: Wrong-student educator blocked (expected matching-educator guard).';
        ELSE
          RAISE EXCEPTION 'FAIL: Wrong-student educator unexpected error: %', SQLERRM;
        END IF;
    END;
  END IF;

  -- 4. Unrelated Educator is blocked
  IF v_unrelated_educator_profile_id IS NULL THEN
    RAISE NOTICE 'SKIP: No unrelated educator for unrelated-educator test.';
  ELSE
    PERFORM pg_temp.set_auth_user(v_unrelated_educator_profile_id);
    BEGIN
      PERFORM * FROM review_portfolio_as_educator(
        v_portfolio_id, v_submission_id, 'approved', NULL
      );
      RAISE EXCEPTION 'FAIL: Unrelated educator was allowed to review.';
    EXCEPTION
      WHEN OTHERS THEN
        IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF;
        IF SQLERRM = 'You are not the matching educator for this portfolio.' THEN
          RAISE NOTICE 'PASS: Unrelated educator blocked (expected matching-educator guard).';
        ELSE
          RAISE EXCEPTION 'FAIL: Unrelated educator unexpected error: %', SQLERRM;
        END IF;
    END;
  END IF;

  -- 5. External member is blocked
  IF v_external_profile_id IS NULL THEN
    RAISE NOTICE 'SKIP: No external member for external-review test.';
  ELSE
    PERFORM pg_temp.set_auth_user(v_external_profile_id);
    BEGIN
      PERFORM * FROM review_portfolio_as_educator(
        v_portfolio_id, v_submission_id, 'approved', NULL
      );
      RAISE EXCEPTION 'FAIL: External member was allowed educator review.';
    EXCEPTION
      WHEN OTHERS THEN
        IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF;
        IF SQLERRM = 'You do not have permission to perform this action.' THEN
          RAISE NOTICE 'PASS: External member blocked (expected permission guard).';
        ELSE
          RAISE EXCEPTION 'FAIL: External member unexpected error: %', SQLERRM;
        END IF;
    END;
  END IF;

  -- 6. Stale submission ID is blocked
  PERFORM pg_temp.elevate_for_fixture();
  INSERT INTO portfolio_submissions (
    portfolio_output_id,
    version_number,
    title,
    portfolio_url,
    notes,
    submitted_by_student_id,
    created_by
  )
  VALUES (
    v_portfolio_id,
    v_version + 1,
    'Temp newer version for stale test',
    'https://example.com/temp-newer',
    NULL,
    v_leader_student_id,
    v_leader_profile_id
  )
  RETURNING id INTO v_newer_submission_id;

  PERFORM pg_temp.set_auth_user(v_matching_educator_profile_id);
  BEGIN
    PERFORM * FROM review_portfolio_as_educator(
      v_portfolio_id, v_submission_id, 'approved', NULL
    );
    RAISE EXCEPTION 'FAIL: Stale submission review was allowed.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF;
      IF SQLERRM = 'Only the latest portfolio submission can be reviewed.' THEN
        RAISE NOTICE 'PASS: Stale submission blocked (expected latest-version guard).';
      ELSE
        RAISE EXCEPTION 'FAIL: Stale submission unexpected error: %', SQLERRM;
      END IF;
  END;

  PERFORM pg_temp.elevate_for_fixture();
  DELETE FROM portfolio_submissions WHERE id = v_newer_submission_id;

  SELECT ps.id, ps.version_number
  INTO v_submission_id, v_version
  FROM portfolio_submissions ps
  WHERE ps.portfolio_output_id = v_portfolio_id
  ORDER BY ps.version_number DESC
  LIMIT 1;

  -- 8. Educator revision without comments is blocked
  PERFORM pg_temp.set_auth_user(v_matching_educator_profile_id);
  BEGIN
    PERFORM * FROM review_portfolio_as_educator(
      v_portfolio_id, v_submission_id, 'revision_required', '   '
    );
    RAISE EXCEPTION 'FAIL: Educator revision without comments was allowed.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF;
      IF SQLERRM = 'Revision comments are required.' THEN
        RAISE NOTICE 'PASS: Educator revision without comments blocked (expected comments guard).';
      ELSE
        RAISE EXCEPTION 'FAIL: Educator revision without comments unexpected error: %', SQLERRM;
      END IF;
  END;

  -- 9. Educator revision sets revision_return_to educator
  SELECT review_id, decision, workflow_status
  INTO v_review_id, v_decision, v_workflow
  FROM review_portfolio_as_educator(
    v_portfolio_id,
    v_submission_id,
    'revision_required',
    'Please revise the lighting notes.'
  );

  IF v_decision <> 'revision_required' OR v_workflow <> 'revision_required' THEN
    RAISE EXCEPTION 'FAIL: Educator revision did not set revision_required (got %, %)',
      v_decision, v_workflow;
  END IF;

  SELECT revision_return_to::text INTO v_route
  FROM portfolio_outputs WHERE id = v_portfolio_id;

  IF v_route IS DISTINCT FROM 'educator' THEN
    RAISE EXCEPTION 'FAIL: Expected revision_return_to=educator, got %', v_route;
  END IF;
  RAISE NOTICE 'PASS: Educator revision routes to educator.';

  -- 7. Educator duplicate review is blocked
  -- After the successful revision above, workflow is already revision_required, so the
  -- portfolio-status guard may fire before the duplicate-review guard. Accept either.
  BEGIN
    PERFORM * FROM review_portfolio_as_educator(
      v_portfolio_id, v_submission_id, 'approved', NULL
    );
    RAISE EXCEPTION 'FAIL: Duplicate educator review was allowed.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF;
      IF SQLERRM = 'This portfolio submission has already been reviewed by an educator.' THEN
        RAISE NOTICE 'PASS: Duplicate educator review blocked (duplicate-review guard).';
      ELSIF SQLERRM = 'This portfolio is not awaiting educator review.' THEN
        RAISE NOTICE 'PASS: Duplicate educator review blocked (portfolio-status guard; prior review already left pending_educator).';
      ELSE
        RAISE EXCEPTION 'FAIL: Duplicate educator review unexpected error: %', SQLERRM;
      END IF;
  END;

  -- 10. Student assistant cannot resubmit
  IF v_assistant_profile_id IS NULL THEN
    RAISE NOTICE 'SKIP: No assistant for assistant-resubmit test.';
  ELSE
    PERFORM pg_temp.set_auth_user(v_assistant_profile_id);
    BEGIN
      PERFORM * FROM resubmit_portfolio(
        v_portfolio_id,
        'Assistant should fail',
        'https://example.com/assistant-fail',
        NULL
      );
      RAISE EXCEPTION 'FAIL: Assistant was allowed to resubmit.';
    EXCEPTION
      WHEN OTHERS THEN
        IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF;
        IF SQLERRM = 'You are not the current portfolio leader.' THEN
          RAISE NOTICE 'PASS: Assistant resubmit blocked (expected leader guard).';
        ELSE
          RAISE EXCEPTION 'FAIL: Assistant resubmit unexpected error: %', SQLERRM;
        END IF;
    END;
  END IF;

  -- 11-14. Leader resubmits version 2
  SELECT count(*) INTO v_booking_count_before
  FROM studio_bookings WHERE portfolio_output_id = v_portfolio_id;

  PERFORM pg_temp.set_auth_user(v_leader_profile_id);
  SELECT submission_id, version_number, workflow_status
  INTO v_submission_id, v_version, v_workflow
  FROM resubmit_portfolio(
    v_portfolio_id,
    'Revised Photography Portfolio',
    'https://example.com/photo-v2',
    'Addressed lighting feedback'
  );

  IF v_version <> v_start_version + 1 THEN
    RAISE EXCEPTION 'FAIL: Expected version %, got %', v_start_version + 1, v_version;
  END IF;
  IF v_workflow <> 'pending_educator' THEN
    RAISE EXCEPTION 'FAIL: Expected pending_educator after educator-route resubmit, got %', v_workflow;
  END IF;

  SELECT revision_return_to::text INTO v_route
  FROM portfolio_outputs WHERE id = v_portfolio_id;
  IF v_route IS NOT NULL THEN
    RAISE EXCEPTION 'FAIL: revision_return_to should be cleared after resubmit, got %', v_route;
  END IF;

  SELECT count(*) INTO v_booking_count_after
  FROM studio_bookings WHERE portfolio_output_id = v_portfolio_id;
  IF v_booking_count_after <> v_booking_count_before THEN
    RAISE EXCEPTION 'FAIL: Resubmit created or changed studio bookings.';
  END IF;
  RAISE NOTICE 'PASS: Leader resubmit v2 pending_educator; route cleared; no new booking.';

  -- 15. Admin review before Educator approval is blocked
  -- Soft-set pending_admin so the educator-approval guard is reachable (admin RPC
  -- rejects non-pending_admin statuses earlier with a different message).
  PERFORM pg_temp.elevate_for_fixture();
  UPDATE portfolio_outputs
  SET
    workflow_status = 'pending_admin',
    revision_return_to = NULL
  WHERE id = v_portfolio_id;

  PERFORM pg_temp.set_auth_user(v_admin_profile_id);
  BEGIN
    PERFORM * FROM review_portfolio_as_admin(
      v_portfolio_id, v_submission_id, 'approved', NULL
    );
    RAISE EXCEPTION 'FAIL: Admin review before educator approval was allowed.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF;
      IF SQLERRM = 'Educator approval is required before admin review.' THEN
        RAISE NOTICE 'PASS: Admin before educator approval blocked (expected educator-approval guard).';
      ELSE
        RAISE EXCEPTION 'FAIL: Admin before educator approval unexpected error: %', SQLERRM;
      END IF;
  END;

  PERFORM pg_temp.elevate_for_fixture();
  UPDATE portfolio_outputs
  SET
    workflow_status = 'pending_educator',
    revision_return_to = NULL
  WHERE id = v_portfolio_id;

  -- 1 / 2 / 16. Matching Educator approves version 2 → pending_admin
  PERFORM pg_temp.set_auth_user(v_matching_educator_profile_id);
  SELECT decision, workflow_status
  INTO v_decision, v_workflow
  FROM review_portfolio_as_educator(
    v_portfolio_id, v_submission_id, 'approved', NULL
  );

  IF v_decision <> 'approved' OR v_workflow <> 'pending_admin' THEN
    RAISE EXCEPTION 'FAIL: Educator approve v2 expected pending_admin, got % / %',
      v_decision, v_workflow;
  END IF;
  RAISE NOTICE 'PASS: Matching educator approved v2 → pending_admin.';

  -- 17. Admin revision without comments is blocked
  PERFORM pg_temp.set_auth_user(v_admin_profile_id);
  BEGIN
    PERFORM * FROM review_portfolio_as_admin(
      v_portfolio_id, v_submission_id, 'revision_required', ''
    );
    RAISE EXCEPTION 'FAIL: Admin revision without comments was allowed.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF;
      IF SQLERRM = 'Revision comments are required.' THEN
        RAISE NOTICE 'PASS: Admin revision without comments blocked (expected comments guard).';
      ELSE
        RAISE EXCEPTION 'FAIL: Admin revision without comments unexpected error: %', SQLERRM;
      END IF;
  END;

  -- 18. Admin revision sets revision_return_to admin
  SELECT decision, workflow_status
  INTO v_decision, v_workflow
  FROM review_portfolio_as_admin(
    v_portfolio_id,
    v_submission_id,
    'revision_required',
    'Please strengthen the concept statement.'
  );

  IF v_workflow <> 'revision_required' THEN
    RAISE EXCEPTION 'FAIL: Admin revision expected revision_required, got %', v_workflow;
  END IF;

  SELECT revision_return_to::text INTO v_route
  FROM portfolio_outputs WHERE id = v_portfolio_id;
  IF v_route IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'FAIL: Expected revision_return_to=admin, got %', v_route;
  END IF;
  RAISE NOTICE 'PASS: Admin revision routes to admin.';

  -- 19-20. Leader resubmits version 3 → pending_admin
  PERFORM pg_temp.set_auth_user(v_leader_profile_id);
  SELECT submission_id, version_number, workflow_status
  INTO v_submission_id, v_version, v_workflow
  FROM resubmit_portfolio(
    v_portfolio_id,
    'Photography Portfolio Final',
    'https://example.com/photo-v3',
    'Admin feedback addressed'
  );

  IF v_version <> v_start_version + 2 OR v_workflow <> 'pending_admin' THEN
    RAISE EXCEPTION 'FAIL: Expected v% pending_admin, got v% / %',
      v_start_version + 2, v_version, v_workflow;
  END IF;
  RAISE NOTICE 'PASS: Admin-route resubmit returns directly to pending_admin.';

  -- 21-26. Admin approves via revision chain; unlock Makeup
  PERFORM pg_temp.set_auth_user(v_admin_profile_id);
  SELECT
    decision,
    workflow_status,
    next_portfolio_output_id,
    team_stage_number
  INTO v_decision, v_workflow, v_next_id, v_team_stage
  FROM review_portfolio_as_admin(
    v_portfolio_id, v_submission_id, 'approved', NULL
  );

  IF v_decision <> 'approved' OR v_workflow <> 'completed' THEN
    RAISE EXCEPTION 'FAIL: Admin approve Photography expected completed, got % / %',
      v_decision, v_workflow;
  END IF;
  IF v_next_id IS DISTINCT FROM v_makeup_id THEN
    RAISE EXCEPTION 'FAIL: Expected next portfolio Makeup %, got %', v_makeup_id, v_next_id;
  END IF;
  RAISE NOTICE 'PASS: Admin approved v3 via admin revision chain without educator on v3.';

  SELECT workflow_status::text INTO v_workflow
  FROM portfolio_outputs WHERE id = v_portfolio_id;
  IF v_workflow <> 'completed' THEN
    RAISE EXCEPTION 'FAIL: Photography not completed (%).', v_workflow;
  END IF;

  SELECT workflow_status::text INTO v_workflow
  FROM portfolio_outputs WHERE id = v_makeup_id;
  IF v_workflow <> 'awaiting_booking' THEN
    RAISE EXCEPTION 'FAIL: Makeup expected awaiting_booking, got %', v_workflow;
  END IF;

  SELECT workflow_status::text INTO v_workflow
  FROM portfolio_outputs WHERE id = v_hair_id;
  IF v_workflow <> 'locked' THEN
    RAISE EXCEPTION 'FAIL: Hairstyling expected locked, got %', v_workflow;
  END IF;

  SELECT count(*) INTO v_active_count
  FROM portfolio_outputs
  WHERE team_id = v_team_id
    AND workflow_status IN (
      'awaiting_booking',
      'awaiting_submission',
      'pending_educator',
      'pending_admin',
      'revision_required'
    );
  IF v_active_count <> 1 THEN
    RAISE EXCEPTION 'FAIL: Expected exactly one active portfolio, got %', v_active_count;
  END IF;

  SELECT current_stage_number INTO v_team_stage FROM teams WHERE id = v_team_id;
  IF v_team_stage <> 3 THEN
    RAISE EXCEPTION 'FAIL: Team should remain Stage 3, got %', v_team_stage;
  END IF;
  RAISE NOTICE 'PASS: Photography completed; Makeup unlocked; Hair locked; team Stage 3.';

  -- 27. Simulate Makeup completion → Hairstyling unlock
  PERFORM pg_temp.elevate_for_fixture();

  SELECT po.leader_student_id, s.user_id
  INTO v_makeup_leader_student_id, v_makeup_leader_profile_id
  FROM portfolio_outputs po
  JOIN students s ON s.id = po.leader_student_id
  WHERE po.id = v_makeup_id;

  SELECT p.id
  INTO v_makeup_educator_profile_id
  FROM team_educators te
  JOIN educators e ON e.id = te.educator_id
  JOIN profiles p ON p.id = e.user_id
  WHERE te.team_id = v_team_id
    AND te.student_id = v_makeup_leader_student_id
    AND te.status = 'active'
  LIMIT 1;

  IF v_makeup_educator_profile_id IS NULL THEN
    RAISE EXCEPTION 'FAIL: No matching educator for Makeup leader.';
  END IF;

  UPDATE portfolio_outputs
  SET
    workflow_status = 'pending_educator',
    revision_return_to = NULL,
    portfolio_title = 'Makeup Portfolio',
    portfolio_link = 'https://example.com/makeup-v1',
    notes = NULL,
    submitted_at = now()
  WHERE id = v_makeup_id;

  INSERT INTO portfolio_submissions (
    portfolio_output_id,
    version_number,
    title,
    portfolio_url,
    notes,
    submitted_by_student_id,
    created_by
  )
  VALUES (
    v_makeup_id,
    1,
    'Makeup Portfolio',
    'https://example.com/makeup-v1',
    NULL,
    v_makeup_leader_student_id,
    v_makeup_leader_profile_id
  )
  RETURNING id INTO v_makeup_submission_id;

  PERFORM pg_temp.set_auth_user(v_makeup_educator_profile_id);
  PERFORM * FROM review_portfolio_as_educator(
    v_makeup_id, v_makeup_submission_id, 'approved', NULL
  );

  PERFORM pg_temp.set_auth_user(v_admin_profile_id);
  SELECT next_portfolio_output_id
  INTO v_next_id
  FROM review_portfolio_as_admin(
    v_makeup_id, v_makeup_submission_id, 'approved', NULL
  );

  IF v_next_id IS DISTINCT FROM v_hair_id THEN
    RAISE EXCEPTION 'FAIL: After Makeup approval expected Hair %, got %', v_hair_id, v_next_id;
  END IF;

  SELECT workflow_status::text INTO v_workflow FROM portfolio_outputs WHERE id = v_hair_id;
  IF v_workflow <> 'awaiting_booking' THEN
    RAISE EXCEPTION 'FAIL: Hairstyling expected awaiting_booking after Makeup, got %', v_workflow;
  END IF;
  RAISE NOTICE 'PASS: Makeup completed; Hairstyling unlocked.';

  -- 28-33. Final Hairstyling Admin approval → Stage 4
  PERFORM pg_temp.elevate_for_fixture();

  SELECT po.leader_student_id, s.user_id
  INTO v_hair_leader_student_id, v_hair_leader_profile_id
  FROM portfolio_outputs po
  JOIN students s ON s.id = po.leader_student_id
  WHERE po.id = v_hair_id;

  SELECT p.id
  INTO v_hair_educator_profile_id
  FROM team_educators te
  JOIN educators e ON e.id = te.educator_id
  JOIN profiles p ON p.id = e.user_id
  WHERE te.team_id = v_team_id
    AND te.student_id = v_hair_leader_student_id
    AND te.status = 'active'
  LIMIT 1;

  IF v_hair_educator_profile_id IS NULL THEN
    RAISE EXCEPTION 'FAIL: No matching educator for Hairstyling leader.';
  END IF;

  UPDATE portfolio_outputs
  SET
    workflow_status = 'pending_educator',
    revision_return_to = NULL,
    portfolio_title = 'Hairstyling Portfolio',
    portfolio_link = 'https://example.com/hair-v1',
    submitted_at = now()
  WHERE id = v_hair_id;

  INSERT INTO portfolio_submissions (
    portfolio_output_id,
    version_number,
    title,
    portfolio_url,
    notes,
    submitted_by_student_id,
    created_by
  )
  VALUES (
    v_hair_id,
    1,
    'Hairstyling Portfolio',
    'https://example.com/hair-v1',
    NULL,
    v_hair_leader_student_id,
    v_hair_leader_profile_id
  )
  RETURNING id INTO v_hair_submission_id;

  PERFORM pg_temp.set_auth_user(v_hair_educator_profile_id);
  PERFORM * FROM review_portfolio_as_educator(
    v_hair_id, v_hair_submission_id, 'approved', NULL
  );

  PERFORM pg_temp.set_auth_user(v_admin_profile_id);
  SELECT workflow_status, team_stage_number
  INTO v_workflow, v_team_stage
  FROM review_portfolio_as_admin(
    v_hair_id, v_hair_submission_id, 'approved', NULL
  );

  IF v_workflow <> 'completed' OR v_team_stage <> 4 THEN
    RAISE EXCEPTION 'FAIL: Final approval expected completed + stage 4, got % / %',
      v_workflow, v_team_stage;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM portfolio_outputs
    WHERE team_id = v_team_id
      AND sequence_order IN (1, 2, 3)
      AND workflow_status IS DISTINCT FROM 'completed'
  ) THEN
    RAISE EXCEPTION 'FAIL: Not all three portfolios completed after Hairstyling approval.';
  END IF;

  SELECT status::text INTO v_stage3_status
  FROM team_stage_progress
  WHERE team_id = v_team_id AND stage_number = 3;

  SELECT status::text INTO v_stage4_status
  FROM team_stage_progress
  WHERE team_id = v_team_id AND stage_number = 4;

  IF v_stage3_status <> 'completed' THEN
    RAISE EXCEPTION 'FAIL: Stage 3 progress expected completed, got %', v_stage3_status;
  END IF;
  IF v_stage4_status <> 'in_progress' THEN
    RAISE EXCEPTION 'FAIL: Stage 4 progress expected in_progress, got %', v_stage4_status;
  END IF;

  SELECT current_stage_number INTO v_team_stage FROM teams WHERE id = v_team_id;
  IF v_team_stage <> 4 THEN
    RAISE EXCEPTION 'FAIL: Team current_stage_number expected 4, got %', v_team_stage;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM team_members tm
    JOIN students s ON s.id = tm.student_id
    WHERE tm.team_id = v_team_id
      AND tm.member_status = 'active'
      AND s.current_stage_number IS DISTINCT FROM 4
  ) THEN
    RAISE EXCEPTION 'FAIL: Not all active team students moved to Stage 4.';
  END IF;
  RAISE NOTICE 'PASS: All portfolios completed; Stage 3→4 transition applied.';

  -- 34-36. Direct mutations blocked
  PERFORM pg_temp.set_auth_user(v_admin_profile_id);
  BEGIN
    INSERT INTO portfolio_reviews (
      portfolio_submission_id,
      reviewer_stage,
      reviewer_user_id,
      decision,
      comments,
      created_by
    )
    VALUES (
      v_submission_id,
      'admin',
      v_admin_profile_id,
      'approved',
      NULL,
      v_admin_profile_id
    );
    RAISE EXCEPTION 'FAIL: Direct INSERT into portfolio_reviews was allowed.';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'PASS: Direct INSERT blocked (insufficient_privilege).';
    WHEN OTHERS THEN
      IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF;
      RAISE NOTICE 'PASS: Direct INSERT blocked (%).', SQLERRM;
  END;

  BEGIN
    UPDATE portfolio_reviews
    SET comments = 'tamper'
    WHERE portfolio_submission_id = v_submission_id;
    IF FOUND THEN
      RAISE EXCEPTION 'FAIL: Direct UPDATE on portfolio_reviews was allowed.';
    END IF;
    RAISE NOTICE 'PASS: Direct UPDATE blocked (0 rows / no write path).';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'PASS: Direct UPDATE blocked (insufficient_privilege).';
    WHEN OTHERS THEN
      IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF;
      RAISE NOTICE 'PASS: Direct UPDATE blocked (%).', SQLERRM;
  END;

  BEGIN
    DELETE FROM portfolio_reviews WHERE portfolio_submission_id = v_submission_id;
    IF FOUND THEN
      RAISE EXCEPTION 'FAIL: Direct DELETE on portfolio_reviews was allowed.';
    END IF;
    RAISE NOTICE 'PASS: Direct DELETE blocked (0 rows / no write path).';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'PASS: Direct DELETE blocked (insufficient_privilege).';
    WHEN OTHERS THEN
      IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF;
      RAISE NOTICE 'PASS: Direct DELETE blocked (%).', SQLERRM;
  END;

  -- 37-42. RLS read matrix
  PERFORM pg_temp.set_auth_user(v_leader_profile_id);
  SELECT count(*) INTO v_read_count
  FROM portfolio_reviews pr
  JOIN portfolio_submissions ps ON ps.id = pr.portfolio_submission_id
  WHERE ps.portfolio_output_id = v_portfolio_id;
  IF v_read_count < 1 THEN
    RAISE EXCEPTION 'FAIL: Team leader could not read review feedback.';
  END IF;
  RAISE NOTICE 'PASS: Student team members can read review feedback (% rows).', v_read_count;

  IF v_assistant_profile_id IS NOT NULL THEN
    PERFORM pg_temp.set_auth_user(v_assistant_profile_id);
    SELECT count(*) INTO v_read_count
    FROM portfolio_reviews pr
    JOIN portfolio_submissions ps ON ps.id = pr.portfolio_submission_id
    WHERE ps.portfolio_output_id = v_portfolio_id;
    IF v_read_count < 1 THEN
      RAISE EXCEPTION 'FAIL: Assistant could not read review feedback.';
    END IF;
    RAISE NOTICE 'PASS: Assistant can read review feedback.';
  END IF;

  IF v_other_student_profile_id IS NULL THEN
    RAISE NOTICE 'SKIP: No unrelated student for read-denial test.';
  ELSE
    PERFORM pg_temp.set_auth_user(v_other_student_profile_id);
    SELECT count(*) INTO v_read_count
    FROM portfolio_reviews pr
    JOIN portfolio_submissions ps ON ps.id = pr.portfolio_submission_id
    WHERE ps.portfolio_output_id = v_portfolio_id;
    IF v_read_count <> 0 THEN
      RAISE EXCEPTION 'FAIL: Unrelated student could read reviews (%).', v_read_count;
    END IF;
    RAISE NOTICE 'PASS: Unrelated student cannot read reviews.';
  END IF;

  PERFORM pg_temp.set_auth_user(v_matching_educator_profile_id);
  SELECT count(*) INTO v_read_count
  FROM portfolio_reviews pr
  JOIN portfolio_submissions ps ON ps.id = pr.portfolio_submission_id
  WHERE ps.portfolio_output_id = v_portfolio_id;
  IF v_read_count < 1 THEN
    RAISE EXCEPTION 'FAIL: Matching educator could not read review history.';
  END IF;
  RAISE NOTICE 'PASS: Matching educator can read relevant review history.';

  IF v_wrong_student_educator_profile_id IS NULL THEN
    RAISE NOTICE 'SKIP: No other team educator for educator read-denial test.';
  ELSE
    PERFORM pg_temp.set_auth_user(v_wrong_student_educator_profile_id);
    SELECT count(*) INTO v_read_count
    FROM portfolio_reviews pr
    JOIN portfolio_submissions ps ON ps.id = pr.portfolio_submission_id
    WHERE ps.portfolio_output_id = v_portfolio_id;
    IF v_read_count <> 0 THEN
      RAISE EXCEPTION 'FAIL: Other team educator could read Photography reviews (%).',
        v_read_count;
    END IF;
    RAISE NOTICE 'PASS: Other team educator cannot read Photography reviews.';
  END IF;

  PERFORM pg_temp.set_auth_user(v_admin_profile_id);
  SELECT count(*) INTO v_read_count FROM portfolio_reviews;
  IF v_read_count < 1 THEN
    RAISE EXCEPTION 'FAIL: Admin could not read review history.';
  END IF;
  RAISE NOTICE 'PASS: Admin can read all review history (% rows visible in txn).', v_read_count;

  IF v_external_profile_id IS NULL THEN
    RAISE NOTICE 'SKIP: No external member for review read-denial test.';
  ELSE
    PERFORM pg_temp.set_auth_user(v_external_profile_id);
    SELECT count(*) INTO v_read_count
    FROM portfolio_reviews pr
    JOIN portfolio_submissions ps ON ps.id = pr.portfolio_submission_id
    WHERE ps.portfolio_output_id = v_portfolio_id;
    IF v_read_count <> 0 THEN
      RAISE EXCEPTION 'FAIL: External member could read reviews (%).', v_read_count;
    END IF;
    RAISE NOTICE 'PASS: External member cannot read reviews.';
  END IF;

  RAISE NOTICE 'Package D1 RPC verification assertions completed (transaction will ROLLBACK).';
END;
$$;

ROLLBACK;
