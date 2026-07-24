-- =============================================================================
-- Migration 026: Mood board submissions + dual review
-- Depends on: 025_skillset_rebuild_foundations.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.mood_board_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  title text NOT NULL,
  mood_board_url text NOT NULL,
  notes text,
  version_number integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending_review'
    CHECK (status IN (
      'pending_review',
      'revision_required',
      'approved'
    )),
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, student_id, version_number)
);

CREATE INDEX IF NOT EXISTS mood_board_submissions_team_idx
  ON public.mood_board_submissions (team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS mood_board_submissions_student_idx
  ON public.mood_board_submissions (student_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.mood_board_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.mood_board_submissions(id) ON DELETE CASCADE,
  reviewer_role text NOT NULL CHECK (reviewer_role IN ('educator', 'admin')),
  reviewer_user_id uuid NOT NULL REFERENCES public.profiles(id),
  decision text NOT NULL CHECK (decision IN ('approved', 'revision_required')),
  comments text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (submission_id, reviewer_role)
);

ALTER TABLE public.mood_board_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mood_board_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mood_board_submissions_select ON public.mood_board_submissions;
CREATE POLICY mood_board_submissions_select
  ON public.mood_board_submissions FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR student_id = public.my_student_id()
    OR EXISTS (
      SELECT 1
      FROM public.students s
      JOIN public.educators e ON e.institute_id = s.institute_id
      WHERE s.id = mood_board_submissions.student_id
        AND e.user_id = auth.uid()
        AND e.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = mood_board_submissions.team_id
        AND tm.student_id = public.my_student_id()
        AND tm.member_status = 'active'
    )
  );

DROP POLICY IF EXISTS mood_board_reviews_select ON public.mood_board_reviews;
CREATE POLICY mood_board_reviews_select
  ON public.mood_board_reviews FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.mood_board_submissions mbs
      WHERE mbs.id = mood_board_reviews.submission_id
        AND (
          mbs.student_id = public.my_student_id()
          OR EXISTS (
            SELECT 1
            FROM public.students s
            JOIN public.educators e ON e.institute_id = s.institute_id
            WHERE s.id = mbs.student_id AND e.user_id = auth.uid()
          )
        )
    )
  );

GRANT SELECT ON public.mood_board_submissions, public.mood_board_reviews TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_mood_board(
  p_title text,
  p_mood_board_url text,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_student_id uuid;
  v_team_id uuid;
  v_title text := nullif(btrim(coalesce(p_title, '')), '');
  v_url text := nullif(btrim(coalesce(p_mood_board_url, '')), '');
  v_notes text := nullif(btrim(coalesce(p_notes, '')), '');
  v_version integer;
  v_id uuid;
BEGIN
  IF v_uid IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = v_uid AND p.role = 'student' AND p.status = 'active'
  ) THEN
    RAISE EXCEPTION 'You do not have permission to perform this action.';
  END IF;

  v_student_id := public.my_student_id();
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Your student profile could not be found.';
  END IF;

  SELECT tm.team_id INTO v_team_id
  FROM public.team_members tm
  JOIN public.teams t ON t.id = tm.team_id
  WHERE tm.student_id = v_student_id
    AND tm.member_status = 'active'
    AND t.status = 'active'
    AND t.current_stage_number >= 3
  LIMIT 1;

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'Mood board opens after BMS is completed for your team.';
  END IF;

  IF v_title IS NULL OR char_length(v_title) < 3 THEN
    RAISE EXCEPTION 'Title must be at least 3 characters.';
  END IF;
  IF v_url IS NULL OR char_length(v_url) < 8 THEN
    RAISE EXCEPTION 'Provide a valid mood board URL.';
  END IF;

  SELECT coalesce(max(mbs.version_number), 0) + 1 INTO v_version
  FROM public.mood_board_submissions mbs
  WHERE mbs.team_id = v_team_id AND mbs.student_id = v_student_id;

  INSERT INTO public.mood_board_submissions (
    team_id, student_id, title, mood_board_url, notes, version_number, status, created_by
  ) VALUES (
    v_team_id, v_student_id, v_title, v_url, v_notes, v_version, 'pending_review', v_uid
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.review_mood_board(
  p_submission_id uuid,
  p_decision text,
  p_comments text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_submission record;
  v_decision text := nullif(btrim(coalesce(p_decision, '')), '');
  v_comments text := nullif(btrim(coalesce(p_comments, '')), '');
  v_has_educator boolean;
  v_has_admin boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'You do not have permission to perform this action.';
  END IF;

  IF v_decision IS NULL OR v_decision NOT IN ('approved', 'revision_required') THEN
    RAISE EXCEPTION 'Select approve or revision required.';
  END IF;

  IF v_decision = 'revision_required' AND v_comments IS NULL THEN
    RAISE EXCEPTION 'Revision comments are required.';
  END IF;

  SELECT mbs.* INTO v_submission
  FROM public.mood_board_submissions mbs
  WHERE mbs.id = p_submission_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Mood board submission was not found.';
  END IF;

  IF public.is_admin() THEN
    v_role := 'admin';
  ELSIF EXISTS (
    SELECT 1
    FROM public.students s
    JOIN public.educators e ON e.institute_id = s.institute_id
    WHERE s.id = v_submission.student_id
      AND e.user_id = v_uid
      AND e.status = 'active'
  ) THEN
    v_role := 'educator';
  ELSE
    RAISE EXCEPTION 'You do not have permission to perform this action.';
  END IF;

  INSERT INTO public.mood_board_reviews (
    submission_id, reviewer_role, reviewer_user_id, decision, comments
  ) VALUES (
    p_submission_id, v_role, v_uid, v_decision, v_comments
  )
  ON CONFLICT (submission_id, reviewer_role) DO UPDATE
  SET decision = EXCLUDED.decision,
      comments = EXCLUDED.comments,
      reviewer_user_id = EXCLUDED.reviewer_user_id,
      created_at = now();

  IF v_decision = 'revision_required' THEN
    UPDATE public.mood_board_submissions
    SET status = 'revision_required', updated_at = now()
    WHERE id = p_submission_id;
    RETURN true;
  END IF;

  SELECT
    EXISTS (
      SELECT 1 FROM public.mood_board_reviews r
      WHERE r.submission_id = p_submission_id
        AND r.reviewer_role = 'educator'
        AND r.decision = 'approved'
    ),
    EXISTS (
      SELECT 1 FROM public.mood_board_reviews r
      WHERE r.submission_id = p_submission_id
        AND r.reviewer_role = 'admin'
        AND r.decision = 'approved'
    )
  INTO v_has_educator, v_has_admin;

  IF v_has_educator AND v_has_admin THEN
    UPDATE public.mood_board_submissions
    SET status = 'approved', updated_at = now()
    WHERE id = p_submission_id;
  ELSE
    UPDATE public.mood_board_submissions
    SET status = 'pending_review', updated_at = now()
    WHERE id = p_submission_id;
  END IF;

  RETURN true;
END;
$function$;

REVOKE ALL ON FUNCTION public.submit_mood_board(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_mood_board(text, text, text) TO authenticated;
REVOKE ALL ON FUNCTION public.review_mood_board(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_mood_board(uuid, text, text) TO authenticated;
