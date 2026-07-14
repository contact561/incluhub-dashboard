-- =============================================================================
-- IncluHub Education Management Dashboard
-- Migration 011: Portfolio review, revision, and sequential unlock (Package D1)
--
-- - Enums: portfolio_reviewer_stage, portfolio_review_decision, portfolio_revision_route
-- - portfolio_reviews (immutable)
-- - portfolio_outputs.revision_return_to
-- - review_portfolio_as_educator / review_portfolio_as_admin / resubmit_portfolio
-- - Deprecate direct writes on legacy portfolio_approvals
--
-- Depends on: 010_portfolio_submission.sql
-- Do not edit migrations 001–010.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Enums
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'portfolio_reviewer_stage'
  ) THEN
    CREATE TYPE portfolio_reviewer_stage AS ENUM ('educator', 'admin');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'portfolio_review_decision'
  ) THEN
    CREATE TYPE portfolio_review_decision AS ENUM ('approved', 'revision_required');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'portfolio_revision_route'
  ) THEN
    CREATE TYPE portfolio_revision_route AS ENUM ('educator', 'admin');
  END IF;
END $$;

GRANT USAGE ON TYPE portfolio_reviewer_stage TO postgres, service_role, authenticated;
GRANT USAGE ON TYPE portfolio_review_decision TO postgres, service_role, authenticated;
GRANT USAGE ON TYPE portfolio_revision_route TO postgres, service_role, authenticated;

-- ---------------------------------------------------------------------------
-- 2. portfolio_outputs.revision_return_to
-- ---------------------------------------------------------------------------

ALTER TABLE portfolio_outputs
  ADD COLUMN IF NOT EXISTS revision_return_to portfolio_revision_route;

COMMENT ON COLUMN portfolio_outputs.revision_return_to IS
  'Package D: when workflow_status = revision_required, routes the leader resubmission to educator or admin. Must be null otherwise.';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM portfolio_outputs
    WHERE workflow_status = 'revision_required'
      AND revision_return_to IS NULL
  ) THEN
    RAISE EXCEPTION
      'Migration 011: existing portfolio_outputs rows have workflow_status = revision_required without revision_return_to. Correct routing manually before applying the CHECK constraint.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM portfolio_outputs
    WHERE workflow_status IS DISTINCT FROM 'revision_required'
      AND revision_return_to IS NOT NULL
  ) THEN
    RAISE EXCEPTION
      'Migration 011: existing portfolio_outputs rows have revision_return_to set while not in revision_required. Clear routing before applying the CHECK constraint.';
  END IF;
END $$;

ALTER TABLE portfolio_outputs
  DROP CONSTRAINT IF EXISTS portfolio_outputs_revision_return_to_check;

ALTER TABLE portfolio_outputs
  ADD CONSTRAINT portfolio_outputs_revision_return_to_check
  CHECK (
    (workflow_status = 'revision_required' AND revision_return_to IS NOT NULL)
    OR (workflow_status IS DISTINCT FROM 'revision_required' AND revision_return_to IS NULL)
  );

-- ---------------------------------------------------------------------------
-- 3. portfolio_reviews (immutable)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS portfolio_reviews (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_submission_id  uuid NOT NULL
    REFERENCES portfolio_submissions(id) ON DELETE RESTRICT,
  reviewer_stage           portfolio_reviewer_stage NOT NULL,
  reviewer_user_id         uuid NOT NULL
    REFERENCES profiles(id) ON DELETE RESTRICT,
  decision                 portfolio_review_decision NOT NULL,
  comments                 text NULL,
  created_by               uuid NOT NULL
    REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at               timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT portfolio_reviews_submission_stage_key
    UNIQUE (portfolio_submission_id, reviewer_stage),
  CONSTRAINT portfolio_reviews_reviewer_equals_created_by
    CHECK (reviewer_user_id = created_by),
  CONSTRAINT portfolio_reviews_comments_length
    CHECK (comments IS NULL OR char_length(comments) <= 2000),
  CONSTRAINT portfolio_reviews_comments_required_for_revision
    CHECK (
      decision = 'approved'
      OR (
        decision = 'revision_required'
        AND comments IS NOT NULL
        AND length(btrim(comments)) > 0
      )
    )
);

COMMENT ON TABLE portfolio_reviews IS
  'Immutable Package D review history keyed to exact submission versions. Writes only via review_portfolio_as_educator / review_portfolio_as_admin. No UPDATE or DELETE.';

COMMENT ON COLUMN portfolio_reviews.portfolio_submission_id IS
  'Exact portfolio_submissions row reviewed. Portfolio output is derived through the submission FK.';

CREATE INDEX IF NOT EXISTS idx_portfolio_reviews_portfolio_submission_id
  ON portfolio_reviews (portfolio_submission_id);

CREATE INDEX IF NOT EXISTS idx_portfolio_reviews_reviewer_user_id
  ON portfolio_reviews (reviewer_user_id);

CREATE INDEX IF NOT EXISTS idx_portfolio_reviews_reviewer_stage
  ON portfolio_reviews (reviewer_stage);

CREATE INDEX IF NOT EXISTS idx_portfolio_reviews_created_at
  ON portfolio_reviews (created_at);

GRANT SELECT ON TABLE portfolio_reviews TO postgres, service_role, authenticated;
REVOKE ALL ON TABLE public.portfolio_reviews FROM anon;
GRANT ALL PRIVILEGES ON TABLE portfolio_reviews TO postgres, service_role;

-- ---------------------------------------------------------------------------
-- 4. Deprecate direct writes on legacy portfolio_approvals
-- ---------------------------------------------------------------------------

COMMENT ON TABLE portfolio_approvals IS
  'DEPRECATED for Package D+. Legacy placeholder. Package D writes immutable rows to portfolio_reviews via SECURITY DEFINER RPCs only. Do not use this table for Stage 3 reviews.';

REVOKE INSERT, UPDATE, DELETE ON TABLE public.portfolio_approvals FROM authenticated;
REVOKE ALL ON TABLE public.portfolio_approvals FROM anon;
GRANT SELECT ON TABLE public.portfolio_approvals TO authenticated;

DROP POLICY IF EXISTS "portfolio_approvals_insert_educator_own" ON portfolio_approvals;
DROP POLICY IF EXISTS "portfolio_approvals_update_educator_own" ON portfolio_approvals;
DROP POLICY IF EXISTS "portfolio_approvals_write_admin" ON portfolio_approvals;

-- ---------------------------------------------------------------------------
-- 5. Helper: matching educator for a portfolio leader
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_matching_portfolio_leader_educator(
  p_portfolio_output_id uuid
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM portfolio_outputs po
    JOIN team_educators te
      ON te.team_id = po.team_id
     AND te.student_id = po.leader_student_id
     AND te.status = 'active'
    JOIN educators e
      ON e.id = te.educator_id
     AND e.status = 'active'
    JOIN profiles p
      ON p.id = e.user_id
     AND p.status = 'active'
     AND p.role = 'educator'::user_role
    WHERE po.id = p_portfolio_output_id
      AND e.id = my_educator_id()
  );
$$;

COMMENT ON FUNCTION public.is_matching_portfolio_leader_educator(uuid) IS
  'True when the authenticated educator is actively mapped to the portfolio leader via team_educators.student_id.';

REVOKE ALL ON FUNCTION public.is_matching_portfolio_leader_educator(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_matching_portfolio_leader_educator(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_matching_portfolio_leader_educator(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. review_portfolio_as_educator
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.review_portfolio_as_educator(
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
  workflow_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_profile_id uuid;
  v_educator_id uuid;
  v_now timestamptz := now();
  v_decision portfolio_review_decision;
  v_comments text;
  v_portfolio record;
  v_team record;
  v_submission record;
  v_latest_version integer;
  v_review_id uuid;
  v_new_status portfolio_workflow_status;
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
      AND role = 'educator'
  ) THEN
    RAISE EXCEPTION 'You do not have permission to perform this action.';
  END IF;

  v_educator_id := my_educator_id();
  IF v_educator_id IS NULL THEN
    RAISE EXCEPTION 'Your educator profile could not be found.';
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
    RAISE EXCEPTION 'This portfolio is not awaiting educator review.';
  END IF;

  IF v_portfolio.workflow_status <> 'pending_educator' THEN
    RAISE EXCEPTION 'This portfolio is not awaiting educator review.';
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

  IF NOT EXISTS (
    SELECT 1
    FROM team_educators te
    JOIN educators e ON e.id = te.educator_id
    JOIN profiles p ON p.id = e.user_id
    WHERE te.team_id = v_portfolio.team_id
      AND te.student_id = v_portfolio.leader_student_id
      AND te.educator_id = v_educator_id
      AND te.status = 'active'
      AND e.status = 'active'
      AND p.status = 'active'
      AND p.role = 'educator'
  ) THEN
    RAISE EXCEPTION 'You are not the matching educator for this portfolio.';
  END IF;

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

  IF EXISTS (
    SELECT 1
    FROM portfolio_reviews pr
    WHERE pr.portfolio_submission_id = p_submission_id
      AND pr.reviewer_stage = 'educator'
  ) THEN
    RAISE EXCEPTION 'This portfolio submission has already been reviewed by an educator.';
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
    'educator',
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
      'This portfolio submission has already been reviewed by an educator.';
  END IF;

  IF v_decision = 'approved' THEN
    v_new_status := 'pending_admin';
    UPDATE portfolio_outputs
    SET
      workflow_status = 'pending_admin',
      revision_return_to = NULL
    WHERE id = p_portfolio_output_id;
  ELSE
    v_new_status := 'revision_required';
    UPDATE portfolio_outputs
    SET
      workflow_status = 'revision_required',
      revision_return_to = 'educator'
    WHERE id = p_portfolio_output_id;
  END IF;

  portfolio_output_id := p_portfolio_output_id;
  submission_id := p_submission_id;
  review_id := v_review_id;
  decision := v_decision::text;
  workflow_status := v_new_status::text;
  RETURN NEXT;
END;
$function$;

COMMENT ON FUNCTION public.review_portfolio_as_educator(uuid, uuid, text, text) IS
  'Matching educator review of the latest submission. Approves to pending_admin or requests revision routed back to educator.';

REVOKE ALL ON FUNCTION public.review_portfolio_as_educator(uuid, uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.review_portfolio_as_educator(uuid, uuid, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.review_portfolio_as_educator(uuid, uuid, text, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 7. review_portfolio_as_admin
-- ---------------------------------------------------------------------------

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

  -- Load sequence map after locks
  SELECT id, workflow_status INTO v_seq1, v_seq1_status
  FROM portfolio_outputs
  WHERE team_id = v_team.id AND sequence_order = 1;

  SELECT id, workflow_status INTO v_seq2, v_seq2_status
  FROM portfolio_outputs
  WHERE team_id = v_team.id AND sequence_order = 2;

  SELECT id, workflow_status INTO v_seq3, v_seq3_status
  FROM portfolio_outputs
  WHERE team_id = v_team.id AND sequence_order = 3;

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

-- ---------------------------------------------------------------------------
-- 8. resubmit_portfolio
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.resubmit_portfolio(
  p_portfolio_output_id uuid,
  p_title text,
  p_portfolio_url text,
  p_notes text
)
RETURNS TABLE (
  submission_id uuid,
  portfolio_output_id uuid,
  version_number integer,
  title text,
  portfolio_url text,
  notes text,
  submitted_at timestamptz,
  workflow_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_profile_id uuid;
  v_student_id uuid;
  v_now timestamptz := now();
  v_title text;
  v_url text;
  v_notes text;
  v_portfolio record;
  v_team record;
  v_latest record;
  v_new_version integer;
  v_submission_id uuid;
  v_new_status portfolio_workflow_status;
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
      AND role = 'student'
  ) THEN
    RAISE EXCEPTION 'You do not have permission to perform this action.';
  END IF;

  v_student_id := my_student_id();
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Your student profile could not be found.';
  END IF;

  v_title := nullif(btrim(coalesce(p_title, '')), '');
  v_url := nullif(btrim(coalesce(p_portfolio_url, '')), '');
  v_notes := nullif(btrim(coalesce(p_notes, '')), '');

  IF v_title IS NULL THEN
    RAISE EXCEPTION 'Portfolio title is required.';
  END IF;

  IF char_length(v_title) < 3 OR char_length(v_title) > 150 THEN
    RAISE EXCEPTION 'Portfolio title must be between 3 and 150 characters.';
  END IF;

  IF v_url IS NULL THEN
    RAISE EXCEPTION 'Enter a valid HTTP or HTTPS portfolio link.';
  END IF;

  IF v_url ~ '\s' THEN
    RAISE EXCEPTION 'Enter a valid HTTP or HTTPS portfolio link.';
  END IF;

  IF lower(v_url) ~ '^(javascript|data|file|vbscript):' THEN
    RAISE EXCEPTION 'Enter a valid HTTP or HTTPS portfolio link.';
  END IF;

  IF v_url !~* '^https?://[a-z0-9]([a-z0-9.-]*[a-z0-9])?(:[0-9]+)?(/.*)?$' THEN
    RAISE EXCEPTION 'Enter a valid HTTP or HTTPS portfolio link.';
  END IF;

  IF v_notes IS NOT NULL AND char_length(v_notes) > 2000 THEN
    RAISE EXCEPTION 'Notes cannot exceed 2000 characters.';
  END IF;

  SELECT
    po.id,
    po.team_id,
    po.leader_student_id,
    po.workflow_status,
    po.revision_return_to
  INTO v_portfolio
  FROM portfolio_outputs po
  WHERE po.id = p_portfolio_output_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This portfolio is not awaiting revision.';
  END IF;

  IF v_portfolio.workflow_status <> 'revision_required' THEN
    RAISE EXCEPTION 'This portfolio is not awaiting revision.';
  END IF;

  IF v_portfolio.revision_return_to IS NULL
     OR v_portfolio.revision_return_to NOT IN ('educator', 'admin') THEN
    RAISE EXCEPTION 'This portfolio is not awaiting revision.';
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
    RAISE EXCEPTION 'You are not part of this team.';
  END IF;

  IF v_team.current_stage_number <> 3 THEN
    RAISE EXCEPTION 'You do not have permission to perform this action.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM team_members tm
    WHERE tm.team_id = v_team.id
      AND tm.student_id = v_student_id
      AND tm.member_status = 'active'
  ) THEN
    RAISE EXCEPTION 'You are not part of this team.';
  END IF;

  IF v_portfolio.leader_student_id <> v_student_id THEN
    RAISE EXCEPTION 'You are not the current portfolio leader.';
  END IF;

  SELECT
    ps.id,
    ps.version_number
  INTO v_latest
  FROM portfolio_submissions ps
  WHERE ps.portfolio_output_id = p_portfolio_output_id
  ORDER BY ps.version_number DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This portfolio is not awaiting revision.';
  END IF;

  IF v_portfolio.revision_return_to = 'educator' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM portfolio_reviews pr
      WHERE pr.portfolio_submission_id = v_latest.id
        AND pr.reviewer_stage = 'educator'
        AND pr.decision = 'revision_required'
    ) THEN
      RAISE EXCEPTION 'This portfolio is not awaiting revision.';
    END IF;
    v_new_status := 'pending_educator';
  ELSE
    IF NOT EXISTS (
      SELECT 1
      FROM portfolio_reviews pr
      WHERE pr.portfolio_submission_id = v_latest.id
        AND pr.reviewer_stage = 'admin'
        AND pr.decision = 'revision_required'
    ) THEN
      RAISE EXCEPTION 'This portfolio is not awaiting revision.';
    END IF;
    v_new_status := 'pending_admin';
  END IF;

  v_new_version := v_latest.version_number + 1;

  INSERT INTO public.portfolio_submissions (
    portfolio_output_id,
    version_number,
    title,
    portfolio_url,
    notes,
    submitted_by_student_id,
    created_by,
    created_at
  )
  VALUES (
    p_portfolio_output_id,
    v_new_version,
    v_title,
    v_url,
    v_notes,
    v_student_id,
    v_profile_id,
    v_now
  )
  ON CONFLICT ON CONSTRAINT
    portfolio_submissions_portfolio_output_id_version_number_key
  DO NOTHING
  RETURNING id INTO v_submission_id;

  IF v_submission_id IS NULL THEN
    RAISE EXCEPTION 'This portfolio has already been submitted.';
  END IF;

  UPDATE portfolio_outputs
  SET
    portfolio_title = v_title,
    portfolio_link = v_url,
    notes = v_notes,
    submitted_at = v_now,
    workflow_status = v_new_status,
    revision_return_to = NULL
  WHERE id = p_portfolio_output_id;

  submission_id := v_submission_id;
  portfolio_output_id := p_portfolio_output_id;
  version_number := v_new_version;
  title := v_title;
  portfolio_url := v_url;
  notes := v_notes;
  submitted_at := v_now;
  workflow_status := v_new_status::text;
  RETURN NEXT;
END;
$function$;

COMMENT ON FUNCTION public.resubmit_portfolio(uuid, text, text, text) IS
  'Leader revision resubmission. Creates the next immutable submission version and returns to pending_educator or pending_admin from revision_return_to.';

REVOKE ALL ON FUNCTION public.resubmit_portfolio(uuid, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resubmit_portfolio(uuid, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.resubmit_portfolio(uuid, text, text, text) TO authenticated;
