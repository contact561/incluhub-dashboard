# IncluHub Current Project Status

## 1. Audit metadata

| Item | Value |
|------|--------|
| **Audit date/time** | Friday, 10 July 2026 (local audit run) |
| **Git branch** | `master` |
| **Working tree** | **Dirty** — extensive uncommitted changes |
| **Uncommitted changes** | Yes — modified docs, program/team cross-institute code, new team/program files, migrations `004`/`005`, cleanup scripts |
| **Latest 5 commits** | `f4ec16d` Add team management · `4fa8e76` Complete admin user creation flow · `7b449c2` Add authentication and role-based redirects · `8df096e` Add initial Supabase RLS policies · `90a7ec4` Add initial Supabase database schema |
| **Node.js** | v22.22.0 |
| **npm** | 11.11.0 |
| **Generated/temporary files tracked** | `.next/` and `.env*` are in `.gitignore` and not committed. Initial `git status` snapshot showed many untracked `.next` cache files locally; they are not part of committed source. |
| **Secrets exposed in this report** | None |

**Important Git note:** The latest commit message `Add team management` (`f4ec16d`) actually added **institutes and single-institute programs**, not team CRUD. The committed `src/app/admin/teams/page.tsx` at `HEAD` is still a **placeholder**. Full team management and cross-institute correction exist only in the **uncommitted working tree**.

---

## 2. Current repository structure

```
docs/
  Architecture_Plan.md
  Database_Plan.md
  Product_Master.md
  PROJECT_RULES.md
  Screen_Structure.md
  User_Flows.md
  CURRENT_PROJECT_STATUS.md          ← this report

src/app/
  page.tsx                           # public landing → /login
  layout.tsx
  globals.css
  login/page.tsx
  forgot-password/page.tsx
  auth/callback/route.ts
  admin/
    layout.tsx
    dashboard/page.tsx               # placeholder content
    users/page.tsx, users/create/page.tsx
    institutes/page.tsx, institutes/create/page.tsx
    programs/page.tsx, programs/create/page.tsx, programs/[id]/page.tsx
    students/page.tsx
    educators/page.tsx
    external-members/page.tsx
    teams/page.tsx, teams/create/page.tsx, teams/[id]/page.tsx
    stages/page.tsx                  # placeholder
    portfolio-approvals/page.tsx     # placeholder
    project-approvals/page.tsx       # placeholder
    notifications/page.tsx           # placeholder
    activity-logs/page.tsx           # placeholder
  student/layout.tsx, student/dashboard/page.tsx
  educator/layout.tsx, educator/dashboard/page.tsx
  external/layout.tsx, external/dashboard/page.tsx

src/actions/
  auth/login.ts, logout.ts, forgotPassword.ts
  users/createUser.ts
  institutes/createInstitute.ts
  programs/createProgram.ts, enrollStudents.ts
  teams/createTeam.ts

src/components/
  forms/                             # Login, ForgotPassword, CreateUser, CreateInstitute,
                                     # CreateProgram, CreateTeam, EnrollStudents
  tables/                            # Users, Students, Educators, ExternalMembers,
                                     # Institutes, Programs, Teams
  layout/RoleLayout.tsx, Sidebar.tsx, PlaceholderPage.tsx
  status/EmptyState, QueryErrorState, StatusBadge
  ui/                                # shadcn-style button, input, table, etc.

src/lib/
  auth/                              # getCurrentProfile, requireRole, redirects, helpers
  data/admin/                        # users, students, educators, external-members,
                                     # institutes, programs, teams
  permissions/roles.ts
  supabase/client.ts, server.ts, admin.ts
  validations/                       # user, institute, program, team
  constants/labels.ts

src/types/
  database.ts                        # manually maintained DB types
  admin-records.ts

supabase/
  README.md
  migrations/
    001_initial_schema.sql
    002_table_grants.sql
    003_fix_rls_recursion.sql
    004_create_balanced_team.sql     # untracked — old single-institute RPC
    005_cross_institute_program_teams.sql  # untracked — cross-institute correction
  policies/
    002_rls_policies.sql
  scripts/
    audit_test_data_before_reset.sql
    reset_test_data.sql
    verify_clean_database.sql
```

---

## 3. Documentation status

| Document | Exists | Summary | Matches cross-institute workflow? | Outdated/contradictory notes |
|----------|--------|---------|-----------------------------------|------------------------------|
| `docs/PROJECT_RULES.md` | Yes | MVP rules, roles, team rule, stages, security | **Yes (uncommitted edits)** — teams program-scoped; students may span institutes | Committed version at `HEAD` may differ; working tree updated |
| `docs/Product_Master.md` | Yes | Product scope, features, permissions | **Yes (uncommitted edits)** | — |
| `docs/User_Flows.md` | Yes | Admin/student/educator flows | **Yes (uncommitted edits)** — Stage 1 flow uses Program → enrolled students → per-student educators | — |
| `docs/Screen_Structure.md` | Yes | Screen inventory and fields | **Yes (uncommitted edits)** — Create Team lists Program first, institute-matched educators | — |
| `docs/Database_Plan.md` | Yes | Full table plan | **Yes (uncommitted edits)** — `program_institutes`, `program_enrollments`, `team_educators.student_id` | — |
| `docs/Architecture_Plan.md` | Yes | Stack, routes, security architecture | **Mostly yes (uncommitted edits)** | Some route lists still describe future screens not built |
| `README.md` | Yes | Default create-next-app boilerplate | **No** | Does not describe IncluHub setup, env vars, or migrations |
| `AGENTS.md` | Yes | Agent instructions, MVP scope | Yes | Points to `PROJECT_RULES.md` |

**Documentation vs code gap:** Planning docs in the working tree align with cross-institute correction. **Committed** application code at `HEAD` still implements **single-institute program create**. README is generic and not project-specific.

---

## 4. Technology and configuration status

| Area | Status | Evidence |
|------|--------|----------|
| **Next.js** | 16.2.10, App Router | `package.json`, build output lists 27 routes |
| **React** | 19.2.4 | `package.json` |
| **TypeScript** | ^5, strict usage | `npx tsc --noEmit` passes |
| **Tailwind CSS** | v4 (`@tailwindcss/postcss`) | `package.json`, `src/app/globals.css` |
| **shadcn/ui** | Configured (`components.json`, style `base-nova`) | `components.json`, `src/components/ui/*` |
| **Supabase** | `@supabase/supabase-js` ^2.110.2, `@supabase/ssr` ^0.12.0 | `package.json` |
| **Form handling** | Native `FormData` + server actions (`useActionState`) | forms under `src/components/forms/` |
| **Validation** | Custom parsers in `src/lib/validations/*` — no Zod/Yup | validation files |
| **Testing** | **None configured** | No Jest/Vitest/Playwright in `package.json` |
| **Linting** | ESLint 9 + `eslint-config-next` | `npm run lint` exits 0 with jsx-ast-utils warnings |
| **Formatting** | No Prettier config found | — |

**Environment variables expected (names only):**

| Variable | Used in |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | `src/lib/supabase/client.ts`, `server.ts`, `admin.ts`, `src/middleware.ts` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same |
| `SUPABASE_SERVICE_ROLE_KEY` | `src/lib/supabase/admin.ts` only |
| `NEXT_PUBLIC_APP_URL` | `src/actions/auth/forgotPassword.ts` (optional, defaults to `http://localhost:3000`) |

**Service-role access:**

- `src/lib/supabase/admin.ts` — server-only, documented warning not to import in client components.
- Used by: `src/actions/users/createUser.ts`, `src/actions/auth/login.ts` (profile lookup after password auth).
- **Client exposure risk:** No evidence service-role key is imported in client components. Browser client uses anon key only (`src/lib/supabase/client.ts`).

---

## 5. Authentication status

| Topic | Implementation | Evidence |
|-------|----------------|----------|
| **Login route** | `/login` — email/password form | `src/app/login/page.tsx`, `src/components/forms/LoginForm.tsx`, `src/actions/auth/login.ts` |
| **Forgot password** | `/forgot-password` | `src/app/forgot-password/page.tsx`, `src/actions/auth/forgotPassword.ts` |
| **Auth callback** | `/auth/callback` — exchanges code for session | `src/app/auth/callback/route.ts` |
| **Account creation** | Admin-only via `/admin/users/create` | `src/actions/users/createUser.ts` |
| **Admin enters password** | Yes — required on create-user form | `src/lib/validations/user.ts`, `CreateUserForm.tsx` |
| **Invitation email** | **No** — direct account creation | `createUser.ts` uses `auth.admin.createUser` |
| **Email confirmation bypass** | Yes — `email_confirm: true` | `src/actions/users/createUser.ts` line 146 |
| **Force password change** | **No** | — |
| **Public signup** | **No** | No signup route; `AGENTS.md`, `PROJECT_RULES.md` |
| **Google/OAuth** | **No** | Login is password-only |
| **Role lookup** | `profiles` table via server client or admin client | `getCurrentProfile.ts`, `login.ts` |
| **Role redirect** | `redirectToDashboardByRole` / `getDashboardPathForRole` | `src/lib/auth/redirectToDashboardByRole.ts`, `getDashboardPathForRole.ts` |
| **Middleware protection** | Role-prefix checks on `/admin`, `/student`, `/educator`, `/external` | `src/middleware.ts` |
| **Logout** | Server action | `src/actions/auth/logout.ts` |
| **Auth user, no profile** | Login signs out + error; middleware signs out + `?error=account_not_setup` | `login.ts`, `middleware.ts` |
| **Profile, no role row** | Admin users: profile only. Student/educator/external: `createUser` inserts role row; if missing, user can log in but has no role-specific data | `createUser.ts` |

**Middleware note:** Next.js 16 build warns the `middleware` file convention is deprecated in favor of `proxy` — non-blocking.

---

## 6. Roles and permission status

### Route availability

| Role | Built routes | Sidebar links without routes (404 risk) |
|------|--------------|----------------------------------------|
| **admin** | Full `/admin/*` shell; list/create for users, institutes, programs, students, educators, external members, teams | None for built admin pages; Settings not in nav |
| **student** | `/student/dashboard` only | `my-team`, `my-stage`, `portfolio`, `notifications` — **no pages** |
| **educator** | `/educator/dashboard` only | `my-students`, `my-teams`, portfolio/project approvals, notifications — **no pages** |
| **external_member** | `/external/dashboard` only | `assigned-team`, `project-details`, notifications — **no pages** |

### Protection layers

| Layer | Status |
|-------|--------|
| **Middleware** | Prefix + role match + active profile | `src/middleware.ts` |
| **Layout server guard** | `requireRole()` in each role layout | `src/app/admin/layout.tsx`, etc. |
| **Server actions** | `requireAdminProfile()` / `getCurrentProfile()` checks | actions under `src/actions/` |
| **RLS** | Enabled on all MVP tables in `002_rls_policies.sql`; `program_*` RLS in `005` | see §9 |

### Permission matrix (simplified)

| Capability | Admin | Student | Educator | External |
|------------|-------|---------|----------|----------|
| Login | ✓ | ✓ | ✓ | ✓ |
| Create users | ✓ (service role) | ✗ | ✗ | ✗ |
| Manage institutes/programs/teams | ✓ | ✗ | ✗ | ✗ |
| View all teams | ✓ | ✗ | ✗ | ✗ |
| View own team | ✓ | RLS (not built UI) | RLS (not built UI) | RLS (not built UI) |
| Portfolio/project approvals | Placeholder UI | ✗ | RLS only | ✗ |
| Activity logs | Placeholder UI | ✗ | ✗ | ✗ |
| Notifications | Placeholder UI | ✗ | ✗ | ✗ |

**Client-only hiding:** Sidebar hides links by role, but **middleware + RLS** are the real enforcement. Non-admin role nav items point to unimplemented routes — not a security issue, but UX broken.

---

## 7. Database schema status

### Tables defined in repository migrations

All tables below are created in `supabase/migrations/001_initial_schema.sql` unless noted.

| Table | Purpose | Key FKs | `institute_id` | `created_by` | RLS (002) | Notable constraints |
|-------|---------|---------|----------------|--------------|-----------|---------------------|
| **profiles** | User profile + role; `id` = `auth.users.id` | → `auth.users`, self `created_by` | — | ✓ SET NULL | ✓ | `email` unique |
| **institutes** | Academy records | `created_by` → profiles | — | ✓ | ✓ | status check |
| **programs** | Program/batch | → institutes (nullable after 005) | legacy column | ✓ | ✓ | status check |
| **program_institutes** | Program ↔ institute M:N | → programs, institutes | ✓ | ✓ | ✓ (005) | unique `(program_id, institute_id)` |
| **program_enrollments** | Student enrollment in program | → programs, students | — | ✓ | ✓ (005) | unique `(program_id, student_id)` |
| **students** | Student role data | → profiles, institutes, teams (`current_team_id`) | ✓ | ✓ | ✓ | `user_id` unique; stage 0–5 |
| **educators** | Educator role data | → profiles, institutes | ✓ | ✓ | ✓ | `user_id` unique |
| **external_members** | External collaborator | → profiles | — | ✓ | ✓ | `user_id` unique |
| **teams** | Creative team | → institutes (nullable after 005), programs | legacy nullable | ✓ | ✓ | stage 0–5 on team |
| **team_members** | Student ↔ team | → teams, students | — | ✓ | ✓ | `uq_team_active_category`, `uq_student_active_team` |
| **team_educators** | Educator ↔ team ↔ student | → teams, educators, students (`student_id` in 005) | — | ✓ | ✓ | `uq_team_active_student_educator` (005) |
| **stages** | Master stage list (6 rows seeded) | — | — | — | ✓ | `stage_number` unique 0–5 |
| **team_stage_progress** | Per-team stage state | → teams, stages, profiles | — | ✓ | ✓ | unique `(team_id, stage_id)` |
| **portfolio_outputs** | Stage 3 portfolios | → teams, students (leader RESTRICT) | — | ✓ | ✓ | unique `(team_id, portfolio_type)` |
| **portfolio_participants** | Leader/assistant | → portfolio_outputs, students | — | — | ✓ | unique per portfolio+student |
| **portfolio_approvals** | Educator/admin approval | → portfolio_outputs, profiles | — | — | ✓ | unique per portfolio+approver |
| **projects** | Stage 4 projects | → teams | — | ✓ | ✓ | — |
| **project_assignments** | External ↔ project | → projects, external_members | — | ✓ | ✓ | unique per project+external |
| **project_approvals** | Stage 4 approvals | → projects, profiles | — | — | ✓ | unique per project+approver |
| **notifications** | Admin broadcasts | `created_by` → profiles | — | ✓ | ✓ | audience_type check |
| **notification_recipients** | Per-user delivery | → notifications, profiles | — | — | ✓ | unique pair |
| **activity_logs** | Audit trail | `actor_user_id` → profiles SET NULL | — | — | ✓ admin read | append-only |

### Classification

1. **Defined in migrations:** All tables listed above.
2. **In TypeScript but not in 001 alone:** `program_institutes`, `program_enrollments`, `team_educators.student_id` — added in **005** (also reflected in `src/types/database.ts`).
3. **Planned only (no migration):** Payments, WhatsApp, CRM, etc. per `PROJECT_RULES.md` exclusion list.
4. **Live DB (read-only probe, not migration file):** Tables `program_institutes`, `program_enrollments` **exist**; `stages` has **6 rows**; `profiles` count **1** (admin only). RPCs `create_program_with_institutes` and 8-arg `create_balanced_team` **exist** (function-not-found was not returned). **Cannot confirm** every 005 detail (e.g. backfills) from repo alone.

---

## 8. Migration status

| Order | File | Purpose | Depends on | Notes |
|-------|------|---------|------------|-------|
| 1 | `001_initial_schema.sql` | Enums, 20 tables, stage seed, indexes | — | Safe on clean DB |
| 2 | `002_table_grants.sql` | Schema/table grants for API roles | 001 | Safe after 001 |
| 3 | `002_rls_policies.sql` (in `policies/`) | RLS + security-definer helpers | 001 | Run after 001; before 003 |
| 4 | `003_fix_rls_recursion.sql` | Fixes recursive RLS via helpers | 002 RLS | Safe after RLS |
| 5 | `004_create_balanced_team.sql` | **Old** 9-arg single-institute `create_balanced_team` | 001–003 | **Superseded by 005**; **not required** on fresh DB if 005 applied |
| 6 | `005_cross_institute_program_teams.sql` | `program_institutes`, `program_enrollments`, nullable legacy FKs, `team_educators.student_id`, backfills, RLS, `create_program_with_institutes`, **replaces** `create_balanced_team` (8-arg), Stage 0+1 complete / Stage 2 current | 001–003 | Destructive-altering: drops old RPC signature, NOT NULL on `student_id` after backfill |

### Migrations 004 vs 005

| Question | Answer |
|----------|--------|
| Does 005 exist in repo? | **Yes** — `supabase/migrations/005_cross_institute_program_teams.sql` (currently **untracked**) |
| Does 005 replace old RPC? | **Yes** — `DROP FUNCTION` 9-arg; creates 8-arg program-scoped version |
| Is 004 required on fresh DB? | **No**, if 005 is run instead |
| Does checked-in **working tree** code expect 005? | **Yes** — `createProgram.ts`, `createTeam.ts` call RPCs defined in 005 and show error text referencing 005 |
| Is 005 applied to live DB? | **Strong evidence yes** — `program_institutes` and `program_enrollments` tables exist; 8-arg RPCs callable (not missing). **Not verified** via migration history table |

**Committed `HEAD` code** still uses single-institute `programs.insert` and has **no** team RPC integration.

---

## 9. RLS and database security audit

| Topic | Finding | Severity |
|-------|---------|------------|
| RLS enabled | All 001 tables + `program_*` in 005 | No issue found |
| Security-definer helpers | `is_admin()`, `get_my_role()`, `my_student_id()`, etc. with `set search_path = public` | No issue found |
| RPC `create_balanced_team` / `create_program_with_institutes` | SECURITY DEFINER, `is_admin()` inside, REVOKE PUBLIC/anon, GRANT authenticated only (005) | No issue found |
| Circular RLS | Addressed in 003 for teams/projects/assignments | No issue found |
| Service-role bypass | Used intentionally for admin user creation and login profile fetch | **Medium** — acceptable for MVP if server-only; increases blast radius if key leaks |
| Cross-institute exposure | RLS still team/program scoped; 005 adds enrollment policies | **Low** — depends on correct policy use |
| Client-provided institute IDs | Program create RPC revalidates institutes exist and are active (005); enroll action checks `program_institutes` | No issue found for program flow |
| Team create IDs | Revalidated inside RPC (enrollment, institute participation, educator institute match) | No issue found |
| `program_institutes` SELECT for authenticated | Policy allows `auth.uid() is not null` (005) — broad read | **Low** |
| activity_logs | Admin SELECT only; writes expected via service role per policy comments | No issue found |

---

## 10. Admin module status

| Module | Status | Routes | Actions | Data | Forms/Tables | Limitations |
|--------|--------|--------|---------|------|--------------|-------------|
| **Dashboard** | Placeholder | `/admin/dashboard` | — | — | — | No metrics |
| **Users list** | Functional | `/admin/users` | — | `lib/data/admin/users.ts` | `UsersTable` | Read-only list |
| **User creation** | Complete | `/admin/users/create` | `createUser.ts` | — | `CreateUserForm` | Service-role; rollback on failure |
| **Institutes list** | Functional | `/admin/institutes` | — | `institutes.ts` | `InstitutesTable` | — |
| **Institute creation** | Functional | `/admin/institutes/create` | `createInstitute.ts` | — | `CreateInstituteForm` | — |
| **Institute detail** | Missing | — | — | — | — | No `[id]` page |
| **Programs list** | Functional (WT) | `/admin/programs` | — | `programs.ts` | `ProgramsTable` | WT shows participating institutes |
| **Program creation** | Functional (WT) | `/admin/programs/create` | `createProgram.ts` | — | `CreateProgramForm` | WT: multi-institute RPC |
| **Program detail** | Functional (WT) | `/admin/programs/[id]` | `enrollStudents.ts` | `programs.ts` | `EnrollStudentsForm` | Enroll only; no edit/delete |
| **Participating institutes** | Functional (WT) | via program create + detail display | RPC | — | checkboxes on create | No post-create institute edit |
| **Program enrolment** | Functional (WT) | program detail | `enrollStudents.ts` | `getEnrollableStudentsForProgram` | `EnrollStudentsForm` | Server-side institute + active checks |
| **Teams list** | Functional (WT) | `/admin/teams` | — | `teams.ts` | `TeamsTable` | HEAD: placeholder |
| **Team creation** | Functional (WT) | `/admin/teams/create` | `createTeam.ts` | `getTeamCreateOptions` | `CreateTeamForm` | RPC-only; requires enrolment |
| **Team detail** | Functional (WT) | `/admin/teams/[id]` | — | `getAdminTeamById` | — | Read-only |
| **Stage management** | Placeholder | `/admin/stages` | — | — | — | — |
| **Portfolio management** | Placeholder | `/admin/portfolio-approvals` | — | — | — | — |
| **Project management** | Placeholder | `/admin/project-approvals` | — | — | — | — |
| **Notifications** | Placeholder | `/admin/notifications` | — | — | — | — |
| **Activity logs** | Placeholder | `/admin/activity-logs` | — | — | — | — |
| **Settings** | Missing | — | — | — | — | Not in nav or codebase |

*WT = present in uncommitted working tree, not in last commit.*

---

## 11. User creation status

**Single admin operation** (`createUserAction`) creates:

| Role | auth.users | profiles | Role table |
|------|------------|----------|------------|
| admin | ✓ | ✓ | — |
| student | ✓ | ✓ | `students` |
| educator | ✓ | ✓ | `educators` |
| external_member | ✓ | ✓ | `external_members` |

| Aspect | Status |
|--------|--------|
| Atomicity | **Partial** — auth user → profile → role row; rollback deletes profile + auth user on role failure |
| Rollback | `rollbackAuthUser()` + profile delete | `createUser.ts` |
| Validation | Client + `parseCreateUserFormData` | `lib/validations/user.ts` |
| Duplicate email | Supabase auth error surfaced | — |
| Institute validation | DB lookup for student/educator | — |
| Password | Admin-set, min rules in validation | — |
| `email_confirm: true` | Immediate login without email verification | — |
| Reuse deleted emails | Possible after auth user deleted (cleanup script removes auth users) | — |
| Orphan risk | Profile failure rolls back auth; role failure rolls back both | Low if rollback succeeds |

---

## 12. Program and cross-institute status

**Working tree implementation** (not committed):

| Capability | Supported? | Evidence |
|------------|------------|----------|
| One Program → multiple institutes | **Yes** | `CreateProgramForm` checkboxes; `create_program_with_institutes` RPC; `program_institutes` |
| Atomic program + institutes create | **Yes (RPC)** | `src/actions/programs/createProgram.ts` |
| Program detail page | **Yes** | `src/app/admin/programs/[id]/page.tsx` |
| Student enrolment | **Yes** | `enrollStudents.ts`, `EnrollStudentsForm` |
| Enrolment status | **Yes** | `program_enrollments.status` |
| Block non-participating institutes | **Yes** | `enrollStudents.ts` checks `program_institutes` |
| Show institute + category | **Yes** | program detail + enrolment lists |
| Backfill from existing teams | **In migration 005 SQL** | not app code |
| Program status filtering on team create | **Yes** | active programs in `getTeamCreateOptions` |

**Ready for clean manual testing?** **Yes**, after: (1) migration 005 on DB — **likely already applied**; (2) create institutes, users, program, enroll students, create team. Database was cleaned — **no test data** until recreated.

---

## 13. Team creation status

**Working tree = fully corrected cross-institute flow** (code level).

| Topic | Current implementation |
|-------|------------------------|
| Flow type | **Cross-institute, program-scoped** |
| Form order | Program → enrolled students (per category) → per-student educators |
| Institute selected first? | **No** |
| Student source | `program_enrollments` + active + `current_team_id` null |
| Cross-institute students | **Yes** |
| Educator filtering | By selected student's `instituteId` + category | `CreateTeamForm.tsx` |
| `team_educators.student_id` | **Yes** in types, migration 005, RPC inserts |
| RPC only | **Yes** — no sequential fallback | `createTeam.ts` |
| Service-role fallback | **No** |
| Atomicity | **Yes** — single `create_balanced_team` RPC transaction |
| Stage init | Stage 0+1 `completed`, Stage 2 `in_progress`, 3–5 `locked` | `005` SQL lines 641–645 |
| `students.current_team_id` | Updated in RPC | `005` SQL |
| Duplicate protection | RPC checks + DB `uq_student_active_team` + `FOR UPDATE` locks |
| Team list/detail | Program-centric; institute per member | `teams.ts`, `TeamsTable`, `[id]/page` |

**Committed HEAD:** teams page is `PlaceholderPage` only.

---

## 14. Shared stage status

| Topic | Status |
|-------|--------|
| Six master rows | Seeded in `001_initial_schema.sql`; **6 rows confirmed** on live DB |
| Shared team progression | `team_stage_progress` per team; RPC initializes all stages for team |
| Per-student progress rows | **No** separate table — `students.current_stage_number` mirrored to team (set to 2 on create) |
| `current_stage_number` usage | On `students` and `teams`; updated by team RPC |
| Initial stage after team create | **Stage 2 in progress** (Stages 0–1 completed) per 005 RPC |
| Stage 2/BMS screens | **None** — `/admin/stages` is placeholder |
| Progression actions | **None** in app code |
| Stage locking logic | **In RPC only** at team creation; no UI to advance/complete Stage 2 |

---

## 15. Student, educator and external dashboards

| Role | Routes built | Data | Nav | Enforcement | Missing |
|------|--------------|------|-----|-------------|---------|
| **student** | `/student/dashboard` | Placeholder text | 5 items, 4 routes missing | layout `requireRole('student')` | my-team, stage, portfolio, notifications |
| **educator** | `/educator/dashboard` | Placeholder | 6 items, 5 routes missing | `requireRole('educator')` | students, teams, approvals |
| **external_member** | `/external/dashboard` | Placeholder | 4 items, 3 routes missing | `requireRole('external_member')` | assigned team, project |

No approval actions implemented in UI for non-admin roles.

---

## 16. Forms and validation audit

| Form | Client validation | Server validation | DB validation | Error/success/loading |
|------|-------------------|-------------------|---------------|------------------------|
| Login | HTML `required` | email/password check | Auth | error + pending |
| Forgot password | required | email check | Auth reset | error/success |
| CreateUser | required fields | `parseCreateUserFormData` | FK + unique | error; redirect on success |
| CreateInstitute | required | `parseCreateInstituteFormData` | status check | error; redirect |
| CreateProgram (WT) | checkboxes | `parseCreateProgramFormData` ≥1 institute | RPC validates institutes | error; redirect |
| EnrollStudents | checkbox list | `parseEnrollStudentsFormData` | program active, institute participation, student active | error/success |
| CreateTeam (WT) | selects | `parseCreateTeamFormData` | full RPC validation | error; redirect |

**Server-side ID revalidation:** Program enrolment and team RPC revalidate IDs. Create user revalidates institute. **No** generic ID guard utility — per-action checks.

---

## 17. Data-access architecture

| Pattern | Usage |
|---------|--------|
| Server Components | Admin list/detail pages fetch via `lib/data/admin/*` |
| Client Components | Forms with `useActionState` |
| Server Actions | `src/actions/**` — mutations and auth |
| Route Handlers | `auth/callback` only |
| Browser Supabase | `lib/supabase/client.ts` — not heavily used yet |
| Server Supabase | `lib/supabase/server.ts` — RLS-aware reads/writes |
| Admin/service Supabase | `lib/supabase/admin.ts` — user creation, login profile |
| Permissions | `requireRole`, `getCurrentProfile`, action-level admin checks |
| Duplication | `requireAdminProfile()` repeated per action file |

UI components do **not** directly query Supabase; pages call data loaders.

---

## 18. Database cleanup scripts

| File | Purpose |
|------|---------|
| `supabase/scripts/audit_test_data_before_reset.sql` | Read-only counts and deletion preview |
| `supabase/scripts/reset_test_data.sql` | Destructive cleanup in transaction |
| `supabase/scripts/verify_clean_database.sql` | Post-cleanup PASS/FAIL checks |

| Aspect | Detail |
|--------|--------|
| Preserved admin email | `admin@incluhub.test` (hard-coded in all three) |
| Pre-delete validation | Aborts if admin missing/not active admin |
| Transaction | `BEGIN` … `COMMIT` in reset script |
| Re-runnable | Yes — idempotent DELETEs |
| Tables cleared | notifications through institutes, non-admin profiles/auth users |
| Preserved | `stages` (6 rows), schema, preserved admin |
| Risk | Destructive; requires SQL Editor privileges on `auth.users` |

**Not executed during this audit.**

---

## 19. Current build health

| Command | Result | Notes |
|---------|--------|-------|
| `npx tsc --noEmit` | **PASS** | No errors |
| `npm run build` | **PASS** | 27 routes; middleware deprecation warning |
| `npm run lint` | **PASS** (exit 0) | jsx-ast-utils warnings on TSSatisfiesExpression — tooling noise |

No implementation errors blocking build in working tree.

---

## 20. Git and implementation history

| Phase | Commit / state |
|-------|----------------|
| Initial schema | `90a7ec4` |
| RLS policies | `8df096e` |
| Auth + redirects | `7b449c2` |
| Admin user creation | `4fa8e76` |
| Institutes + single-institute programs | `f4ec16d` (message says "team management") |
| Cross-institute correction | **Uncommitted** — programs, teams, migrations 004/005, docs, cleanup scripts |
| Team UI at HEAD | Placeholder only |

**Risk:** Production deploy from `HEAD` would **not** include cross-institute teams or real team pages.

---

## 21. Current implemented workflow

Based on **working tree** code + **likely applied** migration 005:

```
Admin login (admin@incluhub.test)
→ Create institute(s)                    [/admin/institutes/create]
→ Create students (per institute/category) [/admin/users/create]
→ Create educators (per institute/type)    [/admin/users/create]
→ Create Program / Batch (multi-institute) [/admin/programs/create]
→ Open program detail                      [/admin/programs/[id]]
→ Enroll students (not already on a team)  [EnrollStudentsForm]
→ Create team                              [/admin/teams/create]
   → Select program
   → Select enrolled makeup / photo / hair students (may differ by institute)
   → Select matching educator per student
   → RPC creates team at Stage 2
→ View team list/detail                    [/admin/teams, /admin/teams/[id]]
```

**Stops after team creation.** No Stage 2 completion, portfolio, projects, notifications, or non-admin workflows in UI.

---

## 22. Intended workflow versus implemented workflow

| Area | Intended | Implemented (WT) | Gap | Severity | Next step |
|------|----------|-------------------|-----|----------|-----------|
| Authentication | Admin-created, role from profiles | Yes | — | — | — |
| User creation | Atomic auth+profile+role | Mostly atomic with rollback | Rare orphan if rollback fails | Low | Monitor |
| Multi-institute Programs | program_institutes | Yes (WT) | Not committed | High | Commit + test |
| Student enrolments | Required before teams | Yes (WT) | UX guidance only | Low | Test on clean DB |
| Cross-institute teams | Program-scoped RPC | Yes (WT) | Uncommitted code | High | Commit |
| Educator mapping | Per student | Yes in RPC + UI | — | — | Test |
| Shared stages | Team `team_stage_progress` | Initialized at create | No UI to manage | High | Stage 2 module later |
| Stage 2 BMS | Admin completes BMS | Stage 2 set `in_progress` only | No completion UI | High | Future step |
| Portfolio approvals | Dual approval | Placeholder page | Full module missing | High | Future |
| Projects | Stage 4 workflow | Placeholder | Full module missing | High | Future |
| Notifications | Admin send | Placeholder | Missing | Medium | Future |
| Activity logs | Admin view | Placeholder | Missing | Medium | Future |
| Archive/deactivation | Implied | status fields exist | No UI | Low | Future |

---

## 23. Known bugs, risks and contradictions

### Critical blockers

| Issue | Evidence | Impact | Suggested action |
|-------|----------|--------|------------------|
| Cross-institute work uncommitted | `git status` | Deploy/review mismatch; collaborators see old program/team code | Commit working tree after verification |
| Committed teams page is placeholder | `HEAD:src/app/admin/teams/page.tsx` | Last commit does not deliver Step 19 | Do not treat `HEAD` as current |

### Important corrections

| Issue | Evidence | Impact | Suggested action |
|-------|----------|--------|------------------|
| Non-admin nav links 404 | `roles.ts` vs `src/app/student/**` (dashboard only) | Broken navigation if those roles log in | Build pages or remove nav items |
| README not project-specific | `README.md` | Onboarding friction | Update README (future) |
| Migration 004 in repo but obsolete | `004` vs `005` DROP | Confusion on fresh setup | Document "run 005, skip 004" |
| `f4ec16d` commit message misleading | git log | Planning confusion | Note in changelog |

### Non-blocking improvements

| Issue | Evidence | Impact | Suggested action |
|-------|----------|--------|------------------|
| Middleware deprecation warning | build output | Future Next.js upgrade | Migrate to proxy later |
| No automated tests | `package.json` | Regression risk | Add tests later |
| No institute detail page | no `[id]` route | Cannot view single institute | Add when needed |
| ESLint jsx-ast-utils warnings | lint output | Noise | Tooling upgrade |

---

## 24. Current completion matrix

| Step/module | Status | Evidence | DB dependency | Manual setup | Ready to test | Notes |
|-------------|--------|----------|---------------|--------------|---------------|-------|
| Project scaffold | Complete | package.json, Next 16 | — | — | Yes | — |
| DB schema 001 | Complete | migration 001 | Run SQL | Yes | Yes | — |
| Table grants 002 | Complete | 002_table_grants | Run SQL | Yes | Yes | — |
| RLS 002 policies | Complete | policies/002 | Run SQL | Yes | Yes | — |
| RLS recursion fix 003 | Complete | migration 003 | Run SQL | Yes | Yes | — |
| Cross-institute 005 | Coded + likely live | migration 005, DB probe | Run 005 if not applied | Yes | Yes | Untracked in git |
| Auth login/logout | Complete | auth actions, middleware | profiles + auth | Admin user | Yes | — |
| Role redirects | Complete | middleware, layouts | — | — | Yes | — |
| Admin user create | Complete | createUser.ts | all role tables | — | Yes | Clean DB ready |
| Institutes CRUD (create/list) | Functional | institutes pages | institutes | — | Yes | No detail |
| Programs (cross-institute) | Functional (WT) | programs/* | 005 RPC + tables | — | Yes | Uncommitted |
| Program enrolment | Functional (WT) | enrollStudents | program_enrollments | — | Yes | — |
| Teams (cross-institute) | Functional (WT) | teams/* | 005 RPC | Enrol first | Yes | Uncommitted |
| Team detail | Functional (WT) | teams/[id] | — | — | Yes | Read-only |
| Admin lists (users/students/etc.) | Functional | admin pages + data | — | Need data | After seed |
| Dashboards (all roles) | Placeholder | dashboard pages | — | — | Partial | — |
| Stages UI | Planned | PlaceholderPage | stages seed | — | No | — |
| Portfolio | Planned | placeholder route | tables exist | — | No | — |
| Projects | Planned | placeholder route | tables exist | — | No | — |
| Notifications | Planned | placeholder | tables exist | — | No | — |
| Activity logs | Planned | placeholder | tables exist | — | No | — |
| DB cleanup scripts | Complete | supabase/scripts/* | — | Manual SQL | Yes | Untracked |
| Student/educator/external portals | Missing | dashboard only | — | — | No | — |

---

## 25. Exact next recommended action

**Commit the cross-institute correction and run end-to-end manual testing on the cleaned database.**

**Why:** The working tree contains the complete Step 19 program + team flow aligned with migration 005, but **none of it is committed**. The live database appears empty (1 admin, 6 stages) and likely has 005 applied. The highest-value step is to **preserve the implementation in Git**, then verify: institute → users → multi-institute program → enrolment → cross-institute team → Stage 2 state in DB.

**Verify before proceeding to Stage 2 BMS:**

1. `create_program_with_institutes` and 8-arg `create_balanced_team` succeed when called as authenticated admin (not just that functions exist).
2. Team row has `current_stage_number = 2`, `institute_id` null, three `team_educators` rows with distinct `student_id`.
3. Enrolled-on-team students disappear from create-team dropdowns.

Do **not** start Stage 2 UI until this E2E path is confirmed.

---

## 26. Manual actions currently required

### Definitely required

- Create fresh test data after DB cleanup (institutes, students, educators, program, enrolments, team).
- Confirm migration **005** applied completely (RPC grants work for **authenticated** admin, not only table existence).
- Set environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, optionally `NEXT_PUBLIC_APP_URL`.
- Commit or otherwise secure uncommitted cross-institute work before sharing/deploying.

### Possibly required

- Run `002_rls_policies.sql` and `003_fix_rls_recursion.sql` if setting up a **new** Supabase project from scratch (order: 001 → 002 grants → 002 policies → 003 → 005).
- Configure Supabase Auth redirect URLs for password reset (`/auth/callback`).
- Email provider configuration for password reset emails in non-local environments.

### Unknown from repository alone

- Whether production/staging Supabase matches migration files exactly.
- Whether `004` was ever applied before `005` on any environment.
- Vercel deployment configuration.

---

## 27. Questions requiring owner confirmation

1. **Should the cross-institute working tree be committed to `master` now**, or held in a feature branch for review?
2. **Is `admin@incluhub.test` the permanent dev admin**, or should cleanup scripts use a different preserved email?
3. **Was `reset_test_data.sql` already run** on the current Supabase project (probe suggests yes: 1 profile, 0 operational data)?
4. **Which Supabase project is canonical** for continued development (URL/host not stated in repo)?
5. **Should obsolete migration `004` be removed or marked deprecated** in `supabase/README.md` to prevent mistaken execution?

---

## 28. Copy-paste summary for ChatGPT

**Project:** IncluHub Education Management Dashboard — Next.js 16 + TypeScript + Tailwind 4 + shadcn/ui + Supabase.

**Current phase:** Post–Step 19 cross-institute correction **implemented in working tree but not committed**; database cleaned to 1 admin + 6 stage rows.

**Completed modules:** Auth (login, logout, forgot password, middleware role guards), admin user creation (service-role, rollback), institutes list/create, admin read-only lists (users, students, educators, external members), **working-tree** multi-institute programs with detail + enrolment, **working-tree** cross-institute team list/create/detail.

**Partial:** Admin dashboard (placeholder), all non-admin dashboards (placeholder + broken nav links), stages/portfolio/projects/notifications/activity-logs (placeholder pages only).

**Missing:** Institute detail, settings, Stage 2+ management UI, portfolio/project workflows, notifications, activity log UI, all student/educator/external feature pages beyond dashboard.

**Auth flow:** Admin-created accounts only; email/password; `profiles.role` drives redirect; no public signup/OAuth; `email_confirm: true` on create.

**Schema:** 20 core tables in 001 + `program_institutes` / `program_enrollments` + `team_educators.student_id` in 005. Types in `src/types/database.ts`.

**Migrations present:** 001, 002 grants, 002 RLS (policies/), 003, 004 (obsolete single-institute RPC), 005 (cross-institute — **untracked**).

**Migration 005:** **Implemented in repo** and **strong evidence applied to live dev DB** (`program_institutes`, `program_enrollments` exist; 8-arg RPCs exist; 6 stages; 1 admin profile). Not verified via Supabase migration history.

**Program flow:** Working tree supports multi-institute atomic create via `create_program_with_institutes`, program detail, student enrolment with institute checks. **Ready to test** after seeding data.

**Team flow:** Working tree is **fully cross-institute**: Program → enrolled students → per-student educators; RPC-only `create_balanced_team` (8 args); Stage 0+1 completed, Stage 2 in progress. **HEAD commit still has placeholder teams page.**

**Cross-institute support:** **Yes in working tree code + migration 005**; **not in last git commit.**

**Build/typecheck:** `tsc` pass, `npm run build` pass, `lint` pass.

**Security:** RLS on all tables; RPCs hardened in 005; service role server-only for user create/login profile; no client service-role exposure found.

**Blockers:** Uncommitted Step 19 work; committed branch misleading for teams/programs.

**Exact next step:** Commit cross-institute work, then E2E test on clean DB: institute → users → program → enrol → team → verify Stage 2 DB state.

**Key paths:** `supabase/migrations/005_cross_institute_program_teams.sql`, `src/actions/teams/createTeam.ts`, `src/actions/programs/createProgram.ts`, `src/app/admin/programs/[id]/page.tsx`, `src/components/forms/CreateTeamForm.tsx`, `supabase/scripts/reset_test_data.sql`, `docs/PROJECT_RULES.md`.
