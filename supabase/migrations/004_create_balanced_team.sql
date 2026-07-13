-- =============================================================================
-- IncluHub Education Management Dashboard
-- Migration 004: Atomic create_balanced_team RPC
--
-- Creates a balanced team (3 students + 3 educators) in one transaction.
-- Called only from admin server actions after role checks.
-- =============================================================================

create or replace function create_balanced_team(
  p_team_name text,
  p_institute_id uuid,
  p_program_id uuid,
  p_makeup_artist_student_id uuid,
  p_photographer_student_id uuid,
  p_hairstylist_student_id uuid,
  p_makeup_educator_id uuid,
  p_photography_educator_id uuid,
  p_hairstyling_educator_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid;
  v_team_id uuid;
  v_now timestamptz := now();
  v_program record;
  v_makeup_student record;
  v_photo_student record;
  v_hair_student record;
  v_makeup_educator record;
  v_photo_educator record;
  v_hair_educator record;
  v_stage record;
begin
  if not is_admin() then
    raise exception 'Only admins can create teams.';
  end if;

  v_admin_id := get_my_profile_id();

  if v_admin_id is null then
    raise exception 'Admin profile not found.';
  end if;

  if nullif(trim(p_team_name), '') is null then
    raise exception 'Team name is required.';
  end if;

  if p_makeup_artist_student_id = p_photographer_student_id
     or p_makeup_artist_student_id = p_hairstylist_student_id
     or p_photographer_student_id = p_hairstylist_student_id then
    raise exception 'All three students must be different people.';
  end if;

  if p_makeup_educator_id = p_photography_educator_id
     or p_makeup_educator_id = p_hairstyling_educator_id
     or p_photography_educator_id = p_hairstyling_educator_id then
    raise exception 'All three educators must be different people.';
  end if;

  select id, institute_id, status
    into v_program
  from programs
  where id = p_program_id;

  if not found then
    raise exception 'Selected program was not found.';
  end if;

  if v_program.institute_id <> p_institute_id then
    raise exception 'Selected program does not belong to the selected institute.';
  end if;

  if v_program.status <> 'active' then
    raise exception 'Selected program must be active.';
  end if;

  if not exists (
    select 1 from institutes
    where id = p_institute_id and status = 'active'
  ) then
    raise exception 'Selected institute must be active.';
  end if;

  select id, institute_id, student_category, status, current_team_id
    into v_makeup_student
  from students
  where id = p_makeup_artist_student_id;

  select id, institute_id, student_category, status, current_team_id
    into v_photo_student
  from students
  where id = p_photographer_student_id;

  select id, institute_id, student_category, status, current_team_id
    into v_hair_student
  from students
  where id = p_hairstylist_student_id;

  if v_makeup_student.id is null
     or v_photo_student.id is null
     or v_hair_student.id is null then
    raise exception 'One or more selected students were not found.';
  end if;

  if v_makeup_student.status <> 'active'
     or v_photo_student.status <> 'active'
     or v_hair_student.status <> 'active' then
    raise exception 'All selected students must be active.';
  end if;

  if v_makeup_student.student_category <> 'makeup_artist'
     or v_photo_student.student_category <> 'photographer'
     or v_hair_student.student_category <> 'hairstylist' then
    raise exception 'Students must match makeup_artist, photographer, and hairstylist categories.';
  end if;

  if v_makeup_student.institute_id <> p_institute_id
     or v_photo_student.institute_id <> p_institute_id
     or v_hair_student.institute_id <> p_institute_id then
    raise exception 'All selected students must belong to the selected institute.';
  end if;

  if v_makeup_student.current_team_id is not null
     or v_photo_student.current_team_id is not null
     or v_hair_student.current_team_id is not null then
    raise exception 'One or more selected students are already in an active team.';
  end if;

  if exists (
    select 1
    from team_members tm
    join teams t on t.id = tm.team_id
    where tm.student_id in (
      p_makeup_artist_student_id,
      p_photographer_student_id,
      p_hairstylist_student_id
    )
      and tm.member_status = 'active'
      and t.status = 'active'
  ) then
    raise exception 'One or more selected students are already in an active team.';
  end if;

  select id, institute_id, educator_type, status
    into v_makeup_educator
  from educators
  where id = p_makeup_educator_id;

  select id, institute_id, educator_type, status
    into v_photo_educator
  from educators
  where id = p_photography_educator_id;

  select id, institute_id, educator_type, status
    into v_hair_educator
  from educators
  where id = p_hairstyling_educator_id;

  if v_makeup_educator.id is null
     or v_photo_educator.id is null
     or v_hair_educator.id is null then
    raise exception 'One or more selected educators were not found.';
  end if;

  if v_makeup_educator.status <> 'active'
     or v_photo_educator.status <> 'active'
     or v_hair_educator.status <> 'active' then
    raise exception 'All selected educators must be active.';
  end if;

  if v_makeup_educator.educator_type <> 'makeup_educator'
     or v_photo_educator.educator_type <> 'photography_educator'
     or v_hair_educator.educator_type <> 'hairstyling_educator' then
    raise exception 'Educators must match makeup, photography, and hairstyling types.';
  end if;

  if v_makeup_educator.institute_id <> p_institute_id
     or v_photo_educator.institute_id <> p_institute_id
     or v_hair_educator.institute_id <> p_institute_id then
    raise exception 'All selected educators must belong to the selected institute.';
  end if;

  insert into teams (
    institute_id,
    program_id,
    team_name,
    current_stage_number,
    stage_status,
    status,
    created_by
  )
  values (
    p_institute_id,
    p_program_id,
    trim(p_team_name),
    1,
    'in_progress',
    'active',
    v_admin_id
  )
  returning id into v_team_id;

  insert into team_members (
    team_id,
    student_id,
    student_category,
    member_status,
    created_by
  )
  values
    (v_team_id, p_makeup_artist_student_id, 'makeup_artist', 'active', v_admin_id),
    (v_team_id, p_photographer_student_id, 'photographer', 'active', v_admin_id),
    (v_team_id, p_hairstylist_student_id, 'hairstylist', 'active', v_admin_id);

  insert into team_educators (
    team_id,
    educator_id,
    educator_type,
    status,
    created_by
  )
  values
    (v_team_id, p_makeup_educator_id, 'makeup_educator', 'active', v_admin_id),
    (v_team_id, p_photography_educator_id, 'photography_educator', 'active', v_admin_id),
    (v_team_id, p_hairstyling_educator_id, 'hairstyling_educator', 'active', v_admin_id);

  update students
  set
    current_team_id = v_team_id,
    current_stage_number = 1
  where id in (
    p_makeup_artist_student_id,
    p_photographer_student_id,
    p_hairstylist_student_id
  );

  for v_stage in
    select id, stage_number
    from stages
    where status = 'active'
    order by stage_number
  loop
    insert into team_stage_progress (
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
    values (
      v_team_id,
      v_stage.id,
      v_stage.stage_number,
      case
        when v_stage.stage_number = 0 then 'completed'::stage_status
        when v_stage.stage_number = 1 then 'in_progress'::stage_status
        else 'locked'::stage_status
      end,
      case
        when v_stage.stage_number in (0, 1) then v_now
        else null
      end,
      case
        when v_stage.stage_number = 0 then v_now
        else null
      end,
      case
        when v_stage.stage_number = 0 then 'approved'::approval_status
        else 'pending'::approval_status
      end,
      case
        when v_stage.stage_number = 0 then v_admin_id
        else null
      end,
      case
        when v_stage.stage_number = 0 then v_now
        else null
      end,
      v_admin_id
    );
  end loop;

  return v_team_id;
end;
$$;

comment on function create_balanced_team is
  'Atomically creates a balanced team with 3 students, 3 educators, Stage 1 progress, and student current_team_id updates. Admin only.';

revoke all on function create_balanced_team(
  text, uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid
) from public;

grant execute on function create_balanced_team(
  text, uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid
) to authenticated, service_role;
