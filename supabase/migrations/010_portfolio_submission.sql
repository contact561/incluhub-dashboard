-- =============================================================================
-- IncluHub Education Management Dashboard
-- Migration 010: Link-only portfolio submission (Package C)
--
-- - portfolio_submissions (immutable versioned submissions)
-- - submit_portfolio RPC (student leader only)
--
-- Depends on: migrations 001–009 (studio booking → awaiting_submission)
-- Do not edit migrations 001–009.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. portfolio_submissions
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS portfolio_submissions (
  id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_output_id      uuid        NOT NULL
    REFERENCES portfolio_outputs(id) ON DELETE RESTRICT,
  version_number           integer     NOT NULL DEFAULT 1,
  title                    text        NOT NULL,
  portfolio_url            text        NOT NULL,
  notes                    text        NULL,
  submitted_by_student_id  uuid        NOT NULL
    REFERENCES students(id) ON DELETE RESTRICT,
  created_by               uuid        NOT NULL
    REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at               timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT portfolio_submissions_version_number_check
    CHECK (version_number >= 1),
  CONSTRAINT portfolio_submissions_title_not_blank
    CHECK (length(btrim(title)) > 0),
  CONSTRAINT portfolio_submissions_url_not_blank
    CHECK (length(btrim(portfolio_url)) > 0),
  CONSTRAINT portfolio_submissions_portfolio_output_id_version_number_key
    UNIQUE (portfolio_output_id, version_number)
);

COMMENT ON TABLE portfolio_submissions IS
  'Authoritative immutable submission history. Writes only via submit_portfolio RPC. Package C creates version 1 only. portfolio_outputs holds only a denormalized latest-submission snapshot for dashboards.';

COMMENT ON COLUMN portfolio_submissions.version_number IS
  'Submission version. Package C only creates version 1. Future Package D revisions must insert a new version row and update the portfolio_outputs snapshot atomically.';

COMMENT ON COLUMN portfolio_submissions.portfolio_url IS
  'Absolute HTTP or HTTPS link to external portfolio work. No files stored in IncluHub.';

CREATE INDEX IF NOT EXISTS idx_portfolio_submissions_portfolio_output_id
  ON portfolio_submissions (portfolio_output_id);

CREATE INDEX IF NOT EXISTS idx_portfolio_submissions_submitted_by_student_id
  ON portfolio_submissions (submitted_by_student_id);

CREATE INDEX IF NOT EXISTS idx_portfolio_submissions_created_at
  ON portfolio_submissions (created_at);

-- ---------------------------------------------------------------------------
-- 2. Grants — authenticated SELECT only; explicit anon revocation
-- ---------------------------------------------------------------------------

GRANT SELECT ON TABLE portfolio_submissions TO postgres, service_role, authenticated;

REVOKE ALL ON TABLE public.portfolio_submissions FROM anon;

GRANT ALL PRIVILEGES ON TABLE portfolio_submissions TO postgres, service_role;

-- ---------------------------------------------------------------------------
-- 3. submit_portfolio
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.submit_portfolio(
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
  v_submission_id uuid;
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

  -- Absolute HTTP/HTTPS URL with a non-empty host segment.
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
    po.sequence_order
  INTO v_portfolio
  FROM portfolio_outputs po
  WHERE po.id = p_portfolio_output_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This portfolio is not awaiting submission.';
  END IF;

  IF v_portfolio.workflow_status = 'locked' THEN
    RAISE EXCEPTION 'This portfolio is locked.';
  END IF;

  IF v_portfolio.workflow_status = 'pending_educator'
     OR v_portfolio.workflow_status = 'pending_admin'
     OR v_portfolio.workflow_status = 'completed' THEN
    RAISE EXCEPTION 'This portfolio has already been submitted.';
  END IF;

  IF v_portfolio.workflow_status <> 'awaiting_submission' THEN
    RAISE EXCEPTION 'This portfolio is not awaiting submission.';
  END IF;

  IF v_portfolio.leader_student_id <> v_student_id THEN
    RAISE EXCEPTION 'You are not the current portfolio leader.';
  END IF;

  SELECT
    t.id,
    t.status,
    t.current_stage_number
  INTO v_team
  FROM teams t
  WHERE t.id = v_portfolio.team_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'You are not part of this team.';
  END IF;

  IF v_team.status <> 'active' THEN
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

  IF EXISTS (
    SELECT 1
    FROM portfolio_outputs po
    WHERE po.team_id = v_team.id
      AND po.workflow_status NOT IN ('locked', 'completed')
      AND po.id <> p_portfolio_output_id
  ) THEN
    RAISE EXCEPTION 'This portfolio is not awaiting submission.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM studio_bookings sb
    WHERE sb.portfolio_output_id = p_portfolio_output_id
  ) THEN
    RAISE EXCEPTION 'A confirmed studio booking is required before submission.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM portfolio_submissions ps
    WHERE ps.portfolio_output_id = p_portfolio_output_id
      AND ps.version_number = 1
  ) THEN
    RAISE EXCEPTION 'This portfolio has already been submitted.';
  END IF;

  -- Targeted duplicate protection: only this (portfolio_output_id, version_number)
  -- uniqueness conflict is treated as "already submitted".
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
    1,
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

  -- Snapshot update: portfolio_submissions remains the authoritative history.
  -- portfolio_outputs stores only the latest-submission snapshot for dashboard display.
  -- Future Package D revisions must insert a new version and update this snapshot atomically.
  UPDATE portfolio_outputs
  SET
    workflow_status = 'pending_educator',
    portfolio_title = v_title,
    portfolio_link = v_url,
    notes = v_notes,
    submitted_at = v_now
  WHERE id = p_portfolio_output_id;

  submission_id := v_submission_id;
  portfolio_output_id := p_portfolio_output_id;
  version_number := 1;
  title := v_title;
  portfolio_url := v_url;
  notes := v_notes;
  submitted_at := v_now;
  workflow_status := 'pending_educator';
  RETURN NEXT;
END;
$function$;

COMMENT ON FUNCTION public.submit_portfolio(uuid, text, text, text) IS
  'Atomically inserts version-1 into portfolio_submissions (authoritative history) and updates portfolio_outputs latest-submission snapshot (title/link/notes/submitted_at/workflow_status). Student leader only. Link-only; no file upload. Package D revisions must add a new version and refresh the snapshot.';

REVOKE ALL ON FUNCTION public.submit_portfolio(uuid, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_portfolio(uuid, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.submit_portfolio(uuid, text, text, text) TO authenticated;
