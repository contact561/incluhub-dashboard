-- =============================================================================
-- IncluHub Education Management Dashboard
-- Migration 007: Team Stage Journey Enrollment (Package A.1)
--
-- - Allow unenrolled teams (nullable current_stage_number, not_started)
-- - Stop auto-creating stage progress during team creation
-- - Add start_team_stage_journey RPC
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Schema: nullable stage numbers for unenrolled teams/students
-- ---------------------------------------------------------------------------

ALTER TABLE teams
  ALTER COLUMN current_stage_number DROP NOT NULL;

ALTER TABLE teams
  ALTER COLUMN current_stage_number DROP DEFAULT;

ALTER TABLE teams
  DROP CONSTRAINT IF EXISTS teams_current_stage_number_check;

ALTER TABLE teams
  ADD CONSTRAINT teams_current_stage_number_check
  CHECK (
    current_stage_number IS NULL
    OR current_stage_number BETWEEN 0 AND 5
  );

ALTER TABLE students
  ALTER COLUMN current_stage_number DROP NOT NULL;

ALTER TABLE students
  DROP CONSTRAINT IF EXISTS students_current_stage_number_check;

ALTER TABLE students
  ADD CONSTRAINT students_current_stage_number_check
  CHECK (
    current_stage_number IS NULL
    OR current_stage_number BETWEEN 0 AND 5
  );

-- ---------------------------------------------------------------------------
-- 2. Replace create_balanced_team — team only, no stage journey
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION create_balanced_team(
  p_team_name text,
  p_program_id uuid,
  p_makeup_artist_student_id uuid,
  p_photographer_student_id uuid,
  p_hairstylist_student_id uuid,
  p_makeup_educator_id uuid,
  p_photography_educator_id uuid,
  p_hairstyling_educator_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_admin_id uuid;
  v_team_id uuid;
  v_program record;
  v_makeup_student record;
  v_photo_student record;
  v_hair_student record;
  v_makeup_educator record;
  v_photo_educator record;
  v_hair_educator record;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can create teams.';
  END IF;

  v_admin_id := get_my_profile_id();
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin profile not found.';
  END IF;

  IF nullif(trim(p_team_name), '') IS NULL THEN
    RAISE EXCEPTION 'Team name is required.';
  END IF;

  IF p_makeup_artist_student_id = p_photographer_student_id
     OR p_makeup_artist_student_id = p_hairstylist_student_id
     OR p_photographer_student_id = p_hairstylist_student_id THEN
    RAISE EXCEPTION 'All three students must be different people.';
  END IF;

  IF p_makeup_educator_id = p_photography_educator_id
     OR p_makeup_educator_id = p_hairstyling_educator_id
     OR p_photography_educator_id = p_hairstyling_educator_id THEN
    RAISE EXCEPTION 'All three educators must be different people.';
  END IF;

  SELECT id, status
  INTO v_program
  FROM programs
  WHERE id = p_program_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Selected program was not found.';
  END IF;

  IF v_program.status <> 'active' THEN
    RAISE EXCEPTION 'Selected program must be active.';
  END IF;

  SELECT id, institute_id, student_category, status, current_team_id
  INTO v_makeup_student
  FROM students
  WHERE id = p_makeup_artist_student_id
  FOR UPDATE;

  SELECT id, institute_id, student_category, status, current_team_id
  INTO v_photo_student
  FROM students
  WHERE id = p_photographer_student_id
  FOR UPDATE;

  SELECT id, institute_id, student_category, status, current_team_id
  INTO v_hair_student
  FROM students
  WHERE id = p_hairstylist_student_id
  FOR UPDATE;

  IF v_makeup_student.id IS NULL
     OR v_photo_student.id IS NULL
     OR v_hair_student.id IS NULL THEN
    RAISE EXCEPTION 'One or more selected students were not found.';
  END IF;

  IF v_makeup_student.status <> 'active'
     OR v_photo_student.status <> 'active'
     OR v_hair_student.status <> 'active' THEN
    RAISE EXCEPTION 'All selected students must be active.';
  END IF;

  IF v_makeup_student.student_category <> 'makeup_artist'
     OR v_photo_student.student_category <> 'photographer'
     OR v_hair_student.student_category <> 'hairstylist' THEN
    RAISE EXCEPTION 'Students must match makeup_artist, photographer, and hairstylist categories.';
  END IF;

  IF v_makeup_student.current_team_id IS NOT NULL
     OR v_photo_student.current_team_id IS NOT NULL
     OR v_hair_student.current_team_id IS NOT NULL THEN
    RAISE EXCEPTION 'One or more selected students are already in an active team.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM team_members tm
    JOIN teams t ON t.id = tm.team_id
    WHERE tm.student_id IN (
      p_makeup_artist_student_id,
      p_photographer_student_id,
      p_hairstylist_student_id
    )
      AND tm.member_status = 'active'
      AND t.status = 'active'
  ) THEN
    RAISE EXCEPTION 'One or more selected students are already in an active team.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM program_enrollments
    WHERE program_id = p_program_id
      AND student_id = p_makeup_artist_student_id
      AND status = 'active'
  )
  OR NOT EXISTS (
    SELECT 1 FROM program_enrollments
    WHERE program_id = p_program_id
      AND student_id = p_photographer_student_id
      AND status = 'active'
  )
  OR NOT EXISTS (
    SELECT 1 FROM program_enrollments
    WHERE program_id = p_program_id
      AND student_id = p_hairstylist_student_id
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'All selected students must be actively enrolled in the program.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM program_institutes
    WHERE program_id = p_program_id
      AND institute_id = v_makeup_student.institute_id
      AND status = 'active'
  )
  OR NOT EXISTS (
    SELECT 1 FROM program_institutes
    WHERE program_id = p_program_id
      AND institute_id = v_photo_student.institute_id
      AND status = 'active'
  )
  OR NOT EXISTS (
    SELECT 1 FROM program_institutes
    WHERE program_id = p_program_id
      AND institute_id = v_hair_student.institute_id
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Each student institute must be an active participant in the program.';
  END IF;

  SELECT id, institute_id, educator_type, status
  INTO v_makeup_educator
  FROM educators
  WHERE id = p_makeup_educator_id
  FOR UPDATE;

  SELECT id, institute_id, educator_type, status
  INTO v_photo_educator
  FROM educators
  WHERE id = p_photography_educator_id
  FOR UPDATE;

  SELECT id, institute_id, educator_type, status
  INTO v_hair_educator
  FROM educators
  WHERE id = p_hairstyling_educator_id
  FOR UPDATE;

  IF v_makeup_educator.id IS NULL
     OR v_photo_educator.id IS NULL
     OR v_hair_educator.id IS NULL THEN
    RAISE EXCEPTION 'One or more selected educators were not found.';
  END IF;

  IF v_makeup_educator.status <> 'active'
     OR v_photo_educator.status <> 'active'
     OR v_hair_educator.status <> 'active' THEN
    RAISE EXCEPTION 'All selected educators must be active.';
  END IF;

  IF v_makeup_educator.educator_type <> 'makeup_educator'
     OR v_photo_educator.educator_type <> 'photography_educator'
     OR v_hair_educator.educator_type <> 'hairstyling_educator' THEN
    RAISE EXCEPTION 'Educators must match makeup, photography, and hairstyling types.';
  END IF;

  IF v_makeup_educator.institute_id <> v_makeup_student.institute_id THEN
    RAISE EXCEPTION 'Makeup educator must belong to the makeup student institute.';
  END IF;

  IF v_photo_educator.institute_id <> v_photo_student.institute_id THEN
    RAISE EXCEPTION 'Photography educator must belong to the photographer student institute.';
  END IF;

  IF v_hair_educator.institute_id <> v_hair_student.institute_id THEN
    RAISE EXCEPTION 'Hairstyling educator must belong to the hairstylist student institute.';
  END IF;

  INSERT INTO teams (
    institute_id,
    program_id,
    team_name,
    current_stage_number,
    stage_status,
    status,
    created_by
  )
  VALUES (
    NULL,
    p_program_id,
    trim(p_team_name),
    NULL,
    'not_started',
    'active',
    v_admin_id
  )
  RETURNING id INTO v_team_id;

  INSERT INTO team_members (
    team_id,
    student_id,
    student_category,
    member_status,
    created_by
  )
  VALUES
    (v_team_id, p_makeup_artist_student_id, 'makeup_artist', 'active', v_admin_id),
    (v_team_id, p_photographer_student_id, 'photographer', 'active', v_admin_id),
    (v_team_id, p_hairstylist_student_id, 'hairstylist', 'active', v_admin_id);

  INSERT INTO team_educators (
    team_id,
    student_id,
    educator_id,
    educator_type,
    status,
    created_by
  )
  VALUES
    (v_team_id, p_makeup_artist_student_id, p_makeup_educator_id, 'makeup_educator', 'active', v_admin_id),
    (v_team_id, p_photographer_student_id, p_photography_educator_id, 'photography_educator', 'active', v_admin_id),
    (v_team_id, p_hairstylist_student_id, p_hairstyling_educator_id, 'hairstyling_educator', 'active', v_admin_id);

  UPDATE students
  SET current_team_id = v_team_id
  WHERE id IN (
    p_makeup_artist_student_id,
    p_photographer_student_id,
    p_hairstylist_student_id
  );

  RETURN v_team_id;
END;
$function$;

COMMENT ON FUNCTION create_balanced_team IS
  'Atomically creates a program-scoped balanced team with per-student educators. Stage journey is not started until start_team_stage_journey. Admin only.';

REVOKE ALL ON FUNCTION create_balanced_team(
  text, uuid, uuid, uuid, uuid, uuid, uuid, uuid
) FROM PUBLIC;

REVOKE ALL ON FUNCTION create_balanced_team(
  text, uuid, uuid, uuid, uuid, uuid, uuid, uuid
) FROM anon;

GRANT EXECUTE ON FUNCTION create_balanced_team(
  text, uuid, uuid, uuid, uuid, uuid, uuid, uuid
) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. start_team_stage_journey RPC
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.start_team_stage_journey(
  p_team_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_admin_id uuid;
  v_now timestamptz := now();
  v_team record;
  v_stage record;
  v_makeup_student_id uuid;
  v_photo_student_id uuid;
  v_hair_student_id uuid;
  v_member_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'You do not have permission to perform this action.';
  END IF;

  IF NOT is_admin() THEN
    RAISE EXCEPTION 'You do not have permission to perform this action.';
  END IF;

  v_admin_id := get_my_profile_id();
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'You do not have permission to perform this action.';
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
    RAISE EXCEPTION 'Team is inactive.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM team_stage_progress
    WHERE team_id = p_team_id
  ) THEN
    RAISE EXCEPTION 'This team already has an active stage journey.';
  END IF;

  SELECT count(*) INTO v_member_count
  FROM team_members
  WHERE team_id = p_team_id
    AND member_status = 'active';

  IF v_member_count <> 3 THEN
    RAISE EXCEPTION 'The team must contain exactly three active students.';
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
    RAISE EXCEPTION 'The team must contain one Makeup Artist, one Photographer and one Hairstylist.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM students
    WHERE id = v_makeup_student_id
      AND status = 'active'
      AND student_category = 'makeup_artist'
  )
  OR NOT EXISTS (
    SELECT 1
    FROM students
    WHERE id = v_photo_student_id
      AND status = 'active'
      AND student_category = 'photographer'
  )
  OR NOT EXISTS (
    SELECT 1
    FROM students
    WHERE id = v_hair_student_id
      AND status = 'active'
      AND student_category = 'hairstylist'
  ) THEN
    RAISE EXCEPTION 'The team must contain one Makeup Artist, one Photographer and one Hairstylist.';
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
    RAISE EXCEPTION 'Every student must have a matching educator before the journey can begin.';
  END IF;

  FOR v_stage IN
    SELECT id, stage_number
    FROM stages
    WHERE status = 'active'
    ORDER BY stage_number
  LOOP
    INSERT INTO team_stage_progress (
      team_id,
      stage_id,
      stage_number,
      status,
      started_at,
      completed_at,
      admin_approval_status,
      admin_approved_by,
      admin_approved_at,
      created_by
    )
    VALUES (
      p_team_id,
      v_stage.id,
      v_stage.stage_number,
      CASE
        WHEN v_stage.stage_number IN (0, 1) THEN 'completed'::stage_status
        WHEN v_stage.stage_number = 2 THEN 'in_progress'::stage_status
        ELSE 'locked'::stage_status
      END,
      CASE
        WHEN v_stage.stage_number IN (0, 1, 2) THEN v_now
        ELSE NULL
      END,
      CASE
        WHEN v_stage.stage_number IN (0, 1) THEN v_now
        ELSE NULL
      END,
      CASE
        WHEN v_stage.stage_number IN (0, 1) THEN 'approved'::approval_status
        ELSE 'pending'::approval_status
      END,
      CASE
        WHEN v_stage.stage_number IN (0, 1) THEN v_admin_id
        ELSE NULL
      END,
      CASE
        WHEN v_stage.stage_number IN (0, 1) THEN v_now
        ELSE NULL
      END,
      v_admin_id
    );
  END LOOP;

  UPDATE teams
  SET
    current_stage_number = 2,
    stage_status = 'in_progress'
  WHERE id = p_team_id;

  UPDATE students
  SET current_stage_number = 2
  WHERE id IN (
    v_makeup_student_id,
    v_photo_student_id,
    v_hair_student_id
  );
END;
$function$;

COMMENT ON FUNCTION public.start_team_stage_journey(uuid) IS
  'Atomically enrolls a team in the stage journey at Stage 2. Admin only.';

REVOKE ALL ON FUNCTION public.start_team_stage_journey(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.start_team_stage_journey(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.start_team_stage_journey(uuid) TO authenticated;
