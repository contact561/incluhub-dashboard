-- =============================================================================
-- IncluHub Education Management Dashboard
-- Migration 016: Brand Opportunities, proof review, and Stage 5 final review
--
-- Depends on 014 and 015. Forward-only; do not edit migration 013.
-- =============================================================================

CREATE TABLE public.brand_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL UNIQUE REFERENCES public.teams(id) ON DELETE RESTRICT,
  title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 150),
  description text NOT NULL CHECK (char_length(description) BETWEEN 10 AND 4000),
  instructions text CHECK (instructions IS NULL OR char_length(instructions) <= 4000),
  scheduled_date date NOT NULL,
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'assigned', 'proof_submitted', 'revision_required', 'approved')),
  assigned_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  assigned_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (due_date >= scheduled_date)
);

CREATE TRIGGER trg_brand_opportunities_updated_at
  BEFORE UPDATE ON public.brand_opportunities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.brand_opportunity_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES public.brand_opportunities(id) ON DELETE CASCADE,
  file_name text NOT NULL CHECK (char_length(file_name) BETWEEN 1 AND 255),
  object_path text NOT NULL UNIQUE CHECK (char_length(object_path) <= 700),
  mime_type text NOT NULL CHECK (mime_type IN ('application/pdf', 'image/jpeg')),
  size_bytes bigint NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 10485760),
  uploaded_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.brand_work_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES public.brand_opportunities(id) ON DELETE CASCADE,
  version_number integer NOT NULL CHECK (version_number > 0),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'revision_required', 'approved')),
  notes text CHECK (notes IS NULL OR char_length(notes) <= 2000),
  submitted_by_student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  submitted_at timestamptz,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_comments text CHECK (review_comments IS NULL OR char_length(review_comments) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (opportunity_id, version_number)
);

CREATE TABLE public.brand_work_submission_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.brand_work_submissions(id) ON DELETE CASCADE,
  file_name text NOT NULL CHECK (char_length(file_name) BETWEEN 1 AND 255),
  object_path text NOT NULL UNIQUE CHECK (char_length(object_path) <= 700),
  mime_type text NOT NULL CHECK (mime_type IN ('application/pdf', 'image/jpeg')),
  size_bytes bigint NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 10485760),
  uploaded_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_brand_opportunities_status
  ON public.brand_opportunities (status, due_date);
CREATE INDEX idx_brand_opportunity_files_opportunity
  ON public.brand_opportunity_files (opportunity_id);
CREATE INDEX idx_brand_work_submissions_opportunity
  ON public.brand_work_submissions (opportunity_id, version_number DESC);
CREATE INDEX idx_brand_work_submission_files_submission
  ON public.brand_work_submission_files (submission_id);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'brand-opportunity-files',
  'brand-opportunity-files',
  false,
  10485760,
  ARRAY['application/pdf', 'image/jpeg']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/pdf', 'image/jpeg'];

CREATE OR REPLACE FUNCTION public.enforce_google_drive_portfolio_link()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF NEW.portfolio_url !~* '^https://drive\.google\.com/' THEN
    RAISE EXCEPTION 'Use a Google Drive link beginning with https://drive.google.com/.';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_enforce_google_drive_portfolio_link ON public.portfolio_submissions;
CREATE TRIGGER trg_enforce_google_drive_portfolio_link
  BEFORE INSERT ON public.portfolio_submissions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_google_drive_portfolio_link();

COMMENT ON TABLE public.brand_opportunities IS
  'Admin-assigned Stage 4 Brand Opportunity; students see a waiting state until activated.';
COMMENT ON TABLE public.brand_work_submissions IS
  'Versioned team proof reviewed only by Admin. Educators have read-only visibility.';

CREATE OR REPLACE FUNCTION public.assign_brand_opportunity(
  p_team_id uuid,
  p_title text,
  p_description text,
  p_instructions text,
  p_scheduled_date date,
  p_due_date date
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_admin_id uuid := auth.uid();
  v_stage4 record;
  v_opportunity_id uuid;
  v_title text := nullif(btrim(coalesce(p_title, '')), '');
  v_description text := nullif(btrim(coalesce(p_description, '')), '');
  v_instructions text := nullif(btrim(coalesce(p_instructions, '')), '');
BEGIN
  IF v_admin_id IS NULL OR NOT public.is_admin() OR NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = v_admin_id AND p.role = 'admin' AND p.status = 'active'
  ) THEN RAISE EXCEPTION 'You do not have permission to perform this action.'; END IF;
  IF v_title IS NULL OR char_length(v_title) NOT BETWEEN 3 AND 150 THEN
    RAISE EXCEPTION 'Brand Opportunity title must be between 3 and 150 characters.';
  END IF;
  IF v_description IS NULL OR char_length(v_description) NOT BETWEEN 10 AND 4000 THEN
    RAISE EXCEPTION 'Brand Opportunity description must be between 10 and 4000 characters.';
  END IF;
  IF v_instructions IS NOT NULL AND char_length(v_instructions) > 4000 THEN
    RAISE EXCEPTION 'Brand Opportunity instructions cannot exceed 4000 characters.';
  END IF;
  IF p_scheduled_date IS NULL OR p_due_date IS NULL OR p_due_date < p_scheduled_date THEN
    RAISE EXCEPTION 'Enter a valid Brand Opportunity schedule and due date.';
  END IF;

  SELECT tsp.id, tsp.status INTO v_stage4
  FROM public.team_stage_progress tsp
  JOIN public.teams t ON t.id = tsp.team_id
  WHERE tsp.team_id = p_team_id AND tsp.stage_number = 4
    AND t.status = 'active' AND t.current_stage_number = 4
  FOR UPDATE OF tsp;
  IF NOT FOUND OR v_stage4.status <> 'in_progress' THEN
    RAISE EXCEPTION 'Team is not currently in Stage 4.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.brand_work_submissions bws
    JOIN public.brand_opportunities bo ON bo.id = bws.opportunity_id
    WHERE bo.team_id = p_team_id AND bws.status <> 'draft'
  ) THEN
    RAISE EXCEPTION 'Brand Opportunity cannot be changed after proof is submitted.';
  END IF;

  INSERT INTO public.brand_opportunities (
    team_id, title, description, instructions, scheduled_date, due_date,
    status, assigned_by
  ) VALUES (
    p_team_id, v_title, v_description, v_instructions,
    p_scheduled_date, p_due_date, 'draft', v_admin_id
  )
  ON CONFLICT (team_id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    instructions = EXCLUDED.instructions,
    scheduled_date = EXCLUDED.scheduled_date,
    due_date = EXCLUDED.due_date,
    status = 'draft',
    assigned_by = EXCLUDED.assigned_by,
    assigned_at = NULL
  RETURNING id INTO v_opportunity_id;

  DELETE FROM public.brand_opportunity_files bof
  WHERE bof.opportunity_id = v_opportunity_id;

  UPDATE public.team_stage_progress
  SET brand_works_date = p_scheduled_date,
      brand_works_remarks = v_instructions,
      brand_works_scheduled_at = now(),
      brand_works_scheduled_by = v_admin_id
  WHERE id = v_stage4.id;

  RETURN v_opportunity_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.activate_brand_opportunity(p_opportunity_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_admin_id uuid := auth.uid();
  v_opportunity record;
  v_file_count integer;
BEGIN
  IF v_admin_id IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'You do not have permission to perform this action.';
  END IF;
  SELECT bo.id, bo.team_id, bo.status INTO v_opportunity
  FROM public.brand_opportunities bo WHERE bo.id = p_opportunity_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Brand Opportunity was not found.'; END IF;
  SELECT count(*)::integer INTO v_file_count
  FROM public.brand_opportunity_files bof WHERE bof.opportunity_id = p_opportunity_id;
  IF v_file_count < 1 OR v_file_count > 5 THEN
    RAISE EXCEPTION 'Upload between 1 and 5 PDF or JPEG brief files.';
  END IF;
  UPDATE public.brand_opportunities
  SET status = 'assigned', assigned_at = coalesce(assigned_at, now())
  WHERE id = p_opportunity_id;
  PERFORM public.enqueue_team_notification(
    v_opportunity.team_id,
    'brand_opportunity_assigned',
    'A Brand Opportunity has been assigned',
    'Open Stage 4 to review the brief, files, due date, and proof requirements.',
    '/student/my-stage',
    'brand_opportunity',
    p_opportunity_id,
    'brand_opportunity_assigned:' || p_opportunity_id::text,
    true, false, false
  );
  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.start_brand_work_submission(
  p_opportunity_id uuid,
  p_notes text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_profile_id uuid := auth.uid();
  v_student_id uuid;
  v_opportunity record;
  v_version integer;
  v_submission_id uuid;
  v_notes text := nullif(btrim(coalesce(p_notes, '')), '');
BEGIN
  IF v_profile_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = v_profile_id AND p.role = 'student' AND p.status = 'active'
  ) THEN RAISE EXCEPTION 'You do not have permission to perform this action.'; END IF;
  v_student_id := public.my_student_id();
  IF v_student_id IS NULL THEN RAISE EXCEPTION 'Your student profile could not be found.'; END IF;
  IF v_notes IS NOT NULL AND char_length(v_notes) > 2000 THEN
    RAISE EXCEPTION 'Notes cannot exceed 2000 characters.';
  END IF;
  SELECT bo.id, bo.team_id, bo.status INTO v_opportunity
  FROM public.brand_opportunities bo WHERE bo.id = p_opportunity_id FOR UPDATE;
  IF NOT FOUND OR v_opportunity.status NOT IN ('assigned', 'revision_required') THEN
    RAISE EXCEPTION 'Brand Opportunity is not accepting proof right now.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.team_members tm
    JOIN public.teams t ON t.id = tm.team_id
    WHERE tm.team_id = v_opportunity.team_id
      AND tm.student_id = v_student_id
      AND tm.member_status = 'active'
      AND t.status = 'active'
      AND t.current_stage_number = 4
  ) THEN RAISE EXCEPTION 'You do not have permission to submit proof for this team.'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.brand_work_submissions bws
    WHERE bws.opportunity_id = p_opportunity_id AND bws.status IN ('draft', 'submitted')
  ) THEN RAISE EXCEPTION 'Brand Works proof is already being prepared or reviewed.'; END IF;

  SELECT coalesce(max(version_number), 0) + 1 INTO v_version
  FROM public.brand_work_submissions WHERE opportunity_id = p_opportunity_id;
  INSERT INTO public.brand_work_submissions (
    opportunity_id, version_number, status, notes,
    submitted_by_student_id
  ) VALUES (
    p_opportunity_id, v_version, 'draft', v_notes, v_student_id
  ) RETURNING id INTO v_submission_id;
  RETURN v_submission_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.finalize_brand_work_submission(p_submission_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_profile_id uuid := auth.uid();
  v_student_id uuid;
  v_submission record;
  v_file_count integer;
BEGIN
  IF v_profile_id IS NULL THEN RAISE EXCEPTION 'You do not have permission to perform this action.'; END IF;
  v_student_id := public.my_student_id();
  SELECT bws.id, bws.status, bws.submitted_by_student_id, bo.id AS opportunity_id, bo.team_id
  INTO v_submission
  FROM public.brand_work_submissions bws
  JOIN public.brand_opportunities bo ON bo.id = bws.opportunity_id
  WHERE bws.id = p_submission_id FOR UPDATE OF bws, bo;
  IF NOT FOUND OR v_submission.status <> 'draft'
     OR v_submission.submitted_by_student_id <> v_student_id THEN
    RAISE EXCEPTION 'Brand Works proof submission was not found.';
  END IF;
  SELECT count(*)::integer INTO v_file_count
  FROM public.brand_work_submission_files bwsf WHERE bwsf.submission_id = p_submission_id;
  IF v_file_count < 1 OR v_file_count > 5 THEN
    RAISE EXCEPTION 'Upload between 1 and 5 PDF or JPEG proof files.';
  END IF;
  UPDATE public.brand_work_submissions
  SET status = 'submitted', submitted_at = now() WHERE id = p_submission_id;
  UPDATE public.brand_opportunities
  SET status = 'proof_submitted' WHERE id = v_submission.opportunity_id;
  PERFORM public.enqueue_team_notification(
    v_submission.team_id,
    'brand_proof_submitted',
    'Brand Works proof submitted',
    'The team submitted Brand Works proof for Admin review.',
    '/admin/teams/' || v_submission.team_id::text,
    'brand_work_submission',
    p_submission_id,
    'brand_proof_submitted:' || p_submission_id::text,
    false, false, true
  );
  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.review_brand_work_submission(
  p_submission_id uuid,
  p_decision text,
  p_comments text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_admin_id uuid := auth.uid();
  v_submission record;
  v_comments text := nullif(btrim(coalesce(p_comments, '')), '');
  v_stage4 record;
  v_stage5 record;
BEGIN
  IF v_admin_id IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'You do not have permission to perform this action.';
  END IF;
  IF p_decision NOT IN ('approved', 'revision_required') THEN
    RAISE EXCEPTION 'Select a valid Brand Works review decision.';
  END IF;
  IF p_decision = 'revision_required' AND v_comments IS NULL THEN
    RAISE EXCEPTION 'Revision feedback is required.';
  END IF;
  IF v_comments IS NOT NULL AND char_length(v_comments) > 2000 THEN
    RAISE EXCEPTION 'Review comments cannot exceed 2000 characters.';
  END IF;
  SELECT bws.id, bws.status, bws.opportunity_id, bo.team_id
  INTO v_submission
  FROM public.brand_work_submissions bws
  JOIN public.brand_opportunities bo ON bo.id = bws.opportunity_id
  WHERE bws.id = p_submission_id
  FOR UPDATE OF bws, bo;
  IF NOT FOUND OR v_submission.status <> 'submitted' THEN
    RAISE EXCEPTION 'Brand Works proof is not awaiting review.';
  END IF;
  SELECT tsp.id, tsp.status INTO v_stage4
  FROM public.team_stage_progress tsp
  WHERE tsp.team_id = v_submission.team_id AND tsp.stage_number = 4 FOR UPDATE;
  SELECT tsp.id, tsp.status INTO v_stage5
  FROM public.team_stage_progress tsp
  WHERE tsp.team_id = v_submission.team_id AND tsp.stage_number = 5 FOR UPDATE;
  IF v_stage4.status <> 'in_progress' OR v_stage5.status <> 'locked' THEN
    RAISE EXCEPTION 'Stage progression could not be completed.';
  END IF;

  UPDATE public.brand_work_submissions SET
    status = p_decision,
    reviewed_by = v_admin_id,
    reviewed_at = now(),
    review_comments = v_comments
  WHERE id = p_submission_id;

  IF p_decision = 'revision_required' THEN
    UPDATE public.brand_opportunities SET status = 'revision_required'
    WHERE id = v_submission.opportunity_id;
    PERFORM public.enqueue_team_notification(
      v_submission.team_id, 'brand_proof_revision', 'Brand Works revision requested',
      'Admin requested changes to the Brand Works proof. Review the feedback and submit a new version.',
      '/student/my-stage', 'brand_work_submission', p_submission_id,
      'brand_proof_revision:' || p_submission_id::text,
      true, false, false
    );
    RETURN true;
  END IF;

  UPDATE public.brand_opportunities SET status = 'approved'
  WHERE id = v_submission.opportunity_id;
  UPDATE public.team_stage_progress SET
    status = 'completed', completed_at = now(),
    brand_works_completed_at = now(), brand_works_completed_by = v_admin_id,
    admin_approval_status = 'approved', admin_approved_by = v_admin_id,
    admin_approved_at = now()
  WHERE id = v_stage4.id;
  UPDATE public.team_stage_progress SET
    status = 'in_progress', started_at = coalesce(started_at, now()),
    completed_at = NULL, admin_approval_status = 'pending',
    admin_approved_by = NULL, admin_approved_at = NULL
  WHERE id = v_stage5.id;
  UPDATE public.teams SET current_stage_number = 5, stage_status = 'in_progress'
  WHERE id = v_submission.team_id;
  UPDATE public.students s SET current_stage_number = 5
  FROM public.team_members tm
  WHERE tm.team_id = v_submission.team_id AND tm.student_id = s.id
    AND tm.member_status = 'active';
  PERFORM public.enqueue_team_notification(
    v_submission.team_id, 'stage5_under_review', 'Stage 5 is under review',
    'Brand Works was approved. IncluHub is completing the final ecosystem review.',
    '/student/ecosystem', 'team_stage_progress', v_stage5.id,
    'stage5_under_review:' || v_submission.team_id::text,
    true, true, false
  );
  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.approve_stage5_review(
  p_team_id uuid,
  p_remarks text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_admin_id uuid := auth.uid();
  v_stage5 record;
  v_remarks text := nullif(btrim(coalesce(p_remarks, '')), '');
BEGIN
  IF v_admin_id IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'You do not have permission to perform this action.';
  END IF;
  IF v_remarks IS NOT NULL AND char_length(v_remarks) > 2000 THEN
    RAISE EXCEPTION 'Remarks cannot exceed 2000 characters.';
  END IF;
  SELECT tsp.id, tsp.status, tsp.admin_approval_status INTO v_stage5
  FROM public.team_stage_progress tsp
  JOIN public.teams t ON t.id = tsp.team_id
  WHERE tsp.team_id = p_team_id AND tsp.stage_number = 5
    AND t.current_stage_number = 5
  FOR UPDATE OF tsp, t;
  IF NOT FOUND THEN RAISE EXCEPTION 'Team is not currently in Stage 5.'; END IF;
  IF v_stage5.status = 'completed' AND v_stage5.admin_approval_status = 'approved' THEN
    RETURN true;
  END IF;
  IF v_stage5.status <> 'in_progress' OR NOT EXISTS (
    SELECT 1 FROM public.brand_opportunities bo
    WHERE bo.team_id = p_team_id AND bo.status = 'approved'
  ) THEN RAISE EXCEPTION 'Stage 5 is not ready for final approval.'; END IF;
  UPDATE public.team_stage_progress SET
    status = 'completed', completed_at = now(),
    admin_approval_status = 'approved', admin_approved_by = v_admin_id,
    admin_approved_at = now(), admin_remarks = v_remarks
  WHERE id = v_stage5.id;
  UPDATE public.teams SET stage_status = 'completed' WHERE id = p_team_id;
  PERFORM public.enqueue_team_notification(
    p_team_id, 'stage5_approved', 'Final review complete',
    'Your IncluHub ecosystem access is now available.',
    '/student/ecosystem', 'team_stage_progress', v_stage5.id,
    'stage5_approved:' || p_team_id::text,
    true, true, false
  );
  RETURN true;
END;
$function$;

-- Migration 013 completion can no longer bypass mandatory proof review.
CREATE OR REPLACE FUNCTION public.complete_brand_works(p_team_id uuid)
RETURNS TABLE (team_id uuid, stage4_status text, stage5_status text, current_stage_number integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'You do not have permission to perform this action.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.teams t
    JOIN public.team_stage_progress s4 ON s4.team_id = t.id AND s4.stage_number = 4
    JOIN public.team_stage_progress s5 ON s5.team_id = t.id AND s5.stage_number = 5
    WHERE t.id = p_team_id AND t.current_stage_number = 5
      AND s4.status = 'completed'
  ) THEN
    RETURN QUERY
    SELECT p_team_id, 'completed', s5.status::text, 5
    FROM public.team_stage_progress s5
    WHERE s5.team_id = p_team_id AND s5.stage_number = 5;
    RETURN;
  END IF;
  RAISE EXCEPTION 'Approve the submitted Brand Works proof to complete Stage 4.';
END;
$function$;

GRANT SELECT ON public.brand_opportunities, public.brand_opportunity_files,
  public.brand_work_submissions, public.brand_work_submission_files TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.brand_opportunities,
  public.brand_opportunity_files, public.brand_work_submissions,
  public.brand_work_submission_files FROM authenticated;

REVOKE ALL ON FUNCTION public.assign_brand_opportunity(uuid, text, text, text, date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_brand_opportunity(uuid, text, text, text, date, date) TO authenticated;
REVOKE ALL ON FUNCTION public.activate_brand_opportunity(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.activate_brand_opportunity(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.start_brand_work_submission(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_brand_work_submission(uuid, text) TO authenticated;
REVOKE ALL ON FUNCTION public.finalize_brand_work_submission(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finalize_brand_work_submission(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.review_brand_work_submission(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_brand_work_submission(uuid, text, text) TO authenticated;
REVOKE ALL ON FUNCTION public.approve_stage5_review(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_stage5_review(uuid, text) TO authenticated;
REVOKE ALL ON FUNCTION public.complete_brand_works(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_brand_works(uuid) TO authenticated;
