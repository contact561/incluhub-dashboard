-- =============================================================================
-- IncluHub Education Management Dashboard
-- Migration 006a: Repair missing complete_bms_session RPC
--
-- Schema changes from 006 are already applied. This patch creates only the
-- function that was not registered in pg_proc.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.complete_bms_session(
  p_team_id uuid,
  p_session_date date,
  p_remarks text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_admin_id uuid;
  v_now timestamptz := now();
  v_today_ist date := (current_timestamp AT TIME ZONE 'Asia/Kolkata')::date;
  v_team record;
  v_stage1 record;
  v_stage2 record;
  v_stage3 record;
  v_makeup_student_id uuid;
  v_photo_student_id uuid;
  v_hair_student_id uuid;
  v_member_count integer;
  v_portfolio_photo_id uuid;
  v_portfolio_makeup_id uuid;
  v_portfolio_hair_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'You do not have permission to complete this action.';
  END IF;

  IF NOT is_admin() THEN
    RAISE EXCEPTION 'You do not have permission to complete this action.';
  END IF;

  v_admin_id := get_my_profile_id();
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'You do not have permission to complete this action.';
  END IF;

  IF p_session_date IS NULL THEN
    RAISE EXCEPTION 'BMS session date is required.';
  END IF;

  IF p_session_date > v_today_ist THEN
    RAISE EXCEPTION 'BMS session date cannot be in the future.';
  END IF;

  SELECT
    id,
    status,
    current_stage_number,
    stage_status
  INTO v_team
  FROM teams
  WHERE id = p_team_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Team was not found.';
  END IF;

  IF v_team.status <> 'active' THEN
    RAISE EXCEPTION 'Team is not active.';
  END IF;

  IF v_team.current_stage_number <> 2 THEN
    RAISE EXCEPTION 'Team is not currently in Stage 2.';
  END IF;

  SELECT id, status, stage_number
  INTO v_stage1
  FROM team_stage_progress
  WHERE team_id = p_team_id
    AND stage_number = 1
  FOR UPDATE;

  IF NOT FOUND OR v_stage1.status <> 'completed' THEN
    RAISE EXCEPTION 'Stage 1 is incomplete.';
  END IF;

  SELECT
    id,
    status,
    stage_number,
    completed_at
  INTO v_stage2
  FROM team_stage_progress
  WHERE team_id = p_team_id
    AND stage_number = 2
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stage 2 progress was not found.';
  END IF;

  IF v_stage2.status = 'completed' THEN
    RAISE EXCEPTION 'BMS session was already completed.';
  END IF;

  IF v_stage2.status <> 'in_progress' THEN
    RAISE EXCEPTION 'Team is not currently in Stage 2.';
  END IF;

  SELECT id, status, stage_number
  INTO v_stage3
  FROM team_stage_progress
  WHERE team_id = p_team_id
    AND stage_number = 3
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stage 3 progress was not found.';
  END IF;

  IF v_stage3.status <> 'locked' THEN
    RAISE EXCEPTION 'Stage skipping is not allowed.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM portfolio_outputs
    WHERE team_id = p_team_id
  ) THEN
    RAISE EXCEPTION 'Portfolio initialization already exists.';
  END IF;

  SELECT count(*) INTO v_member_count
  FROM team_members
  WHERE team_id = p_team_id
    AND member_status = 'active';

  IF v_member_count <> 3 THEN
    RAISE EXCEPTION 'Team composition is invalid.';
  END IF;

  SELECT student_id INTO v_makeup_student_id
  FROM team_members
  WHERE team_id = p_team_id
    AND member_status = 'active'
    AND student_category = 'makeup_artist';

  SELECT student_id INTO v_photo_student_id
  FROM team_members
  WHERE team_id = p_team_id
    AND member_status = 'active'
    AND student_category = 'photographer';

  SELECT student_id INTO v_hair_student_id
  FROM team_members
  WHERE team_id = p_team_id
    AND member_status = 'active'
    AND student_category = 'hairstylist';

  IF v_makeup_student_id IS NULL
     OR v_photo_student_id IS NULL
     OR v_hair_student_id IS NULL THEN
    RAISE EXCEPTION 'Team composition is invalid.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM team_educators te
    JOIN educators e ON e.id = te.educator_id
    JOIN students s ON s.id = te.student_id
    WHERE te.team_id = p_team_id
      AND te.status = 'active'
      AND te.student_id = v_makeup_student_id
      AND s.student_category = 'makeup_artist'
      AND e.educator_type = 'makeup_educator'
      AND e.status = 'active'
      AND e.institute_id = s.institute_id
  )
  OR NOT EXISTS (
    SELECT 1
    FROM team_educators te
    JOIN educators e ON e.id = te.educator_id
    JOIN students s ON s.id = te.student_id
    WHERE te.team_id = p_team_id
      AND te.status = 'active'
      AND te.student_id = v_photo_student_id
      AND s.student_category = 'photographer'
      AND e.educator_type = 'photography_educator'
      AND e.status = 'active'
      AND e.institute_id = s.institute_id
  )
  OR NOT EXISTS (
    SELECT 1
    FROM team_educators te
    JOIN educators e ON e.id = te.educator_id
    JOIN students s ON s.id = te.student_id
    WHERE te.team_id = p_team_id
      AND te.status = 'active'
      AND te.student_id = v_hair_student_id
      AND s.student_category = 'hairstylist'
      AND e.educator_type = 'hairstyling_educator'
      AND e.status = 'active'
      AND e.institute_id = s.institute_id
  ) THEN
    RAISE EXCEPTION 'Required educator mapping is missing.';
  END IF;

  UPDATE team_stage_progress
  SET
    status = 'completed',
    completed_at = v_now,
    bms_session_date = p_session_date,
    bms_remarks = nullif(trim(coalesce(p_remarks, '')), ''),
    admin_approval_status = 'approved',
    admin_approved_by = v_admin_id,
    admin_approved_at = v_now
  WHERE team_id = p_team_id
    AND stage_number = 2;

  UPDATE team_stage_progress
  SET
    status = 'in_progress',
    started_at = coalesce(started_at, v_now)
  WHERE team_id = p_team_id
    AND stage_number = 3;

  UPDATE teams
  SET
    current_stage_number = 3,
    stage_status = 'in_progress'
  WHERE id = p_team_id;

  UPDATE students
  SET current_stage_number = 3
  WHERE id IN (
    v_makeup_student_id,
    v_photo_student_id,
    v_hair_student_id
  );

  INSERT INTO portfolio_outputs (
    team_id,
    portfolio_type,
    leader_student_id,
    portfolio_title,
    portfolio_link,
    notes,
    status,
    sequence_order,
    workflow_status,
    created_by
  )
  VALUES (
    p_team_id,
    'photographer',
    v_photo_student_id,
    NULL,
    NULL,
    NULL,
    'pending',
    1,
    'awaiting_booking',
    v_admin_id
  )
  RETURNING id INTO v_portfolio_photo_id;

  INSERT INTO portfolio_outputs (
    team_id,
    portfolio_type,
    leader_student_id,
    portfolio_title,
    portfolio_link,
    notes,
    status,
    sequence_order,
    workflow_status,
    created_by
  )
  VALUES (
    p_team_id,
    'makeup_artist',
    v_makeup_student_id,
    NULL,
    NULL,
    NULL,
    'pending',
    2,
    'locked',
    v_admin_id
  )
  RETURNING id INTO v_portfolio_makeup_id;

  INSERT INTO portfolio_outputs (
    team_id,
    portfolio_type,
    leader_student_id,
    portfolio_title,
    portfolio_link,
    notes,
    status,
    sequence_order,
    workflow_status,
    created_by
  )
  VALUES (
    p_team_id,
    'hairstylist',
    v_hair_student_id,
    NULL,
    NULL,
    NULL,
    'pending',
    3,
    'locked',
    v_admin_id
  )
  RETURNING id INTO v_portfolio_hair_id;

  INSERT INTO portfolio_participants (portfolio_output_id, student_id, participation_role)
  VALUES
    (v_portfolio_photo_id, v_photo_student_id, 'leader'),
    (v_portfolio_photo_id, v_makeup_student_id, 'assistant'),
    (v_portfolio_photo_id, v_hair_student_id, 'assistant'),
    (v_portfolio_makeup_id, v_makeup_student_id, 'leader'),
    (v_portfolio_makeup_id, v_photo_student_id, 'assistant'),
    (v_portfolio_makeup_id, v_hair_student_id, 'assistant'),
    (v_portfolio_hair_id, v_hair_student_id, 'leader'),
    (v_portfolio_hair_id, v_photo_student_id, 'assistant'),
    (v_portfolio_hair_id, v_makeup_student_id, 'assistant');
END;
$function$;

COMMENT ON FUNCTION public.complete_bms_session(uuid, date, text) IS
  'Atomically completes Stage 2 BMS, unlocks Stage 3, and initializes sequential portfolio outputs. Admin only.';

REVOKE ALL ON FUNCTION public.complete_bms_session(uuid, date, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_bms_session(uuid, date, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.complete_bms_session(uuid, date, text) TO authenticated;
