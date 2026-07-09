-- =============================================================================
-- IncluHub Education Management Dashboard
-- Migration 001: Initial Schema
--
-- Run order matches docs/Database_Plan.md § 15 (MVP Database Build Order)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------

create extension if not exists "uuid-ossp";


-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type user_role as enum (
  'admin',
  'student',
  'educator',
  'external_member'
);

create type student_category as enum (
  'makeup_artist',
  'photographer',
  'hairstylist'
);

create type educator_type as enum (
  'makeup_educator',
  'photography_educator',
  'hairstyling_educator'
);

create type external_member_type as enum (
  'model',
  'creative_director',
  'photographer',
  'brand_mentor',
  'shoot_mentor',
  'other'
);

create type stage_status as enum (
  'locked',
  'not_started',
  'in_progress',
  'pending_approval',
  'completed',
  'rejected',
  'revision_required'
);

create type approval_status as enum (
  'pending',
  'approved',
  'rejected',
  'revision_required'
);

create type payment_status as enum (
  'pending',
  'confirmed',
  'waived',
  'not_required'
);


-- ---------------------------------------------------------------------------
-- Helper: auto-update updated_at column
-- ---------------------------------------------------------------------------

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ---------------------------------------------------------------------------
-- 1. profiles
--    id mirrors auth.users.id — created by Supabase Auth trigger or admin.
-- ---------------------------------------------------------------------------

create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text        not null,
  email       text        not null unique,
  phone       text,
  role        user_role   not null,
  status      text        not null default 'active'
                check (status in ('active', 'inactive', 'suspended')),
  created_by  uuid        references profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

comment on table profiles is
  'One row per Supabase Auth user. Role comes only from this table — never trust the frontend.';


-- ---------------------------------------------------------------------------
-- 2. institutes
-- ---------------------------------------------------------------------------

create table institutes (
  id                     uuid        primary key default uuid_generate_v4(),
  name                   text        not null,
  address                text,
  phone                  text,
  email                  text,
  website_or_social      text,
  authorized_person_name text,
  status                 text        not null default 'active'
                           check (status in ('active', 'inactive')),
  created_by             uuid        references profiles(id) on delete set null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create trigger trg_institutes_updated_at
  before update on institutes
  for each row execute function set_updated_at();


-- ---------------------------------------------------------------------------
-- 3. programs
-- ---------------------------------------------------------------------------

create table programs (
  id           uuid        primary key default uuid_generate_v4(),
  institute_id uuid        not null references institutes(id) on delete cascade,
  name         text        not null,
  description  text,
  start_date   date,
  end_date     date,
  status       text        not null default 'active'
                 check (status in ('active', 'completed', 'paused')),
  created_by   uuid        references profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger trg_programs_updated_at
  before update on programs
  for each row execute function set_updated_at();


-- ---------------------------------------------------------------------------
-- 4. students
-- ---------------------------------------------------------------------------

create table students (
  id                   uuid             primary key default uuid_generate_v4(),
  user_id              uuid             not null unique references profiles(id) on delete cascade,
  institute_id         uuid             not null references institutes(id) on delete restrict,
  student_category     student_category not null,
  payment_status       payment_status   not null default 'pending',
  joining_date         date,
  course_start_date    date,
  course_end_date      date,
  current_team_id      uuid,            -- fk added after teams table is created
  current_stage_number integer          not null default 0
                         check (current_stage_number between 0 and 5),
  status               text             not null default 'active'
                         check (status in ('active', 'inactive', 'suspended', 'completed')),
  created_by           uuid             references profiles(id) on delete set null,
  created_at           timestamptz      not null default now(),
  updated_at           timestamptz      not null default now()
);

create trigger trg_students_updated_at
  before update on students
  for each row execute function set_updated_at();

comment on column students.payment_status is
  'Manual admin-only field. No payment gateway in MVP.';


-- ---------------------------------------------------------------------------
-- 5. educators
-- ---------------------------------------------------------------------------

create table educators (
  id            uuid          primary key default uuid_generate_v4(),
  user_id       uuid          not null unique references profiles(id) on delete cascade,
  institute_id  uuid          not null references institutes(id) on delete restrict,
  educator_type educator_type not null,
  status        text          not null default 'active'
                  check (status in ('active', 'inactive')),
  created_by    uuid          references profiles(id) on delete set null,
  created_at    timestamptz   not null default now(),
  updated_at    timestamptz   not null default now()
);

create trigger trg_educators_updated_at
  before update on educators
  for each row execute function set_updated_at();


-- ---------------------------------------------------------------------------
-- 6. external_members
-- ---------------------------------------------------------------------------

create table external_members (
  id                   uuid                 primary key default uuid_generate_v4(),
  user_id              uuid                 not null unique references profiles(id) on delete cascade,
  external_member_type external_member_type not null,
  bio                  text,
  status               text                 not null default 'active'
                         check (status in ('active', 'inactive')),
  created_by           uuid                 references profiles(id) on delete set null,
  created_at           timestamptz          not null default now(),
  updated_at           timestamptz          not null default now()
);

create trigger trg_external_members_updated_at
  before update on external_members
  for each row execute function set_updated_at();


-- ---------------------------------------------------------------------------
-- 7. teams
-- ---------------------------------------------------------------------------

create table teams (
  id                   uuid         primary key default uuid_generate_v4(),
  institute_id         uuid         not null references institutes(id) on delete restrict,
  program_id           uuid         not null references programs(id) on delete restrict,
  team_name            text         not null,
  current_stage_number integer      not null default 0
                         check (current_stage_number between 0 and 5),
  stage_status         stage_status not null default 'not_started',
  status               text         not null default 'active'
                         check (status in ('active', 'completed', 'paused')),
  created_by           uuid         references profiles(id) on delete set null,
  created_at           timestamptz  not null default now(),
  updated_at           timestamptz  not null default now()
);

create trigger trg_teams_updated_at
  before update on teams
  for each row execute function set_updated_at();

-- Now that teams exists, add the deferred fk on students
alter table students
  add constraint fk_students_current_team
  foreign key (current_team_id) references teams(id) on delete set null;


-- ---------------------------------------------------------------------------
-- 8. team_members
--    Constraint: one active student per category per team.
-- ---------------------------------------------------------------------------

create table team_members (
  id               uuid             primary key default uuid_generate_v4(),
  team_id          uuid             not null references teams(id) on delete cascade,
  student_id       uuid             not null references students(id) on delete cascade,
  student_category student_category not null,
  member_status    text             not null default 'active'
                     check (member_status in ('active', 'removed')),
  joined_at        timestamptz      not null default now(),
  created_by       uuid             references profiles(id) on delete set null,
  created_at       timestamptz      not null default now(),
  updated_at       timestamptz      not null default now()
);

create trigger trg_team_members_updated_at
  before update on team_members
  for each row execute function set_updated_at();

-- One active student of each category per team
create unique index uq_team_active_category
  on team_members (team_id, student_category)
  where member_status = 'active';

-- One active team per student
create unique index uq_student_active_team
  on team_members (student_id)
  where member_status = 'active';


-- ---------------------------------------------------------------------------
-- 9. team_educators
--    One active educator of each type per team.
-- ---------------------------------------------------------------------------

create table team_educators (
  id            uuid          primary key default uuid_generate_v4(),
  team_id       uuid          not null references teams(id) on delete cascade,
  educator_id   uuid          not null references educators(id) on delete cascade,
  educator_type educator_type not null,
  status        text          not null default 'active'
                  check (status in ('active', 'inactive')),
  created_by    uuid          references profiles(id) on delete set null,
  created_at    timestamptz   not null default now(),
  updated_at    timestamptz   not null default now()
);

create trigger trg_team_educators_updated_at
  before update on team_educators
  for each row execute function set_updated_at();

create unique index uq_team_active_educator_type
  on team_educators (team_id, educator_type)
  where status = 'active';


-- ---------------------------------------------------------------------------
-- 10. stages  (master / seed data)
-- ---------------------------------------------------------------------------

create table stages (
  id                          uuid        primary key default uuid_generate_v4(),
  stage_number                integer     not null unique
                                check (stage_number between 0 and 5),
  name                        text        not null,
  description                 text,
  requires_admin_approval     boolean     not null default true,
  requires_educator_approval  boolean     not null default false,
  status                      text        not null default 'active'
                                check (status in ('active', 'inactive'))
);

-- Seed the 6 MVP stages
insert into stages (stage_number, name, description, requires_admin_approval, requires_educator_approval) values
  (0, 'Onboarding',                     'Student account is created and activated.',                     true,  false),
  (1, 'Team Assignment',                'Student is assigned to a creative team.',                       true,  false),
  (2, 'BMS Session',                    'Student/team attends BMS session.',                             true,  false),
  (3, 'Portfolio Submission',           'Student submits portfolio work for educator and admin review.',  true,  true),
  (4, 'Brand / Creative Project',       'Team works with external member on a creative project.',        true,  true),
  (5, 'Ecosystem / Application Unlock', 'Final opportunity section unlocks after all approvals.',        false, false);


-- ---------------------------------------------------------------------------
-- 11. team_stage_progress
-- ---------------------------------------------------------------------------

create table team_stage_progress (
  id                    uuid            primary key default uuid_generate_v4(),
  team_id               uuid            not null references teams(id) on delete cascade,
  stage_id              uuid            not null references stages(id) on delete restrict,
  stage_number          integer         not null check (stage_number between 0 and 5),
  status                stage_status    not null default 'locked',
  started_at            timestamptz,
  completed_at          timestamptz,
  admin_approval_status approval_status not null default 'pending',
  admin_approved_by     uuid            references profiles(id) on delete set null,
  admin_approved_at     timestamptz,
  admin_remarks         text,
  created_by            uuid            references profiles(id) on delete set null,
  created_at            timestamptz     not null default now(),
  updated_at            timestamptz     not null default now(),
  unique (team_id, stage_id)
);

create trigger trg_team_stage_progress_updated_at
  before update on team_stage_progress
  for each row execute function set_updated_at();


-- ---------------------------------------------------------------------------
-- 12. portfolio_outputs
-- ---------------------------------------------------------------------------

create table portfolio_outputs (
  id                 uuid             primary key default uuid_generate_v4(),
  team_id            uuid             not null references teams(id) on delete cascade,
  portfolio_type     student_category not null,
  leader_student_id  uuid             not null references students(id) on delete restrict,
  portfolio_title    text             not null,
  portfolio_link     text             not null,
  notes              text,
  status             approval_status  not null default 'pending',
  submitted_at       timestamptz,
  created_by         uuid             references profiles(id) on delete set null,
  created_at         timestamptz      not null default now(),
  updated_at         timestamptz      not null default now(),
  -- One portfolio output per type per team
  unique (team_id, portfolio_type)
);

create trigger trg_portfolio_outputs_updated_at
  before update on portfolio_outputs
  for each row execute function set_updated_at();


-- ---------------------------------------------------------------------------
-- 13. portfolio_participants
-- ---------------------------------------------------------------------------

create table portfolio_participants (
  id                   uuid        primary key default uuid_generate_v4(),
  portfolio_output_id  uuid        not null references portfolio_outputs(id) on delete cascade,
  student_id           uuid        not null references students(id) on delete cascade,
  participation_role   text        not null check (participation_role in ('leader', 'assistant')),
  created_at           timestamptz not null default now(),
  unique (portfolio_output_id, student_id)
);


-- ---------------------------------------------------------------------------
-- 14. portfolio_approvals
-- ---------------------------------------------------------------------------

create table portfolio_approvals (
  id                   uuid            primary key default uuid_generate_v4(),
  portfolio_output_id  uuid            not null references portfolio_outputs(id) on delete cascade,
  approver_user_id     uuid            not null references profiles(id) on delete cascade,
  approver_role        text            not null check (approver_role in ('educator', 'admin')),
  approval_status      approval_status not null default 'pending',
  remarks              text,
  approved_at          timestamptz,
  created_at           timestamptz     not null default now(),
  updated_at           timestamptz     not null default now(),
  -- One approval record per approver per portfolio
  unique (portfolio_output_id, approver_user_id)
);

create trigger trg_portfolio_approvals_updated_at
  before update on portfolio_approvals
  for each row execute function set_updated_at();


-- ---------------------------------------------------------------------------
-- 15. projects
-- ---------------------------------------------------------------------------

create table projects (
  id           uuid         primary key default uuid_generate_v4(),
  team_id      uuid         not null references teams(id) on delete cascade,
  project_name text         not null,
  project_type text         not null
                 check (project_type in (
                   'brand_shoot', 'portfolio_shoot', 'creative_project',
                   'practice_project', 'other'
                 )),
  project_date date,
  location     text,
  instructions text,
  status       stage_status not null default 'not_started',
  created_by   uuid         references profiles(id) on delete set null,
  created_at   timestamptz  not null default now(),
  updated_at   timestamptz  not null default now()
);

create trigger trg_projects_updated_at
  before update on projects
  for each row execute function set_updated_at();


-- ---------------------------------------------------------------------------
-- 16. project_assignments
-- ---------------------------------------------------------------------------

create table project_assignments (
  id                  uuid        primary key default uuid_generate_v4(),
  project_id          uuid        not null references projects(id) on delete cascade,
  external_member_id  uuid        not null references external_members(id) on delete cascade,
  assignment_role     text        not null,
  status              text        not null default 'active'
                        check (status in ('active', 'inactive', 'completed')),
  created_by          uuid        references profiles(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (project_id, external_member_id)
);

create trigger trg_project_assignments_updated_at
  before update on project_assignments
  for each row execute function set_updated_at();


-- ---------------------------------------------------------------------------
-- 17. project_approvals
-- ---------------------------------------------------------------------------

create table project_approvals (
  id                uuid            primary key default uuid_generate_v4(),
  project_id        uuid            not null references projects(id) on delete cascade,
  approver_user_id  uuid            not null references profiles(id) on delete cascade,
  approver_role     text            not null check (approver_role in ('educator', 'admin')),
  approval_status   approval_status not null default 'pending',
  remarks           text,
  approved_at       timestamptz,
  created_at        timestamptz     not null default now(),
  updated_at        timestamptz     not null default now(),
  unique (project_id, approver_user_id)
);

create trigger trg_project_approvals_updated_at
  before update on project_approvals
  for each row execute function set_updated_at();


-- ---------------------------------------------------------------------------
-- 18. notifications
-- ---------------------------------------------------------------------------

create table notifications (
  id            uuid        primary key default uuid_generate_v4(),
  title         text        not null,
  message       text        not null,
  audience_type text        not null
                  check (audience_type in (
                    'all_students', 'all_educators', 'all_external',
                    'specific_team', 'specific_user'
                  )),
  priority      text        not null default 'normal'
                  check (priority in ('normal', 'high')),
  created_by    uuid        references profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger trg_notifications_updated_at
  before update on notifications
  for each row execute function set_updated_at();


-- ---------------------------------------------------------------------------
-- 19. notification_recipients
-- ---------------------------------------------------------------------------

create table notification_recipients (
  id                 uuid        primary key default uuid_generate_v4(),
  notification_id    uuid        not null references notifications(id) on delete cascade,
  recipient_user_id  uuid        not null references profiles(id) on delete cascade,
  read_status        boolean     not null default false,
  read_at            timestamptz,
  created_at         timestamptz not null default now(),
  unique (notification_id, recipient_user_id)
);


-- ---------------------------------------------------------------------------
-- 20. activity_logs
-- ---------------------------------------------------------------------------

create table activity_logs (
  id             uuid        primary key default uuid_generate_v4(),
  actor_user_id  uuid        references profiles(id) on delete set null,
  action_type    text        not null,
  entity_type    text        not null,
  entity_id      uuid,
  description    text        not null,
  metadata       jsonb,
  created_at     timestamptz not null default now()
);

comment on table activity_logs is
  'Append-only audit log. No updated_at — rows are never mutated.';


-- ---------------------------------------------------------------------------
-- Indexes for common query patterns
-- ---------------------------------------------------------------------------

create index idx_profiles_role           on profiles (role);
create index idx_students_user_id        on students (user_id);
create index idx_students_institute      on students (institute_id);
create index idx_students_category       on students (student_category);
create index idx_educators_user_id       on educators (user_id);
create index idx_external_user_id        on external_members (user_id);
create index idx_teams_institute         on teams (institute_id);
create index idx_teams_program           on teams (program_id);
create index idx_teams_stage             on teams (current_stage_number);
create index idx_team_members_team       on team_members (team_id);
create index idx_team_members_student    on team_members (student_id);
create index idx_team_educators_team     on team_educators (team_id);
create index idx_team_educators_educator on team_educators (educator_id);
create index idx_tsp_team               on team_stage_progress (team_id);
create index idx_portfolio_team         on portfolio_outputs (team_id);
create index idx_portfolio_approvals_po on portfolio_approvals (portfolio_output_id);
create index idx_projects_team          on projects (team_id);
create index idx_project_approvals_proj on project_approvals (project_id);
create index idx_notif_recipients_user  on notification_recipients (recipient_user_id);
create index idx_activity_actor         on activity_logs (actor_user_id);
create index idx_activity_entity        on activity_logs (entity_type, entity_id);
