-- =============================================================================
-- IncluHub Education Management Dashboard
-- Migration 013: Stage 4 Brand Works
--
-- Forward-only migration. Do not edit migrations 001-012 in place.
-- Depends on: 012_fix_admin_review_status_ambiguity.sql
-- =============================================================================

ALTER TABLE public.team_stage_progress
  ADD COLUMN brand_works_date date,
  ADD COLUMN brand_works_remarks text,
  ADD COLUMN brand_works_scheduled_at timestamptz,
  ADD COLUMN brand_works_scheduled_by uuid
    REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN brand_works_completed_at timestamptz,
  ADD COLUMN brand_works_completed_by uuid
    REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.team_stage_progress
  ADD CONSTRAINT team_stage_progress_brand_works_remarks_length
  CHECK (
    brand_works_remarks IS NULL
    OR char_length(brand_works_remarks) <= 2000
  ),
  ADD CONSTRAINT team_stage_progress_brand_works_stage4_only
  CHECK (
    stage_number = 4
    OR (
      brand_works_date IS NULL
      AND brand_works_remarks IS NULL
      AND brand_works_scheduled_at IS NULL
      AND brand_works_scheduled_by IS NULL
      AND brand_works_completed_at IS NULL
      AND brand_works_completed_by IS NULL
    )
  );

COMMENT ON COLUMN public.team_stage_progress.brand_works_date IS
  'Scheduled Brand Works date for the Stage 4 team.';
COMMENT ON COLUMN public.team_stage_progress.brand_works_remarks IS
  'Optional admin scheduling remarks, limited to 2000 characters.';
COMMENT ON COLUMN public.team_stage_progress.brand_works_scheduled_at IS
  'Timestamp of the latest Brand Works schedule or reschedule.';
COMMENT ON COLUMN public.team_stage_progress.brand_works_scheduled_by IS
  'Active admin profile that last scheduled Brand Works.';
COMMENT ON COLUMN public.team_stage_progress.brand_works_completed_at IS
  'Timestamp when Brand Works was completed and Stage 5 finalized.';
COMMENT ON COLUMN public.team_stage_progress.brand_works_completed_by IS
  'Active admin profile that completed Brand Works.';

CREATE OR REPLACE FUNCTION public.schedule_brand_works(
  p_team_id uuid,
  p_brand_works_date date,
  p_remarks text
)
RETURNS TABLE (
  team_id uuid,
  brand_works_date date,
  brand_works_remarks text,
  brand_works_scheduled_at timestamptz,
  brand_works_scheduled_by uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_admin_id uuid;
  v_now timestamptz := now();
  v_remarks text := nullif(btrim(coalesce(p_remarks, '')), '');
  v_team record;
  v_stage3 record;
  v_stage4 record;
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

  IF p_team_id IS NULL OR p_brand_works_date IS NULL THEN
    RAISE EXCEPTION 'Brand Works date is required.';
  END IF;

  IF v_remarks IS NOT NULL AND char_length(v_remarks) > 2000 THEN
    RAISE EXCEPTION 'Remarks cannot exceed 2000 characters.';
  END IF;

  SELECT t.id, t.status, t.current_stage_number, t.stage_status
  INTO v_team
  FROM public.teams AS t
  WHERE t.id = p_team_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Team was not found.';
  END IF;

  IF v_team.status <> 'active' OR v_team.current_stage_number <> 4 THEN
    RAISE EXCEPTION 'Team is not currently in Stage 4.';
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
    tsp.brand_works_remarks,
    tsp.brand_works_scheduled_at,
    tsp.brand_works_scheduled_by
  INTO v_stage4
  FROM public.team_stage_progress AS tsp
  WHERE tsp.team_id = p_team_id
    AND tsp.stage_number = 4
  FOR UPDATE;

  IF v_stage3.id IS NULL OR v_stage3.status <> 'completed' THEN
    RAISE EXCEPTION 'Stage 3 is incomplete.';
  END IF;

  IF v_stage4.id IS NULL OR v_stage4.status <> 'in_progress' THEN
    RAISE EXCEPTION 'Team is not currently in Stage 4.';
  END IF;

  -- Identical retries are successful no-ops and retain the original audit data.
  IF v_stage4.brand_works_date IS NOT DISTINCT FROM p_brand_works_date
     AND v_stage4.brand_works_remarks IS NOT DISTINCT FROM v_remarks THEN
    RETURN QUERY
    SELECT
      p_team_id,
      v_stage4.brand_works_date,
      v_stage4.brand_works_remarks,
      v_stage4.brand_works_scheduled_at,
      v_stage4.brand_works_scheduled_by;
    RETURN;
  END IF;

  UPDATE public.team_stage_progress AS tsp
  SET
    brand_works_date = p_brand_works_date,
    brand_works_remarks = v_remarks,
    brand_works_scheduled_at = v_now,
    brand_works_scheduled_by = v_admin_id
  WHERE tsp.id = v_stage4.id;

  RETURN QUERY
  SELECT p_team_id, p_brand_works_date, v_remarks, v_now, v_admin_id;
END;
$function$;

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

  -- A retry after a successful commit is a safe, successful no-op.
  IF v_team.status = 'active'
     AND v_team.current_stage_number = 5
     AND v_stage4.status = 'completed'
     AND v_stage4.brand_works_completed_at IS NOT NULL
     AND v_stage4.brand_works_completed_by IS NOT NULL
     AND v_stage5.status = 'completed' THEN
    RETURN QUERY SELECT p_team_id, 'completed', 'completed', 5;
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
    status = 'completed',
    started_at = coalesce(tsp.started_at, v_now),
    completed_at = coalesce(tsp.completed_at, v_now),
    admin_approval_status = 'approved',
    admin_approved_by = v_admin_id,
    admin_approved_at = v_now
  WHERE tsp.id = v_stage5.id;

  UPDATE public.teams AS t
  SET current_stage_number = 5, stage_status = 'completed'
  WHERE t.id = p_team_id;

  UPDATE public.students AS s
  SET current_stage_number = 5
  FROM public.team_members AS tm
  WHERE tm.team_id = p_team_id
    AND tm.student_id = s.id
    AND tm.member_status = 'active';

  RETURN QUERY SELECT p_team_id, 'completed', 'completed', 5;
END;
$function$;

COMMENT ON FUNCTION public.schedule_brand_works(uuid, date, text) IS
  'Admin-only, row-locked Stage 4 Brand Works schedule/reschedule workflow.';
COMMENT ON FUNCTION public.complete_brand_works(uuid) IS
  'Admin-only atomic Stage 4 completion and completed Stage 5 transition.';

REVOKE ALL ON FUNCTION public.schedule_brand_works(uuid, date, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.schedule_brand_works(uuid, date, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.schedule_brand_works(uuid, date, text) TO authenticated;

REVOKE ALL ON FUNCTION public.complete_brand_works(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_brand_works(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.complete_brand_works(uuid) TO authenticated;

-- Stage progress remains readable through existing role-scoped RLS policies.
-- All mutations now go through audited SECURITY DEFINER workflow RPCs.
REVOKE INSERT, UPDATE, DELETE ON public.team_stage_progress FROM authenticated;
