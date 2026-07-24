-- =============================================================================
-- Migration 028: Admin team member deassign + assign into open slot
-- Additive. Keeps create_balanced_team. Fashion designers remain roster-only.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.deassign_team_member(
  p_team_id uuid,
  p_student_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_admin_id uuid := auth.uid();
  v_member record;
  v_team record;
  v_user_id uuid;
BEGIN
  IF v_admin_id IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'You do not have permission to perform this action.';
  END IF;

  SELECT t.id, t.status, t.team_name
  INTO v_team
  FROM public.teams t
  WHERE t.id = p_team_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Team was not found.';
  END IF;
  IF v_team.status <> 'active' THEN
    RAISE EXCEPTION 'Only active teams can be edited.';
  END IF;

  SELECT tm.id, tm.student_id, tm.student_category, tm.member_status
  INTO v_member
  FROM public.team_members tm
  WHERE tm.team_id = p_team_id
    AND tm.student_id = p_student_id
  FOR UPDATE;

  IF NOT FOUND OR v_member.member_status <> 'active' THEN
    RAISE EXCEPTION 'Active team member was not found.';
  END IF;

  UPDATE public.team_members
  SET member_status = 'removed',
      updated_at = now()
  WHERE id = v_member.id;

  UPDATE public.team_educators
  SET status = 'inactive',
      updated_at = now()
  WHERE team_id = p_team_id
    AND student_id = p_student_id
    AND status = 'active';

  UPDATE public.students
  SET current_team_id = NULL,
      updated_at = now()
  WHERE id = p_student_id
    AND current_team_id = p_team_id;

  SELECT s.user_id INTO v_user_id
  FROM public.students s
  WHERE s.id = p_student_id;

  IF v_user_id IS NOT NULL THEN
    PERFORM public.enqueue_user_notification(
      v_user_id,
      'team_member_deassigned',
      'Removed from team',
      'Admin removed you from team "' || v_team.team_name || '". You can be assigned to another team.',
      '/student/my-team',
      'team',
      p_team_id,
      'team_member_deassigned:' || p_team_id::text || ':' || p_student_id::text
    );
  END IF;

  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.assign_team_member_slot(
  p_team_id uuid,
  p_student_id uuid,
  p_educator_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_admin_id uuid := auth.uid();
  v_team record;
  v_student record;
  v_educator record;
  v_expected_educator_type text;
  v_user_id uuid;
BEGIN
  IF v_admin_id IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'You do not have permission to perform this action.';
  END IF;

  SELECT t.id, t.status, t.program_id, t.team_name
  INTO v_team
  FROM public.teams t
  WHERE t.id = p_team_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Team was not found.';
  END IF;
  IF v_team.status <> 'active' THEN
    RAISE EXCEPTION 'Only active teams can be edited.';
  END IF;

  SELECT s.id, s.institute_id, s.student_category, s.status, s.current_team_id, s.user_id
  INTO v_student
  FROM public.students s
  WHERE s.id = p_student_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student was not found.';
  END IF;
  IF v_student.status <> 'active' THEN
    RAISE EXCEPTION 'Student must be active.';
  END IF;
  IF v_student.student_category NOT IN ('makeup_artist', 'photographer', 'hairstylist') THEN
    RAISE EXCEPTION 'Only makeup, photographer, and hairstylist students can join studio teams.';
  END IF;
  IF v_student.current_team_id IS NOT NULL THEN
    RAISE EXCEPTION 'Student is already on an active team.';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.team_members tm
    JOIN public.teams t ON t.id = tm.team_id
    WHERE tm.student_id = p_student_id
      AND tm.member_status = 'active'
      AND t.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Student is already on an active team.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.team_members tm
    WHERE tm.team_id = p_team_id
      AND tm.student_category = v_student.student_category
      AND tm.member_status = 'active'
  ) THEN
    RAISE EXCEPTION 'This team already has an active member for that category.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.program_enrollments pe
    WHERE pe.program_id = v_team.program_id
      AND pe.student_id = p_student_id
      AND pe.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Student must be enrolled in this team''s program.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.program_institutes pi
    WHERE pi.program_id = v_team.program_id
      AND pi.institute_id = v_student.institute_id
      AND pi.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Student institute must participate in this program.';
  END IF;

  v_expected_educator_type := CASE v_student.student_category
    WHEN 'makeup_artist' THEN 'makeup_educator'
    WHEN 'photographer' THEN 'photography_educator'
    ELSE 'hairstyling_educator'
  END;

  SELECT e.id, e.institute_id, e.educator_type, e.status
  INTO v_educator
  FROM public.educators e
  WHERE e.id = p_educator_id
  FOR UPDATE;

  IF NOT FOUND OR v_educator.status <> 'active' THEN
    RAISE EXCEPTION 'Educator was not found or is not active.';
  END IF;
  IF v_educator.educator_type <> v_expected_educator_type THEN
    RAISE EXCEPTION 'Educator type must match the student category.';
  END IF;
  IF v_educator.institute_id <> v_student.institute_id THEN
    RAISE EXCEPTION 'Educator must belong to the student institute.';
  END IF;

  INSERT INTO public.team_members (
    team_id, student_id, student_category, member_status, created_by
  ) VALUES (
    p_team_id, p_student_id, v_student.student_category, 'active', v_admin_id
  );

  INSERT INTO public.team_educators (
    team_id, student_id, educator_id, educator_type, status, created_by
  ) VALUES (
    p_team_id, p_student_id, p_educator_id, v_educator.educator_type, 'active', v_admin_id
  );

  UPDATE public.students
  SET current_team_id = p_team_id,
      updated_at = now()
  WHERE id = p_student_id;

  v_user_id := v_student.user_id;
  IF v_user_id IS NOT NULL THEN
    PERFORM public.enqueue_user_notification(
      v_user_id,
      'team_member_assigned',
      'Assigned to a team',
      'Admin assigned you to team "' || v_team.team_name || '".',
      '/student/my-team',
      'team',
      p_team_id,
      'team_member_assigned:' || p_team_id::text || ':' || p_student_id::text
    );
  END IF;

  RETURN true;
END;
$function$;

REVOKE ALL ON FUNCTION public.deassign_team_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.deassign_team_member(uuid, uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.assign_team_member_slot(uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_team_member_slot(uuid, uuid, uuid) TO authenticated;
