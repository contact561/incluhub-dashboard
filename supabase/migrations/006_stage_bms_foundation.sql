-- =============================================================================
-- IncluHub Education Management Dashboard
-- Migration 006: Stage BMS foundation (Package A)
--
-- - BMS fields on team_stage_progress
-- - portfolio_workflow_status enum + portfolio_outputs extensions
-- - portfolio_approvals role-slot uniqueness preparation
-- - Stage 3 master name update
-- - complete_bms_session RPC
-- =============================================================================

-- ---------------------------------------------------------------------------
-- A. BMS fields on team_stage_progress
-- ---------------------------------------------------------------------------

alter table team_stage_progress
  add column if not exists bms_session_date date,
  add column if not exists bms_remarks text;

comment on column team_stage_progress.bms_session_date is
  'BMS session date recorded when Stage 2 is completed (Stage 2 row only).';

comment on column team_stage_progress.bms_remarks is
  'Optional admin remarks for the BMS session (Stage 2 row only).';


-- ---------------------------------------------------------------------------
-- B. Portfolio workflow enum
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'portfolio_workflow_status'
  ) then
    create type portfolio_workflow_status as enum (
      'locked',
      'awaiting_booking',
      'awaiting_submission',
      'pending_educator',
      'pending_admin',
      'revision_required',
      'completed'
    );
  end if;
end $$;


-- ---------------------------------------------------------------------------
-- C. Extend portfolio_outputs
-- ---------------------------------------------------------------------------

alter table portfolio_outputs
  add column if not exists sequence_order smallint,
  add column if not exists workflow_status portfolio_workflow_status;

-- Allow null title/link until student submission
alter table portfolio_outputs
  alter column portfolio_title drop not null,
  alter column portfolio_link drop not null;

-- Fail loudly if existing rows would violate new constraints
do $$
declare
  v_count integer;
begin
  select count(*) into v_count from portfolio_outputs;

  if v_count > 0 then
    if exists (
      select 1
      from portfolio_outputs
      where sequence_order is null
         or workflow_status is null
    ) then
      raise exception
        'Migration 006: existing portfolio_outputs rows lack sequence_order/workflow_status. Backfill manually before applying constraints.';
    end if;

    if exists (
      select team_id, sequence_order
      from portfolio_outputs
      where sequence_order is not null
      group by team_id, sequence_order
      having count(*) > 1
    ) then
      raise exception
        'Migration 006: duplicate portfolio_outputs (team_id, sequence_order) found. Resolve before applying constraints.';
    end if;

    if exists (
      select team_id
      from portfolio_outputs
      where workflow_status not in ('locked', 'completed')
      group by team_id
      having count(*) > 1
    ) then
      raise exception
        'Migration 006: multiple active portfolio_outputs per team found. Resolve before applying partial unique index.';
    end if;
  end if;
end $$;

alter table portfolio_outputs
  add constraint portfolio_outputs_sequence_order_range
    check (sequence_order is null or sequence_order between 1 and 3);

-- Unique team + sequence (only when sequence_order is set)
create unique index if not exists uq_portfolio_team_sequence_order
  on portfolio_outputs (team_id, sequence_order)
  where sequence_order is not null;

-- One active (non-terminal) portfolio per team
create unique index if not exists uq_team_one_active_portfolio
  on portfolio_outputs (team_id)
  where workflow_status is not null
    and workflow_status not in ('locked', 'completed');

comment on column portfolio_outputs.sequence_order is
  'Fixed production order: 1=Photography, 2=Makeup, 3=Hairstyling.';

comment on column portfolio_outputs.workflow_status is
  'Sequential portfolio workflow state. Active portfolio is the row not in locked/completed.';


-- ---------------------------------------------------------------------------
-- D. Portfolio approval uniqueness preparation
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (
    select portfolio_output_id, approver_role
    from portfolio_approvals
    group by portfolio_output_id, approver_role
    having count(*) > 1
  ) then
    raise exception
      'Migration 006: duplicate portfolio_approvals (portfolio_output_id, approver_role) found. Resolve before applying uniqueness constraint.';
  end if;
end $$;

alter table portfolio_approvals
  drop constraint if exists portfolio_approvals_portfolio_output_id_approver_user_id_key;

drop index if exists portfolio_approvals_portfolio_output_id_approver_user_id_key;

create unique index if not exists uq_portfolio_approval_role_slot
  on portfolio_approvals (portfolio_output_id, approver_role);


-- ---------------------------------------------------------------------------
-- E. Update Stage 3 master display name
-- ---------------------------------------------------------------------------

update stages
set
  name = 'Sequential Portfolio Production',
  description = 'Teams produce three portfolio outputs in fixed sequence: Photography → Makeup → Hairstyling. Each student leads one portfolio and assists on two.'
where stage_number = 3;


-- ---------------------------------------------------------------------------
-- F. Grants for new enum
-- ---------------------------------------------------------------------------

grant usage on type portfolio_workflow_status to postgres, anon, authenticated, service_role;


-- ---------------------------------------------------------------------------
-- G. complete_bms_session RPC
-- ---------------------------------------------------------------------------

create or replace function complete_bms_session(
  p_team_id uuid,
  p_session_date date,
  p_remarks text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid;
  v_now timestamptz := now();
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
begin
  if not is_admin() then
    raise exception 'You do not have permission to complete this action.';
  end if;

  v_admin_id := get_my_profile_id();
  if v_admin_id is null then
    raise exception 'You do not have permission to complete this action.';
  end if;

  if p_session_date is null then
    raise exception 'BMS session date is required.';
  end if;

  select
    id,
    status,
    current_stage_number,
    stage_status
  into v_team
  from teams
  where id = p_team_id
  for update;

  if not found then
    raise exception 'Team was not found.';
  end if;

  if v_team.status <> 'active' then
    raise exception 'Team is not active.';
  end if;

  if v_team.current_stage_number <> 2 then
    raise exception 'Team is not currently in Stage 2.';
  end if;

  select id, status, stage_number
  into v_stage1
  from team_stage_progress
  where team_id = p_team_id
    and stage_number = 1
  for update;

  if not found or v_stage1.status <> 'completed' then
    raise exception 'Stage 1 is incomplete.';
  end if;

  select
    id,
    status,
    stage_number,
    completed_at
  into v_stage2
  from team_stage_progress
  where team_id = p_team_id
    and stage_number = 2
  for update;

  if not found then
    raise exception 'Stage 2 progress was not found.';
  end if;

  if v_stage2.status = 'completed' then
    raise exception 'BMS session was already completed.';
  end if;

  if v_stage2.status <> 'in_progress' then
    raise exception 'Team is not currently in Stage 2.';
  end if;

  select id, status, stage_number
  into v_stage3
  from team_stage_progress
  where team_id = p_team_id
    and stage_number = 3
  for update;

  if not found then
    raise exception 'Stage 3 progress was not found.';
  end if;

  if v_stage3.status <> 'locked' then
    raise exception 'Stage skipping is not allowed.';
  end if;

  if exists (
    select 1
    from portfolio_outputs
    where team_id = p_team_id
  ) then
    raise exception 'Portfolio initialization already exists.';
  end if;

  select count(*) into v_member_count
  from team_members
  where team_id = p_team_id
    and member_status = 'active';

  if v_member_count <> 3 then
    raise exception 'Team composition is invalid.';
  end if;

  select student_id into v_makeup_student_id
  from team_members
  where team_id = p_team_id
    and member_status = 'active'
    and student_category = 'makeup_artist';

  select student_id into v_photo_student_id
  from team_members
  where team_id = p_team_id
    and member_status = 'active'
    and student_category = 'photographer';

  select student_id into v_hair_student_id
  from team_members
  where team_id = p_team_id
    and member_status = 'active'
    and student_category = 'hairstylist';

  if v_makeup_student_id is null
     or v_photo_student_id is null
     or v_hair_student_id is null then
    raise exception 'Team composition is invalid.';
  end if;

  if not exists (
    select 1
    from team_educators te
    join educators e on e.id = te.educator_id
    join students s on s.id = te.student_id
    where te.team_id = p_team_id
      and te.status = 'active'
      and te.student_id = v_makeup_student_id
      and s.student_category = 'makeup_artist'
      and e.educator_type = 'makeup_educator'
      and e.status = 'active'
      and e.institute_id = s.institute_id
  )
  or not exists (
    select 1
    from team_educators te
    join educators e on e.id = te.educator_id
    join students s on s.id = te.student_id
    where te.team_id = p_team_id
      and te.status = 'active'
      and te.student_id = v_photo_student_id
      and s.student_category = 'photographer'
      and e.educator_type = 'photography_educator'
      and e.status = 'active'
      and e.institute_id = s.institute_id
  )
  or not exists (
    select 1
    from team_educators te
    join educators e on e.id = te.educator_id
    join students s on s.id = te.student_id
    where te.team_id = p_team_id
      and te.status = 'active'
      and te.student_id = v_hair_student_id
      and s.student_category = 'hairstylist'
      and e.educator_type = 'hairstyling_educator'
      and e.status = 'active'
      and e.institute_id = s.institute_id
  ) then
    raise exception 'Required educator mapping is missing.';
  end if;

  update team_stage_progress
  set
    status = 'completed',
    completed_at = v_now,
    bms_session_date = p_session_date,
    bms_remarks = nullif(trim(coalesce(p_remarks, '')), ''),
    admin_approval_status = 'approved',
    admin_approved_by = v_admin_id,
    admin_approved_at = v_now
  where team_id = p_team_id
    and stage_number = 2;

  update team_stage_progress
  set
    status = 'in_progress',
    started_at = coalesce(started_at, v_now)
  where team_id = p_team_id
    and stage_number = 3;

  update teams
  set
    current_stage_number = 3,
    stage_status = 'in_progress'
  where id = p_team_id;

  update students
  set current_stage_number = 3
  where id in (
    v_makeup_student_id,
    v_photo_student_id,
    v_hair_student_id
  );

  insert into portfolio_outputs (
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
  values (
    p_team_id,
    'photographer',
    v_photo_student_id,
    null,
    null,
    null,
    'pending',
    1,
    'awaiting_booking',
    v_admin_id
  )
  returning id into v_portfolio_photo_id;

  insert into portfolio_outputs (
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
  values (
    p_team_id,
    'makeup_artist',
    v_makeup_student_id,
    null,
    null,
    null,
    'pending',
    2,
    'locked',
    v_admin_id
  )
  returning id into v_portfolio_makeup_id;

  insert into portfolio_outputs (
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
  values (
    p_team_id,
    'hairstylist',
    v_hair_student_id,
    null,
    null,
    null,
    'pending',
    3,
    'locked',
    v_admin_id
  )
  returning id into v_portfolio_hair_id;

  insert into portfolio_participants (portfolio_output_id, student_id, participation_role)
  values
    (v_portfolio_photo_id, v_photo_student_id, 'leader'),
    (v_portfolio_photo_id, v_makeup_student_id, 'assistant'),
    (v_portfolio_photo_id, v_hair_student_id, 'assistant'),
    (v_portfolio_makeup_id, v_makeup_student_id, 'leader'),
    (v_portfolio_makeup_id, v_photo_student_id, 'assistant'),
    (v_portfolio_makeup_id, v_hair_student_id, 'assistant'),
    (v_portfolio_hair_id, v_hair_student_id, 'leader'),
    (v_portfolio_hair_id, v_photo_student_id, 'assistant'),
    (v_portfolio_hair_id, v_makeup_student_id, 'assistant');
end;
$$;

comment on function complete_bms_session is
  'Atomically completes Stage 2 BMS, unlocks Stage 3, and initializes sequential portfolio outputs. Admin only.';

revoke all on function complete_bms_session(uuid, date, text) from public;
revoke all on function complete_bms_session(uuid, date, text) from anon;
grant execute on function complete_bms_session(uuid, date, text) to authenticated;
