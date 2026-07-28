-- Fix Admin moodboard reviews failing because the RETURNS TABLE output column
-- `moodboard_submission_id` conflicts with the identically named constraint
-- target inside PL/pgSQL.

CREATE OR REPLACE FUNCTION public.review_moodboard_as_admin(
  p_moodboard_submission_id uuid,
  p_decision text,
  p_comments text
)
RETURNS TABLE (
  moodboard_submission_id uuid,
  portfolio_output_id uuid,
  decision text,
  moodboard_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_admin_id uuid := auth.uid();
  v_submission record;
  v_portfolio record;
  v_decision text := btrim(coalesce(p_decision, ''));
  v_comments text := nullif(btrim(coalesce(p_comments, '')), '');
  v_review_id uuid;
BEGIN
  IF v_admin_id IS NULL OR NOT public.is_admin() OR NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = v_admin_id AND p.role = 'admin' AND p.status = 'active'
  ) THEN
    RAISE EXCEPTION 'You do not have permission to perform this action.';
  END IF;
  IF v_decision NOT IN ('approved', 'revision_required') THEN
    RAISE EXCEPTION 'Select approve or request revision.';
  END IF;
  IF v_decision = 'revision_required' AND v_comments IS NULL THEN
    RAISE EXCEPTION 'Revision comments are required.';
  END IF;
  IF v_comments IS NOT NULL AND char_length(v_comments) > 2000 THEN
    RAISE EXCEPTION 'Comments cannot exceed 2000 characters.';
  END IF;

  SELECT ms.id, ms.portfolio_output_id, ms.version_number
  INTO v_submission
  FROM public.moodboard_submissions ms
  WHERE ms.id = p_moodboard_submission_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Moodboard submission was not found.';
  END IF;

  SELECT po.id, po.team_id, po.moodboard_status
  INTO v_portfolio
  FROM public.portfolio_outputs po
  WHERE po.id = v_submission.portfolio_output_id
  FOR UPDATE;

  IF v_portfolio.moodboard_status <> 'pending_admin' THEN
    RAISE EXCEPTION 'This moodboard is not awaiting Admin review.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.moodboard_submissions newer
    WHERE newer.portfolio_output_id = v_submission.portfolio_output_id
      AND newer.version_number > v_submission.version_number
  ) THEN
    RAISE EXCEPTION 'Only the latest moodboard submission can be reviewed.';
  END IF;

  INSERT INTO public.moodboard_reviews (
    moodboard_submission_id, reviewer_user_id, decision, comments,
    created_by, created_at
  )
  VALUES (
    v_submission.id, v_admin_id, v_decision,
    v_comments,
    v_admin_id, now()
  )
  ON CONFLICT ON CONSTRAINT moodboard_reviews_moodboard_submission_id_key
  DO NOTHING
  RETURNING id INTO v_review_id;

  IF v_review_id IS NULL THEN
    RAISE EXCEPTION 'This moodboard has already been reviewed.';
  END IF;

  UPDATE public.portfolio_outputs
  SET moodboard_status = v_decision
  WHERE id = v_submission.portfolio_output_id;

  PERFORM public.enqueue_team_notification(
    v_portfolio.team_id,
    CASE WHEN v_decision = 'approved'
      THEN 'moodboard_approved' ELSE 'moodboard_revision_required' END,
    CASE WHEN v_decision = 'approved'
      THEN 'Moodboard approved' ELSE 'Moodboard revision requested' END,
    CASE WHEN v_decision = 'approved'
      THEN 'Your moodboard has been approved. Studio booking is now available.'
      ELSE 'Admin requested changes to the moodboard. Review the comments and submit a new version.' END,
    '/student/portfolio',
    'moodboard_submission',
    v_submission.id,
    'moodboard_review:' || v_submission.id::text,
    true, true, true
  );

  moodboard_submission_id := v_submission.id;
  portfolio_output_id := v_submission.portfolio_output_id;
  decision := v_decision;
  moodboard_status := v_decision;
  RETURN NEXT;
END;
$function$;

COMMENT ON FUNCTION public.review_moodboard_as_admin(uuid, text, text) IS
  'Admin-only moodboard approval/revision RPC with an unambiguous unique-conflict target.';
