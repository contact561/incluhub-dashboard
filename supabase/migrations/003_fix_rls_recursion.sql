-- =============================================================================
-- IncluHub Education Management Dashboard
-- Migration 003: Fix RLS infinite recursion (teams ↔ projects ↔ project_assignments)
--
-- Run AFTER 002_rls_policies.sql
--
-- Problem: policies on teams, projects, and project_assignments query each
-- other inline, causing "infinite recursion detected in policy" errors even
-- for admin reads that join teams or query project_assignments.
--
-- Fix: security definer helpers bypass RLS for cross-table membership checks.
-- =============================================================================

-- External member ↔ team/project (via assignments)
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

-- Project ↔ team (for assignment/approval policies)
create or replace function project_team_id(p_project_id uuid)
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select team_id
  from projects
  where id = p_project_id;
$$;

-- Educator ↔ team/project
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

-- Student ↔ team (educator viewing assigned students)
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
-- Replace recursive policies on teams
-- ---------------------------------------------------------------------------

drop policy if exists "teams_select_external_assigned" on teams;
create policy "teams_select_external_assigned"
  on teams for select
  using (is_external_assigned_to_team(id));

drop policy if exists "teams_select_educator_assigned" on teams;
create policy "teams_select_educator_assigned"
  on teams for select
  using (is_educator_assigned_to_team(id));


-- ---------------------------------------------------------------------------
-- Replace recursive policies on team_members
-- ---------------------------------------------------------------------------

drop policy if exists "team_members_select_external_assigned" on team_members;
create policy "team_members_select_external_assigned"
  on team_members for select
  using (is_external_assigned_to_team(team_id));

drop policy if exists "team_members_select_educator_assigned" on team_members;
create policy "team_members_select_educator_assigned"
  on team_members for select
  using (is_educator_assigned_to_team(team_id));


-- ---------------------------------------------------------------------------
-- Replace recursive policies on students (educator path)
-- ---------------------------------------------------------------------------

drop policy if exists "students_select_educator_assigned" on students;
create policy "students_select_educator_assigned"
  on students for select
  using (is_student_on_educator_team(id));


-- ---------------------------------------------------------------------------
-- Replace recursive policies on team_stage_progress
-- ---------------------------------------------------------------------------

drop policy if exists "team_stage_progress_select_educator_assigned" on team_stage_progress;
create policy "team_stage_progress_select_educator_assigned"
  on team_stage_progress for select
  using (is_educator_assigned_to_team(team_id));


-- ---------------------------------------------------------------------------
-- Replace recursive policies on projects
-- ---------------------------------------------------------------------------

drop policy if exists "projects_select_educator_assigned" on projects;
create policy "projects_select_educator_assigned"
  on projects for select
  using (is_educator_assigned_to_team(team_id));

drop policy if exists "projects_select_external_assigned" on projects;
create policy "projects_select_external_assigned"
  on projects for select
  using (is_external_assigned_to_project(id));


-- ---------------------------------------------------------------------------
-- Replace recursive policies on project_assignments
-- ---------------------------------------------------------------------------

drop policy if exists "project_assignments_select_student_own_team" on project_assignments;
create policy "project_assignments_select_student_own_team"
  on project_assignments for select
  using (project_team_id(project_id) = my_active_team_id());

drop policy if exists "project_assignments_select_educator_assigned" on project_assignments;
create policy "project_assignments_select_educator_assigned"
  on project_assignments for select
  using (is_educator_assigned_to_project(project_id));


-- ---------------------------------------------------------------------------
-- Replace recursive policies on project_approvals
-- ---------------------------------------------------------------------------

drop policy if exists "project_approvals_select_student_own_team" on project_approvals;
create policy "project_approvals_select_student_own_team"
  on project_approvals for select
  using (project_team_id(project_id) = my_active_team_id());

drop policy if exists "project_approvals_insert_educator_own" on project_approvals;
create policy "project_approvals_insert_educator_own"
  on project_approvals for insert
  with check (
    approver_role = 'educator'
    and approver_user_id = get_my_profile_id()
    and is_educator_assigned_to_project(project_id)
  );
