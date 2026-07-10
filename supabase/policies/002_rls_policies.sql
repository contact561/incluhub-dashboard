-- =============================================================================
-- IncluHub Education Management Dashboard
-- 002: Row Level Security Policies
--
-- Depends on: supabase/migrations/001_initial_schema.sql
--
-- Run this AFTER the initial schema migration.
-- Activity log writes use the service role client only (admin.ts).
-- =============================================================================


-- ---------------------------------------------------------------------------
-- Helper functions (security definer — bypass RLS to avoid recursion)
-- ---------------------------------------------------------------------------

create or replace function get_my_profile_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select auth.uid();
$$;

create or replace function get_my_role()
returns user_role
language sql
security definer
stable
set search_path = public
as $$
  select role
  from profiles
  where id = auth.uid()
    and status = 'active';
$$;

create or replace function is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from profiles
    where id = auth.uid()
      and role = 'admin'
      and status = 'active'
  );
$$;

create or replace function my_student_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select id
  from students
  where user_id = auth.uid()
    and status = 'active';
$$;

create or replace function my_educator_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select id
  from educators
  where user_id = auth.uid()
    and status = 'active';
$$;

create or replace function my_external_member_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select id
  from external_members
  where user_id = auth.uid()
    and status = 'active';
$$;

-- Returns the active team id for the current student (avoids RLS recursion).
create or replace function my_active_team_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select tm.team_id
  from team_members tm
  join students s on s.id = tm.student_id
  where s.user_id = auth.uid()
    and s.status = 'active'
    and tm.member_status = 'active'
  limit 1;
$$;

-- Cross-table helpers (security definer — avoid teams/projects/assignments recursion)
create or replace function is_external_assigned_to_team(p_team_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from projects p
    join project_assignments pa on pa.project_id = p.id
    join external_members em on em.id = pa.external_member_id
    where p.team_id = p_team_id
      and em.user_id = auth.uid()
      and em.status = 'active'
      and pa.status = 'active'
  );
$$;

create or replace function is_external_assigned_to_project(p_project_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from project_assignments pa
    join external_members em on em.id = pa.external_member_id
    where pa.project_id = p_project_id
      and em.user_id = auth.uid()
      and em.status = 'active'
      and pa.status = 'active'
  );
$$;

create or replace function project_team_id(p_project_id uuid)
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select team_id from projects where id = p_project_id;
$$;

create or replace function is_educator_assigned_to_team(p_team_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from team_educators te
    join educators e on e.id = te.educator_id
    where te.team_id = p_team_id
      and e.user_id = auth.uid()
      and e.status = 'active'
      and te.status = 'active'
  );
$$;

create or replace function is_educator_assigned_to_project(p_project_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from projects p
    join team_educators te on te.team_id = p.team_id
    join educators e on e.id = te.educator_id
    where p.id = p_project_id
      and e.user_id = auth.uid()
      and e.status = 'active'
      and te.status = 'active'
  );
$$;

create or replace function is_student_on_educator_team(p_student_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from team_members tm
    join team_educators te on te.team_id = tm.team_id
    join educators e on e.id = te.educator_id
    where tm.student_id = p_student_id
      and tm.member_status = 'active'
      and e.user_id = auth.uid()
      and e.status = 'active'
      and te.status = 'active'
  );
$$;


-- ---------------------------------------------------------------------------
-- Enable RLS on all tables
-- ---------------------------------------------------------------------------

alter table profiles               enable row level security;
alter table institutes              enable row level security;
alter table programs                enable row level security;
alter table students                enable row level security;
alter table educators               enable row level security;
alter table external_members        enable row level security;
alter table teams                   enable row level security;
alter table team_members            enable row level security;
alter table team_educators          enable row level security;
alter table stages                  enable row level security;
alter table team_stage_progress     enable row level security;
alter table portfolio_outputs       enable row level security;
alter table portfolio_participants  enable row level security;
alter table portfolio_approvals     enable row level security;
alter table projects                enable row level security;
alter table project_assignments     enable row level security;
alter table project_approvals       enable row level security;
alter table notifications           enable row level security;
alter table notification_recipients enable row level security;
alter table activity_logs           enable row level security;


-- ===========================================================================
-- 1. profiles
-- ===========================================================================

create policy "profiles_select_own"
  on profiles for select
  using (id = get_my_profile_id());

create policy "profiles_select_admin"
  on profiles for select
  using (is_admin());

create policy "profiles_insert_admin"
  on profiles for insert
  with check (is_admin());

create policy "profiles_update_admin"
  on profiles for update
  using (is_admin());

create policy "profiles_delete_admin"
  on profiles for delete
  using (is_admin());


-- ===========================================================================
-- 2. institutes
-- ===========================================================================

create policy "institutes_select_authenticated"
  on institutes for select
  using (auth.uid() is not null);

create policy "institutes_write_admin"
  on institutes for all
  using (is_admin())
  with check (is_admin());


-- ===========================================================================
-- 3. programs
-- ===========================================================================

create policy "programs_select_authenticated"
  on programs for select
  using (auth.uid() is not null);

create policy "programs_write_admin"
  on programs for all
  using (is_admin())
  with check (is_admin());


-- ===========================================================================
-- 4. students
-- ===========================================================================

create policy "students_select_own"
  on students for select
  using (user_id = get_my_profile_id());

create policy "students_select_educator_assigned"
  on students for select
  using (is_student_on_educator_team(id));

create policy "students_select_admin"
  on students for select
  using (is_admin());

create policy "students_write_admin"
  on students for all
  using (is_admin())
  with check (is_admin());


-- ===========================================================================
-- 5. educators
-- ===========================================================================

create policy "educators_select_own"
  on educators for select
  using (user_id = get_my_profile_id());

create policy "educators_select_admin"
  on educators for select
  using (is_admin());

create policy "educators_write_admin"
  on educators for all
  using (is_admin())
  with check (is_admin());


-- ===========================================================================
-- 6. external_members
-- ===========================================================================

create policy "external_members_select_own"
  on external_members for select
  using (user_id = get_my_profile_id());

create policy "external_members_select_admin"
  on external_members for select
  using (is_admin());

create policy "external_members_write_admin"
  on external_members for all
  using (is_admin())
  with check (is_admin());


-- ===========================================================================
-- 7. teams
-- ===========================================================================

create policy "teams_select_admin"
  on teams for select
  using (is_admin());

create policy "teams_select_student_own"
  on teams for select
  using (id = my_active_team_id());

create policy "teams_select_educator_assigned"
  on teams for select
  using (is_educator_assigned_to_team(id));

create policy "teams_select_external_assigned"
  on teams for select
  using (is_external_assigned_to_team(id));

create policy "teams_write_admin"
  on teams for all
  using (is_admin())
  with check (is_admin());


-- ===========================================================================
-- 8. team_members
-- ===========================================================================

create policy "team_members_select_admin"
  on team_members for select
  using (is_admin());

create policy "team_members_select_student_own_team"
  on team_members for select
  using (team_id = my_active_team_id());

create policy "team_members_select_educator_assigned"
  on team_members for select
  using (is_educator_assigned_to_team(team_id));

create policy "team_members_select_external_assigned"
  on team_members for select
  using (is_external_assigned_to_team(team_id));

create policy "team_members_write_admin"
  on team_members for all
  using (is_admin())
  with check (is_admin());


-- ===========================================================================
-- 9. team_educators
-- ===========================================================================

create policy "team_educators_select_admin"
  on team_educators for select
  using (is_admin());

create policy "team_educators_select_educator_own"
  on team_educators for select
  using (educator_id = my_educator_id());

create policy "team_educators_select_student_own_team"
  on team_educators for select
  using (team_id = my_active_team_id());

create policy "team_educators_write_admin"
  on team_educators for all
  using (is_admin())
  with check (is_admin());


-- ===========================================================================
-- 10. stages (reference data)
-- ===========================================================================

create policy "stages_select_authenticated"
  on stages for select
  using (auth.uid() is not null);

create policy "stages_write_admin"
  on stages for all
  using (is_admin())
  with check (is_admin());


-- ===========================================================================
-- 11. team_stage_progress
-- ===========================================================================

create policy "team_stage_progress_select_admin"
  on team_stage_progress for select
  using (is_admin());

create policy "team_stage_progress_select_student_own_team"
  on team_stage_progress for select
  using (team_id = my_active_team_id());

create policy "team_stage_progress_select_educator_assigned"
  on team_stage_progress for select
  using (is_educator_assigned_to_team(team_id));

create policy "team_stage_progress_write_admin"
  on team_stage_progress for all
  using (is_admin())
  with check (is_admin());


-- ===========================================================================
-- 12. portfolio_outputs
-- ===========================================================================

create policy "portfolio_outputs_select_admin"
  on portfolio_outputs for select
  using (is_admin());

create policy "portfolio_outputs_select_student_own_team"
  on portfolio_outputs for select
  using (team_id = my_active_team_id());

create policy "portfolio_outputs_select_educator_relevant"
  on portfolio_outputs for select
  using (
    exists (
      select 1
      from team_educators te
      join educators e on e.id = te.educator_id
      where te.team_id = portfolio_outputs.team_id
        and te.educator_id = my_educator_id()
        and te.status = 'active'
        and (
          (e.educator_type = 'makeup_educator' and portfolio_outputs.portfolio_type = 'makeup_artist')
          or (e.educator_type = 'photography_educator' and portfolio_outputs.portfolio_type = 'photographer')
          or (e.educator_type = 'hairstyling_educator' and portfolio_outputs.portfolio_type = 'hairstylist')
        )
    )
  );

create policy "portfolio_outputs_insert_student_leader"
  on portfolio_outputs for insert
  with check (
    leader_student_id = my_student_id()
    and team_id = my_active_team_id()
    and exists (
      select 1
      from teams t
      where t.id = portfolio_outputs.team_id
        and t.current_stage_number = 3
    )
  );

create policy "portfolio_outputs_update_student_pending"
  on portfolio_outputs for update
  using (
    leader_student_id = my_student_id()
    and status = 'pending'
  );

create policy "portfolio_outputs_write_admin"
  on portfolio_outputs for all
  using (is_admin())
  with check (is_admin());


-- ===========================================================================
-- 13. portfolio_participants
-- ===========================================================================

create policy "portfolio_participants_select_admin"
  on portfolio_participants for select
  using (is_admin());

create policy "portfolio_participants_select_student_own_team"
  on portfolio_participants for select
  using (
    exists (
      select 1
      from portfolio_outputs po
      where po.id = portfolio_participants.portfolio_output_id
        and po.team_id = my_active_team_id()
    )
  );

create policy "portfolio_participants_select_educator_relevant"
  on portfolio_participants for select
  using (
    exists (
      select 1
      from portfolio_outputs po
      join team_educators te on te.team_id = po.team_id
      join educators e on e.id = te.educator_id
      where po.id = portfolio_participants.portfolio_output_id
        and te.educator_id = my_educator_id()
        and te.status = 'active'
        and (
          (e.educator_type = 'makeup_educator' and po.portfolio_type = 'makeup_artist')
          or (e.educator_type = 'photography_educator' and po.portfolio_type = 'photographer')
          or (e.educator_type = 'hairstyling_educator' and po.portfolio_type = 'hairstylist')
        )
    )
  );

create policy "portfolio_participants_write_admin"
  on portfolio_participants for all
  using (is_admin())
  with check (is_admin());


-- ===========================================================================
-- 14. portfolio_approvals
-- ===========================================================================

create policy "portfolio_approvals_select_admin"
  on portfolio_approvals for select
  using (is_admin());

create policy "portfolio_approvals_select_educator_own"
  on portfolio_approvals for select
  using (approver_user_id = get_my_profile_id());

create policy "portfolio_approvals_select_student_own_team"
  on portfolio_approvals for select
  using (
    exists (
      select 1
      from portfolio_outputs po
      where po.id = portfolio_approvals.portfolio_output_id
        and po.team_id = my_active_team_id()
    )
  );

create policy "portfolio_approvals_insert_educator_own"
  on portfolio_approvals for insert
  with check (
    approver_role = 'educator'
    and approver_user_id = get_my_profile_id()
    and exists (
      select 1
      from portfolio_outputs po
      join team_educators te on te.team_id = po.team_id
      join educators e on e.id = te.educator_id
      where po.id = portfolio_approvals.portfolio_output_id
        and e.user_id = get_my_profile_id()
        and te.status = 'active'
        and (
          (e.educator_type = 'makeup_educator' and po.portfolio_type = 'makeup_artist')
          or (e.educator_type = 'photography_educator' and po.portfolio_type = 'photographer')
          or (e.educator_type = 'hairstyling_educator' and po.portfolio_type = 'hairstylist')
        )
    )
  );

create policy "portfolio_approvals_update_educator_own"
  on portfolio_approvals for update
  using (
    approver_role = 'educator'
    and approver_user_id = get_my_profile_id()
  );

create policy "portfolio_approvals_write_admin"
  on portfolio_approvals for all
  using (is_admin())
  with check (is_admin());


-- ===========================================================================
-- 15. projects
-- ===========================================================================

create policy "projects_select_admin"
  on projects for select
  using (is_admin());

create policy "projects_select_student_own_team"
  on projects for select
  using (team_id = my_active_team_id());

create policy "projects_select_educator_assigned"
  on projects for select
  using (is_educator_assigned_to_team(team_id));

create policy "projects_select_external_assigned"
  on projects for select
  using (is_external_assigned_to_project(id));

create policy "projects_write_admin"
  on projects for all
  using (is_admin())
  with check (is_admin());


-- ===========================================================================
-- 16. project_assignments
-- ===========================================================================

create policy "project_assignments_select_admin"
  on project_assignments for select
  using (is_admin());

create policy "project_assignments_select_external_own"
  on project_assignments for select
  using (external_member_id = my_external_member_id());

create policy "project_assignments_select_student_own_team"
  on project_assignments for select
  using (project_team_id(project_id) = my_active_team_id());

create policy "project_assignments_select_educator_assigned"
  on project_assignments for select
  using (is_educator_assigned_to_project(project_id));

create policy "project_assignments_write_admin"
  on project_assignments for all
  using (is_admin())
  with check (is_admin());


-- ===========================================================================
-- 17. project_approvals
-- ===========================================================================

create policy "project_approvals_select_admin"
  on project_approvals for select
  using (is_admin());

create policy "project_approvals_select_educator_own"
  on project_approvals for select
  using (approver_user_id = get_my_profile_id());

create policy "project_approvals_select_student_own_team"
  on project_approvals for select
  using (project_team_id(project_id) = my_active_team_id());

create policy "project_approvals_insert_educator_own"
  on project_approvals for insert
  with check (
    approver_role = 'educator'
    and approver_user_id = get_my_profile_id()
    and is_educator_assigned_to_project(project_id)
  );

create policy "project_approvals_update_educator_own"
  on project_approvals for update
  using (
    approver_role = 'educator'
    and approver_user_id = get_my_profile_id()
  );

create policy "project_approvals_write_admin"
  on project_approvals for all
  using (is_admin())
  with check (is_admin());


-- ===========================================================================
-- 18. notifications
-- ===========================================================================

create policy "notifications_select_admin"
  on notifications for select
  using (is_admin());

create policy "notifications_select_recipient"
  on notifications for select
  using (
    exists (
      select 1
      from notification_recipients nr
      where nr.notification_id = notifications.id
        and nr.recipient_user_id = get_my_profile_id()
    )
  );

create policy "notifications_write_admin"
  on notifications for all
  using (is_admin())
  with check (is_admin());


-- ===========================================================================
-- 19. notification_recipients
-- ===========================================================================

create policy "notification_recipients_select_admin"
  on notification_recipients for select
  using (is_admin());

create policy "notification_recipients_select_own"
  on notification_recipients for select
  using (recipient_user_id = get_my_profile_id());

create policy "notification_recipients_update_own_read"
  on notification_recipients for update
  using (recipient_user_id = get_my_profile_id())
  with check (recipient_user_id = get_my_profile_id());

create policy "notification_recipients_write_admin"
  on notification_recipients for insert
  with check (is_admin());

create policy "notification_recipients_delete_admin"
  on notification_recipients for delete
  using (is_admin());


-- ===========================================================================
-- 20. activity_logs (admin read-only; writes via service role only)
-- ===========================================================================

create policy "activity_logs_select_admin"
  on activity_logs for select
  using (is_admin());

-- No insert/update/delete policies for authenticated users.
-- Logs are written via SUPABASE_SERVICE_ROLE_KEY in admin.ts only.
