-- =============================================================================
-- IncluHub Education Management Dashboard
-- Migration 005: Cross-institute program teams
--
-- - Programs can include multiple institutes (program_institutes)
-- - Students enroll into a Program / Batch (program_enrollments)
-- - Teams are program-scoped (not single-institute)
-- - team_educators maps each student to their own institute educator
-- - Replaces create_balanced_team RPC (Stage 0+1 completed, Stage 2 current)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. New tables
-- ---------------------------------------------------------------------------

create table if not exists program_institutes (
  id           uuid        primary key default uuid_generate_v4(),
  program_id   uuid        not null references programs(id) on delete cascade,
  institute_id uuid        not null references institutes(id) on delete restrict,
  status       text        not null default 'active'
                 check (status in ('active', 'inactive')),
  created_by   uuid        references profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (program_id, institute_id)
);

create trigger trg_program_institutes_updated_at
  before update on program_institutes
  for each row execute function set_updated_at();

create table if not exists program_enrollments (
  id           uuid        primary key default uuid_generate_v4(),
  program_id   uuid        not null references programs(id) on delete cascade,
  student_id   uuid        not null references students(id) on delete cascade,
  status       text        not null default 'active'
                 check (status in ('active', 'inactive', 'completed', 'removed')),
  enrolled_at  timestamptz not null default now(),
  created_by   uuid        references profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (program_id, student_id)
);

create trigger trg_program_enrollments_updated_at
  before update on program_enrollments
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. Soften legacy single-institute columns (preserve data)
-- ---------------------------------------------------------------------------

alter table programs
  alter column institute_id drop not null;

alter table teams
  alter column institute_id drop not null;

-- ---------------------------------------------------------------------------
-- 3. Backfill program_institutes from programs.institute_id
-- ---------------------------------------------------------------------------

insert into program_institutes (program_id, institute_id, status, created_by)
select p.id, p.institute_id, 'active', p.created_by
from programs p
where p.institute_id is not null
on conflict (program_id, institute_id) do nothing;

-- ---------------------------------------------------------------------------
-- 4. team_educators: add student_id + uniqueness
-- ---------------------------------------------------------------------------

alter table team_educators
  add column if not exists student_id uuid references students(id) on delete cascade;

-- Backfill student_id by matching educator_type to team member category
update team_educators te
set student_id = tm.student_id
from team_members tm
where te.team_id = tm.team_id
  and tm.member_status = 'active'
  and te.student_id is null
  and (
    (te.educator_type = 'makeup_educator' and tm.student_category = 'makeup_artist')
    or (te.educator_type = 'photography_educator' and tm.student_category = 'photographer')
    or (te.educator_type = 'hairstyling_educator' and tm.student_category = 'hairstylist')
  );

-- Fail loudly if any active mapping still lacks student_id
do $$
begin
  if exists (
    select 1 from team_educators
    where student_id is null and status = 'active'
  ) then
    raise exception
      'Migration 005: cannot set team_educators.student_id NOT NULL — some active rows could not be backfilled.';
  end if;
end $$;

alter table team_educators
  alter column student_id set not null;

drop index if exists uq_team_active_educator_type;

create unique index if not exists uq_team_active_student_educator
  on team_educators (team_id, student_id)
  where status = 'active';

-- Preserve existing team_members uniqueness (one category per team, one team per student)
-- uq_team_active_category and uq_student_active_team already exist from 001.

-- ---------------------------------------------------------------------------
-- 5. Backfill program_enrollments from existing team members
-- ---------------------------------------------------------------------------

insert into program_enrollments (program_id, student_id, status, enrolled_at, created_by)
select
  t.program_id,
  tm.student_id,
  'active',
  coalesce(tm.joined_at, tm.created_at, now()),
  coalesce(tm.created_by, t.created_by)
from team_members tm
join teams t on t.id = tm.team_id
where tm.member_status = 'active'
on conflict (program_id, student_id) do nothing;

-- ---------------------------------------------------------------------------
-- 6. Grants for new tables
-- ---------------------------------------------------------------------------

grant all privileges on table program_institutes to postgres, service_role;
grant select, insert, update, delete on table program_institutes to authenticated;
grant select on table program_institutes to anon;

grant all privileges on table program_enrollments to postgres, service_role;
grant select, insert, update, delete on table program_enrollments to authenticated;
grant select on table program_enrollments to anon;

-- ---------------------------------------------------------------------------
-- 7. RLS for new tables
-- ---------------------------------------------------------------------------

alter table program_institutes enable row level security;
alter table program_enrollments enable row level security;

create or replace function is_student_enrolled_in_program(p_program_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from program_enrollments pe
    join students s on s.id = pe.student_id
    where pe.program_id = p_program_id
      and pe.status = 'active'
      and s.user_id = auth.uid()
  );
$$;

create or replace function is_educator_on_program_team(p_program_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from teams t
    join team_educators te on te.team_id = t.id
    join educators e on e.id = te.educator_id
    where t.program_id = p_program_id
      and te.status = 'active'
      and e.user_id = auth.uid()
      and e.status = 'active'
  );
$$;

drop policy if exists "program_institutes_select_admin" on program_institutes;
drop policy if exists "program_institutes_select_authenticated" on program_institutes;
drop policy if exists "program_institutes_write_admin" on program_institutes;

create policy "program_institutes_select_admin"
  on program_institutes for select
  using (is_admin());

create policy "program_institutes_select_authenticated"
  on program_institutes for select
  using (auth.uid() is not null);

create policy "program_institutes_write_admin"
  on program_institutes for all
  using (is_admin())
  with check (is_admin());

drop policy if exists "program_enrollments_select_admin" on program_enrollments;
drop policy if exists "program_enrollments_select_own_student" on program_enrollments;
drop policy if exists "program_enrollments_select_educator" on program_enrollments;
drop policy if exists "program_enrollments_write_admin" on program_enrollments;

create policy "program_enrollments_select_admin"
  on program_enrollments for select
  using (is_admin());

create policy "program_enrollments_select_own_student"
  on program_enrollments for select
  using (
    student_id = my_student_id()
  );

create policy "program_enrollments_select_educator"
  on program_enrollments for select
  using (is_educator_on_program_team(program_id));

create policy "program_enrollments_write_admin"
  on program_enrollments for all
  using (is_admin())
  with check (is_admin());

-- ---------------------------------------------------------------------------
-- 8. Atomic create_program_with_institutes RPC
-- ---------------------------------------------------------------------------

create or replace function create_program_with_institutes(
  p_name text,
  p_description text,
  p_start_date date,
  p_end_date date,
  p_status text,
  p_institute_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid;
  v_program_id uuid;
  v_institute_id uuid;
  v_count integer;
begin
  if not is_admin() then
    raise exception 'Only admins can create programs.';
  end if;

  v_admin_id := get_my_profile_id();
  if v_admin_id is null then
    raise exception 'Admin profile not found.';
  end if;

  if nullif(trim(p_name), '') is null then
    raise exception 'Program name is required.';
  end if;

  if p_status is null or p_status not in ('active', 'completed', 'paused') then
    raise exception 'Invalid program status.';
  end if;

  if p_institute_ids is null or coalesce(array_length(p_institute_ids, 1), 0) < 1 then
    raise exception 'At least one participating institute is required.';
  end if;

  select count(distinct x) into v_count
  from unnest(p_institute_ids) as x;

  if v_count <> array_length(p_institute_ids, 1) then
    raise exception 'Duplicate institutes are not allowed.';
  end if;

  if exists (
    select 1
    from unnest(p_institute_ids) as iid
    where not exists (
      select 1 from institutes i
      where i.id = iid and i.status = 'active'
    )
  ) then
    raise exception 'All selected institutes must exist and be active.';
  end if;

  if p_start_date is not null
     and p_end_date is not null
     and p_end_date < p_start_date then
    raise exception 'End date cannot be earlier than start date.';
  end if;

  insert into programs (
    institute_id,
    name,
    description,
    start_date,
    end_date,
    status,
    created_by
  )
  values (
    p_institute_ids[1],
    trim(p_name),
    nullif(trim(coalesce(p_description, '')), ''),
    p_start_date,
    p_end_date,
    p_status,
    v_admin_id
  )
  returning id into v_program_id;

  foreach v_institute_id in array p_institute_ids
  loop
    insert into program_institutes (program_id, institute_id, status, created_by)
    values (v_program_id, v_institute_id, 'active', v_admin_id);
  end loop;

  return v_program_id;
end;
$$;

comment on function create_program_with_institutes is
  'Atomically creates a program and its participating institutes. Admin only.';

revoke all on function create_program_with_institutes(
  text, text, date, date, text, uuid[]
) from public;

revoke all on function create_program_with_institutes(
  text, text, date, date, text, uuid[]
) from anon;

grant execute on function create_program_with_institutes(
  text, text, date, date, text, uuid[]
) to authenticated;

-- ---------------------------------------------------------------------------
-- 9. Replace create_balanced_team RPC (program-scoped, cross-institute)
-- ---------------------------------------------------------------------------

drop function if exists create_balanced_team(
  text, uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid
);

create or replace function create_balanced_team(
  p_team_name text,
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

  select id, status
    into v_program
  from programs
  where id = p_program_id
  for update;

  if not found then
    raise exception 'Selected program was not found.';
  end if;

  if v_program.status <> 'active' then
    raise exception 'Selected program must be active.';
  end if;

  -- Lock student rows to prevent concurrent team assignment
  select id, institute_id, student_category, status, current_team_id
    into v_makeup_student
  from students
  where id = p_makeup_artist_student_id
  for update;

  select id, institute_id, student_category, status, current_team_id
    into v_photo_student
  from students
  where id = p_photographer_student_id
  for update;

  select id, institute_id, student_category, status, current_team_id
    into v_hair_student
  from students
  where id = p_hairstylist_student_id
  for update;

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

  -- Active enrollments required
  if not exists (
    select 1 from program_enrollments
    where program_id = p_program_id
      and student_id = p_makeup_artist_student_id
      and status = 'active'
  )
  or not exists (
    select 1 from program_enrollments
    where program_id = p_program_id
      and student_id = p_photographer_student_id
      and status = 'active'
  )
  or not exists (
    select 1 from program_enrollments
    where program_id = p_program_id
      and student_id = p_hairstylist_student_id
      and status = 'active'
  ) then
    raise exception 'All selected students must be actively enrolled in the program.';
  end if;

  -- Each student's institute must participate in the program
  if not exists (
    select 1 from program_institutes
    where program_id = p_program_id
      and institute_id = v_makeup_student.institute_id
      and status = 'active'
  )
  or not exists (
    select 1 from program_institutes
    where program_id = p_program_id
      and institute_id = v_photo_student.institute_id
      and status = 'active'
  )
  or not exists (
    select 1 from program_institutes
    where program_id = p_program_id
      and institute_id = v_hair_student.institute_id
      and status = 'active'
  ) then
    raise exception 'Each student institute must be an active participant in the program.';
  end if;

  select id, institute_id, educator_type, status
    into v_makeup_educator
  from educators
  where id = p_makeup_educator_id
  for update;

  select id, institute_id, educator_type, status
    into v_photo_educator
  from educators
  where id = p_photography_educator_id
  for update;

  select id, institute_id, educator_type, status
    into v_hair_educator
  from educators
  where id = p_hairstyling_educator_id
  for update;

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

  -- Educator must match the corresponding student's institute
  if v_makeup_educator.institute_id <> v_makeup_student.institute_id then
    raise exception 'Makeup educator must belong to the makeup student institute.';
  end if;

  if v_photo_educator.institute_id <> v_photo_student.institute_id then
    raise exception 'Photography educator must belong to the photographer student institute.';
  end if;

  if v_hair_educator.institute_id <> v_hair_student.institute_id then
    raise exception 'Hairstyling educator must belong to the hairstylist student institute.';
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
    null,
    p_program_id,
    trim(p_team_name),
    2,
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
    student_id,
    educator_id,
    educator_type,
    status,
    created_by
  )
  values
    (v_team_id, p_makeup_artist_student_id, p_makeup_educator_id, 'makeup_educator', 'active', v_admin_id),
    (v_team_id, p_photographer_student_id, p_photography_educator_id, 'photography_educator', 'active', v_admin_id),
    (v_team_id, p_hairstylist_student_id, p_hairstyling_educator_id, 'hairstyling_educator', 'active', v_admin_id);

  update students
  set
    current_team_id = v_team_id,
    current_stage_number = 2
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
        when v_stage.stage_number in (0, 1) then 'completed'::stage_status
        when v_stage.stage_number = 2 then 'in_progress'::stage_status
        else 'locked'::stage_status
      end,
      case
        when v_stage.stage_number in (0, 1, 2) then v_now
        else null
      end,
      case
        when v_stage.stage_number in (0, 1) then v_now
        else null
      end,
      case
        when v_stage.stage_number in (0, 1) then 'approved'::approval_status
        else 'pending'::approval_status
      end,
      case
        when v_stage.stage_number in (0, 1) then v_admin_id
        else null
      end,
      case
        when v_stage.stage_number in (0, 1) then v_now
        else null
      end,
      v_admin_id
    );
  end loop;

  return v_team_id;
end;
$$;

comment on function create_balanced_team is
  'Atomically creates a program-scoped balanced team with per-student educators. Stage 0+1 completed, Stage 2 in progress. Admin only.';

revoke all on function create_balanced_team(
  text, uuid, uuid, uuid, uuid, uuid, uuid, uuid
) from public;

revoke all on function create_balanced_team(
  text, uuid, uuid, uuid, uuid, uuid, uuid, uuid
) from anon;

grant execute on function create_balanced_team(
  text, uuid, uuid, uuid, uuid, uuid, uuid, uuid
) to authenticated;
