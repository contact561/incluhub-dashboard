-- =============================================================================
-- IncluHub Education Management Dashboard
-- Migration 012: Fix review_portfolio_as_admin workflow_status ambiguity
--
-- Runtime ERROR 42702: column reference "workflow_status" is ambiguous
-- Cause: RETURNS TABLE output variable workflow_status collided with
-- unqualified portfolio_outputs.workflow_status in sequence-loading SELECTs.
--
-- Do not edit migrations 001–011 in place.
-- Depends on: 011_portfolio_review_workflow.sql
-- =============================================================================

CREATE OR REPLACE FUNCTION public.review_portfolio_as_admin(
  p_portfolio_output_id uuid,
  p_submission_id uuid,
  p_decision text,
  p_comments text
)
RETURNS TABLE (
  portfolio_output_id uuid,
  submission_id uuid,
  review_id uuid,
  decision text,
  workflow_status text,
  next_portfolio_output_id uuid,
  team_stage_number integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_profile_id uuid;
  v_now timestamptz := now();
  v_decision portfolio_review_decision;
  v_comments text;
  v_portfolio record;
  v_team record;
  v_submission record;
  v_latest_version integer;
  v_prev_submission_id uuid;
  v_has_educator_approval boolean;
  v_has_admin_revision_chain boolean;
  v_review_id uuid;
  v_new_status portfolio_workflow_status;
  v_next_id uuid := NULL;
  v_seq1 uuid;
  v_seq2 uuid;
  v_seq3 uuid;
  v_seq1_status portfolio_workflow_status;
  v_seq2_status portfolio_workflow_status;
  v_seq3_status portfolio_workflow_status;
  v_stage3 record;
  v_stage4 record;
  r record;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'You do not have permission to perform this action.';
  END IF;

  v_profile_id := auth.uid();

  IF NOT EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = v_profile_id
      AND status = 'active'
      AND role = 'admin'
  ) OR NOT is_admin() THEN
    RAISE EXCEPTION 'You do not have permission to perform this action.';
  END IF;

  IF p_decision IS NULL OR btrim(p_decision) NOT IN ('approved', 'revision_required') THEN
    RAISE EXCEPTION 'You do not have permission to perform this action.';
  END IF;

  v_decision := btrim(p_decision)::portfolio_review_decision;
  v_comments := nullif(btrim(coalesce(p_comments, '')), '');

  IF v_decision = 'revision_required' THEN
    IF v_comments IS NULL THEN
      RAISE EXCEPTION 'Revision comments are required.';
    END IF;
  END IF;

  IF v_comments IS NOT NULL AND char_length(v_comments) > 2000 THEN
    RAISE EXCEPTION 'Comments cannot exceed 2000 characters.';
  END IF;

  SELECT
    po.id,
    po.team_id,
    po.leader_student_id,
    po.workflow_status,
    po.sequence_order
  INTO v_portfolio
  FROM portfolio_outputs po
  WHERE po.id = p_portfolio_output_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This portfolio is not awaiting admin review.';
  END IF;

  IF v_portfolio.workflow_status <> 'pending_admin' THEN
    RAISE EXCEPTION 'This portfolio is not awaiting admin review.';
  END IF;

  IF v_portfolio.sequence_order IS NULL
     OR v_portfolio.sequence_order NOT BETWEEN 1 AND 3 THEN
    RAISE EXCEPTION 'This portfolio is not awaiting admin review.';
  END IF;

  SELECT
    t.id,
    t.status,
    t.current_stage_number
  INTO v_team
  FROM teams t
  WHERE t.id = v_portfolio.team_id
  FOR UPDATE;

  IF NOT FOUND OR v_team.status <> 'active' THEN
    RAISE EXCEPTION 'You do not have permission to perform this action.';
  END IF;

  IF v_team.current_stage_number <> 3 THEN
    RAISE EXCEPTION 'You do not have permission to perform this action.';
  END IF;

  -- Lock all three portfolio rows in sequence order before unlock decisions.
  FOR r IN
    SELECT po.id
    FROM portfolio_outputs po
    WHERE po.team_id = v_team.id
      AND po.sequence_order IN (1, 2, 3)
    ORDER BY po.sequence_order ASC
    FOR UPDATE
  LOOP
    NULL;
  END LOOP;

  SELECT
    ps.id,
    ps.portfolio_output_id,
    ps.version_number
  INTO v_submission
  FROM portfolio_submissions ps
  WHERE ps.id = p_submission_id
  FOR UPDATE;

  IF NOT FOUND OR v_submission.portfolio_output_id <> p_portfolio_output_id THEN
    RAISE EXCEPTION 'This submission does not belong to the portfolio.';
  END IF;

  SELECT max(ps.version_number)
  INTO v_latest_version
  FROM portfolio_submissions ps
  WHERE ps.portfolio_output_id = p_portfolio_output_id;

  IF v_submission.version_number <> v_latest_version THEN
    RAISE EXCEPTION 'Only the latest portfolio submission can be reviewed.';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM portfolio_reviews pr
    WHERE pr.portfolio_submission_id = p_submission_id
      AND pr.reviewer_stage = 'educator'
      AND pr.decision = 'approved'
  )
  INTO v_has_educator_approval;

  v_has_admin_revision_chain := false;
  IF v_submission.version_number > 1 THEN
    SELECT ps.id
    INTO v_prev_submission_id
    FROM portfolio_submissions ps
    WHERE ps.portfolio_output_id = p_portfolio_output_id
      AND ps.version_number = v_submission.version_number - 1;

    IF v_prev_submission_id IS NOT NULL THEN
      SELECT EXISTS (
        SELECT 1
        FROM portfolio_reviews pr
        WHERE pr.portfolio_submission_id = v_prev_submission_id
          AND pr.reviewer_stage = 'admin'
          AND pr.decision = 'revision_required'
      )
      INTO v_has_admin_revision_chain;
    END IF;
  END IF;

  IF NOT v_has_educator_approval AND NOT v_has_admin_revision_chain THEN
    RAISE EXCEPTION 'Educator approval is required before admin review.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM portfolio_reviews pr
    WHERE pr.portfolio_submission_id = p_submission_id
      AND pr.reviewer_stage = 'admin'
  ) THEN
    RAISE EXCEPTION 'This portfolio submission has already been reviewed by an admin.';
  END IF;

  INSERT INTO public.portfolio_reviews (
    portfolio_submission_id,
    reviewer_stage,
    reviewer_user_id,
    decision,
    comments,
    created_by,
    created_at
  )
  VALUES (
    p_submission_id,
    'admin',
    v_profile_id,
    v_decision,
    CASE
      WHEN v_decision = 'approved' THEN NULL
      ELSE v_comments
    END,
    v_profile_id,
    v_now
  )
  ON CONFLICT ON CONSTRAINT portfolio_reviews_submission_stage_key
  DO NOTHING
  RETURNING id INTO v_review_id;

  IF v_review_id IS NULL THEN
    RAISE EXCEPTION
      'This portfolio submission has already been reviewed by an admin.';
  END IF;

  IF v_decision = 'revision_required' THEN
    UPDATE portfolio_outputs
    SET
      workflow_status = 'revision_required',
      revision_return_to = 'admin'
    WHERE id = p_portfolio_output_id;

    portfolio_output_id := p_portfolio_output_id;
    submission_id := p_submission_id;
    review_id := v_review_id;
    decision := v_decision::text;
    workflow_status := 'revision_required';
    next_portfolio_output_id := NULL;
    team_stage_number := v_team.current_stage_number;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Load sequence map after locks (table columns qualified to avoid collision
  -- with RETURNS TABLE output variable workflow_status).
  SELECT
    po.id,
    po.workflow_status
  INTO
    v_seq1,
    v_seq1_status
  FROM public.portfolio_outputs AS po
  WHERE po.team_id = v_team.id
    AND po.sequence_order = 1;

  SELECT
    po.id,
    po.workflow_status
  INTO
    v_seq2,
    v_seq2_status
  FROM public.portfolio_outputs AS po
  WHERE po.team_id = v_team.id
    AND po.sequence_order = 2;

  SELECT
    po.id,
    po.workflow_status
  INTO
    v_seq3,
    v_seq3_status
  FROM public.portfolio_outputs AS po
  WHERE po.team_id = v_team.id
    AND po.sequence_order = 3;

  IF v_seq1 IS NULL OR v_seq2 IS NULL OR v_seq3 IS NULL THEN
    RAISE EXCEPTION 'The portfolio submission could not be completed.';
  END IF;

  IF (
    v_portfolio.sequence_order = 1
    AND p_portfolio_output_id IS DISTINCT FROM v_seq1
  )
  OR (
    v_portfolio.sequence_order = 2
    AND p_portfolio_output_id IS DISTINCT FROM v_seq2
  )
  OR (
    v_portfolio.sequence_order = 3
    AND p_portfolio_output_id IS DISTINCT FROM v_seq3
  )
  THEN
    RAISE EXCEPTION 'This portfolio is not awaiting admin review.';
  END IF;

  -- Complete current portfolio
  UPDATE portfolio_outputs
  SET
    workflow_status = 'completed',
    revision_return_to = NULL,
    status = 'approved'
  WHERE id = p_portfolio_output_id;

  v_new_status := 'completed';

  IF v_portfolio.sequence_order = 1 THEN
    IF v_seq2_status <> 'locked' OR v_seq3_status <> 'locked' THEN
      RAISE EXCEPTION 'The portfolio submission could not be completed.';
    END IF;

    UPDATE portfolio_outputs
    SET workflow_status = 'awaiting_booking'
    WHERE id = v_seq2;

    v_next_id := v_seq2;

  ELSIF v_portfolio.sequence_order = 2 THEN
    IF v_seq1_status <> 'completed' THEN
      RAISE EXCEPTION 'The portfolio submission could not be completed.';
    END IF;
    IF v_seq3_status <> 'locked' THEN
      RAISE EXCEPTION 'The portfolio submission could not be completed.';
    END IF;

    UPDATE portfolio_outputs
    SET workflow_status = 'awaiting_booking'
    WHERE id = v_seq3;

    v_next_id := v_seq3;

  ELSIF v_portfolio.sequence_order = 3 THEN
    IF v_seq1_status <> 'completed' OR v_seq2_status <> 'completed' THEN
      RAISE EXCEPTION 'The portfolio submission could not be completed.';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM portfolio_outputs po
      WHERE po.team_id = v_team.id
        AND po.sequence_order IN (1, 2, 3)
        AND po.workflow_status IS DISTINCT FROM 'completed'
    ) THEN
      RAISE EXCEPTION 'The portfolio submission could not be completed.';
    END IF;

    SELECT
      tsp.id,
      tsp.status
    INTO v_stage3
    FROM team_stage_progress tsp
    WHERE tsp.team_id = v_team.id
      AND tsp.stage_number = 3
    FOR UPDATE;

    SELECT
      tsp.id,
      tsp.status,
      tsp.started_at
    INTO v_stage4
    FROM team_stage_progress tsp
    WHERE tsp.team_id = v_team.id
      AND tsp.stage_number = 4
    FOR UPDATE;

    IF v_stage3.id IS NULL OR v_stage3.status <> 'in_progress' THEN
      RAISE EXCEPTION 'The portfolio submission could not be completed.';
    END IF;

    IF v_stage4.id IS NULL OR v_stage4.status <> 'locked' THEN
      RAISE EXCEPTION 'The portfolio submission could not be completed.';
    END IF;

    UPDATE team_stage_progress
    SET
      status = 'completed',
      completed_at = v_now
    WHERE id = v_stage3.id;

    UPDATE team_stage_progress
    SET
      status = 'in_progress',
      started_at = coalesce(started_at, v_now)
    WHERE id = v_stage4.id;

    UPDATE teams
    SET
      current_stage_number = 4,
      stage_status = 'in_progress'
    WHERE id = v_team.id;

    UPDATE students s
    SET current_stage_number = 4
    FROM team_members tm
    WHERE tm.team_id = v_team.id
      AND tm.student_id = s.id
      AND tm.member_status = 'active';

    v_team.current_stage_number := 4;
    v_next_id := NULL;
  END IF;

  portfolio_output_id := p_portfolio_output_id;
  submission_id := p_submission_id;
  review_id := v_review_id;
  decision := v_decision::text;
  workflow_status := v_new_status::text;
  next_portfolio_output_id := v_next_id;
  team_stage_number := v_team.current_stage_number;
  RETURN NEXT;
END;
$function$;

COMMENT ON FUNCTION public.review_portfolio_as_admin(uuid, uuid, text, text) IS
  'Admin review of the latest submission. Approves and unlocks the next portfolio or completes Stage 3; revisions route back to admin.';

REVOKE ALL ON FUNCTION public.review_portfolio_as_admin(uuid, uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.review_portfolio_as_admin(uuid, uuid, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.review_portfolio_as_admin(uuid, uuid, text, text) TO authenticated;
