-- Stage 5: per-student ecosystem access requires explicit Admin approval.
-- Completing Brand Works moves the team to Stage 5 (under review) but does not
-- grant ecosystem access until Admin approves each student individually.

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS ecosystem_access_status text NOT NULL DEFAULT 'locked',
  ADD COLUMN IF NOT EXISTS ecosystem_access_granted_at timestamptz,
  ADD COLUMN IF NOT EXISTS ecosystem_access_granted_by uuid REFERENCES public.profiles (id);

ALTER TABLE public.students
  DROP CONSTRAINT IF EXISTS students_ecosystem_access_status_check;

ALTER TABLE public.students
  ADD CONSTRAINT students_ecosystem_access_status_check
  CHECK (ecosystem_access_status IN ('locked', 'pending_review', 'granted'));

COMMENT ON COLUMN public.students.ecosystem_access_status IS
  'locked = before Stage 5; pending_review = Stage 5 awaiting Admin; granted = ecosystem unlocked.';

-- Align existing Stage 5 records with the new workflow.
UPDATE public.students
SET ecosystem_access_status = 'pending_review'
WHERE current_stage_number >= 5
  AND ecosystem_access_status = 'locked';

UPDATE public.team_stage_progress AS tsp
SET status = 'in_progress',
    completed_at = NULL,
    admin_approval_status = 'pending',
    admin_approved_by = NULL,
    admin_approved_at = NULL
FROM public.teams AS t
WHERE tsp.team_id = t.id
  AND tsp.stage_number = 5
  AND t.current_stage_number = 5
  AND tsp.status = 'completed';

UPDATE public.teams AS t
SET stage_status = 'in_progress'
WHERE t.current_stage_number = 5
  AND t.stage_status = 'completed';

CREATE OR REPLACE FUNCTION public.complete_brand_works(p_team_id uuid)
RETURNS TABLE (
  team_id uuid,
  stage4_status text,
  stage5_status text,
  current_stage_number integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_admin_id uuid;
  v_now timestamptz := now();
  v_today_ist date := (v_now AT TIME ZONE 'Asia/Kolkata')::date;
  v_team record;
  v_stage3 record;
  v_stage4 record;
  v_stage5 record;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'You do not have permission to perform this action.';
  END IF;

  SELECT p.id
  INTO v_admin_id
  FROM public.profiles AS p
  WHERE p.id = auth.uid()
    AND p.role = 'admin'
    AND p.status = 'active';

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'You do not have permission to perform this action.';
  END IF;

  SELECT t.id, t.status, t.current_stage_number, t.stage_status
  INTO v_team
  FROM public.teams AS t
  WHERE t.id = p_team_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Team was not found.';
  END IF;

  SELECT tsp.id, tsp.status
  INTO v_stage3
  FROM public.team_stage_progress AS tsp
  WHERE tsp.team_id = p_team_id
    AND tsp.stage_number = 3
  FOR UPDATE;

  SELECT
    tsp.id,
    tsp.status,
    tsp.brand_works_date,
    tsp.brand_works_scheduled_at,
    tsp.brand_works_scheduled_by,
    tsp.brand_works_completed_at,
    tsp.brand_works_completed_by
  INTO v_stage4
  FROM public.team_stage_progress AS tsp
  WHERE tsp.team_id = p_team_id
    AND tsp.stage_number = 4
  FOR UPDATE;

  SELECT tsp.id, tsp.status
  INTO v_stage5
  FROM public.team_stage_progress AS tsp
  WHERE tsp.team_id = p_team_id
    AND tsp.stage_number = 5
  FOR UPDATE;

  -- Idempotent retry after a successful commit.
  IF v_team.status = 'active'
     AND v_team.current_stage_number = 5
     AND v_stage4.status = 'completed'
     AND v_stage4.brand_works_completed_at IS NOT NULL
     AND v_stage4.brand_works_completed_by IS NOT NULL
     AND v_stage5.status = 'in_progress' THEN
    RETURN QUERY SELECT p_team_id, 'completed', 'in_progress', 5;
    RETURN;
  END IF;

  IF v_team.status <> 'active' OR v_team.current_stage_number <> 4 THEN
    RAISE EXCEPTION 'Team is not currently in Stage 4.';
  END IF;

  IF v_stage3.id IS NULL OR v_stage3.status <> 'completed' THEN
    RAISE EXCEPTION 'Stage 3 is incomplete.';
  END IF;

  IF v_stage4.id IS NULL OR v_stage4.status <> 'in_progress' THEN
    RAISE EXCEPTION 'Team is not currently in Stage 4.';
  END IF;

  IF v_stage4.brand_works_date IS NULL
     OR v_stage4.brand_works_scheduled_at IS NULL
     OR v_stage4.brand_works_scheduled_by IS NULL THEN
    RAISE EXCEPTION 'Brand Works must be scheduled before completion.';
  END IF;

  IF v_stage4.brand_works_date > v_today_ist THEN
    RAISE EXCEPTION 'Brand Works cannot be completed before its scheduled date.';
  END IF;

  IF v_stage5.id IS NULL OR v_stage5.status <> 'locked' THEN
    RAISE EXCEPTION 'Stage progression could not be completed.';
  END IF;

  UPDATE public.team_stage_progress AS tsp
  SET
    status = 'completed',
    completed_at = v_now,
    brand_works_completed_at = v_now,
    brand_works_completed_by = v_admin_id,
    admin_approval_status = 'approved',
    admin_approved_by = v_admin_id,
    admin_approved_at = v_now
  WHERE tsp.id = v_stage4.id;

  UPDATE public.team_stage_progress AS tsp
  SET
    status = 'in_progress',
    started_at = coalesce(tsp.started_at, v_now),
    completed_at = NULL,
    admin_approval_status = 'pending',
    admin_approved_by = NULL,
    admin_approved_at = NULL
  WHERE tsp.id = v_stage5.id;

  UPDATE public.teams AS t
  SET current_stage_number = 5, stage_status = 'in_progress'
  WHERE t.id = p_team_id;

  UPDATE public.students AS s
  SET
    current_stage_number = 5,
    ecosystem_access_status = 'pending_review'
  FROM public.team_members AS tm
  WHERE tm.team_id = p_team_id
    AND tm.student_id = s.id
    AND tm.member_status = 'active';

  RETURN QUERY SELECT p_team_id, 'completed', 'in_progress', 5;
END;
$function$;

CREATE OR REPLACE FUNCTION public.approve_student_ecosystem_access(p_student_id uuid)
RETURNS TABLE (
  student_id uuid,
  ecosystem_access_status text,
  ecosystem_access_granted_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_admin_id uuid;
  v_now timestamptz := now();
  v_student record;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'You do not have permission to perform this action.';
  END IF;

  SELECT p.id
  INTO v_admin_id
  FROM public.profiles AS p
  WHERE p.id = auth.uid()
    AND p.role = 'admin'
    AND p.status = 'active';

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'You do not have permission to perform this action.';
  END IF;

  SELECT
    s.id,
    s.status,
    s.current_stage_number,
    s.ecosystem_access_status
  INTO v_student
  FROM public.students AS s
  WHERE s.id = p_student_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student was not found.';
  END IF;

  IF v_student.status <> 'active' THEN
    RAISE EXCEPTION 'Student is not active.';
  END IF;

  IF coalesce(v_student.current_stage_number, 0) < 5 THEN
    RAISE EXCEPTION 'Student has not reached Stage 5.';
  END IF;

  IF v_student.ecosystem_access_status = 'granted' THEN
    RETURN QUERY
    SELECT
      v_student.id,
      'granted'::text,
      (SELECT s.ecosystem_access_granted_at FROM public.students AS s WHERE s.id = v_student.id);
    RETURN;
  END IF;

  IF v_student.ecosystem_access_status <> 'pending_review' THEN
    RAISE EXCEPTION 'Student is not awaiting ecosystem review.';
  END IF;

  UPDATE public.students AS s
  SET
    ecosystem_access_status = 'granted',
    ecosystem_access_granted_at = v_now,
    ecosystem_access_granted_by = v_admin_id
  WHERE s.id = p_student_id;

  RETURN QUERY
  SELECT p_student_id, 'granted'::text, v_now;
END;
$function$;

COMMENT ON FUNCTION public.complete_brand_works(uuid) IS
  'Admin-only: completes Stage 4 Brand Works, moves team to Stage 5 under review. Ecosystem access is granted per student separately.';
COMMENT ON FUNCTION public.approve_student_ecosystem_access(uuid) IS
  'Admin-only: grants IncluHub ecosystem access to an individual Stage 5 student after review.';

REVOKE ALL ON FUNCTION public.approve_student_ecosystem_access(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.approve_student_ecosystem_access(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.approve_student_ecosystem_access(uuid) TO authenticated;
