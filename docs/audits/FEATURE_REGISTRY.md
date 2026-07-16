# Complete Feature Registry — Audit 2026-07-14

Audit-only document. Status values: `complete`, `complete_with_bug`,
`partial`, `placeholder`, `not_started`, `deferred`, `removed`.

Verification columns:

- **Browser** — VERIFIED_BROWSER_REPORTED means a prior interactive session
  reported it working; this audit performed no new browser testing.
- **DB** — VERIFIED_DATABASE_SCHEMA means the supporting schema exists in
  local migration files; VERIFIED_REMOTE_DATABASE was **not achievable** in
  this audit (CLI unlinked), so no feature is marked remote-verified.

Commit references (VERIFIED_LOCAL_GIT):

| Commit | Package boundary |
|---|---|
| `69f31d4` | Initial Next.js setup + docs |
| `0ffd53b` | Project structure + placeholder routes |
| `2f79f77` | Supabase client utilities |
| `90a7ec4` | Initial DB schema (001) |
| `8df096e` | Initial RLS (002 policies) |
| `7b449c2` | Authentication + role redirects |
| `4fa8e76` | Admin user creation |
| `f4ec16d` | Team management |
| `e31fad8` | Package A stage management + BMS |
| `e92acfd` | Team journey, studio booking, student portal (A.1/B/B.1) |
| `f8f3b28` | Package C portfolio submission |
| `0ef09bf` | Package D2 educator review frontend |
| `d22b3b8` | Test reset/seed utility |
| `d87efb5` | Package D3 admin approval frontend (HEAD, pushed) |
| *(uncommitted)* | D1 SQL files, D3 eligibility repair, Stage 3 sync repair |

---

## A. Product documentation

- **Planned purpose:** Product/architecture/database/flow plans under `docs/`.
- **Artifacts:** `PROJECT_RULES.md`, `Product_Master.md`, `User_Flows.md`,
  `Screen_Structure.md`, `Database_Plan.md`, `Architecture_Plan.md`,
  `IMPLEMENTATION_PROGRESS.md`, `CURRENT_PROJECT_STATUS.md`, `README.md`,
  `supabase/README.md`.
- **Status:** `partial` — documents exist but contain drift.
  `IMPLEMENTATION_PROGRESS.md` simultaneously states D3 "Implemented" and
  "D3 Admin frontend | Not started" (contradictory rows in the same table),
  and does not mention the uncommitted Stage 3 sync repair or D3 eligibility
  repair. See master report §15.
- **Next action:** Reconcile docs after this audit is reviewed.

## B. Authentication

- **Purpose:** Email/password login, logout, forgot password, role redirect.
- **Routes:** `/login`, `/forgot-password`, `/` (redirect).
- **Actions:** `src/actions/auth/login.ts`, `logout.ts`, `forgotPassword.ts`.
- **Tables:** `auth.users`, `profiles`. **Commit:** `7b449c2`.
- **Status:** `complete`. Browser: VERIFIED_BROWSER_REPORTED (all fixture
  logins verified by reset utility + sessions). DB: schema verified locally.
- **Known issues:** none found.

## C. Role guards

- **Purpose:** Restrict `/admin|student|educator|external` to matching role.
- **Code:** `src/middleware.ts` (matcher for all four role prefixes),
  role layouts, `canAccessRoleRoute` in `src/lib/permissions/roles.ts`.
- **Status:** `complete` (VERIFIED_LOCAL_CODE + build). **Commit:** `7b449c2`.
- **Known issues:** Next.js 16 deprecation notice: `middleware` file
  convention will be renamed `proxy` (build warning; LOW).

## D. User management

- **Purpose:** Admin creates users of all four roles; lists users.
- **Routes:** `/admin/users`, `/admin/users/create`.
- **Action:** `createUser` — uses service-role client
  (`src/lib/supabase/admin.ts`, server-only). **Commit:** `4fa8e76`.
- **Status:** `complete`. Browser: VERIFIED_BROWSER_REPORTED. No edit/
  deactivate UI (out of MVP scope per docs).

## E. Institute management

- **Routes:** `/admin/institutes`, `/admin/institutes/create`.
- **Action:** `createInstitute`. **Commit:** `4fa8e76`.
- **Status:** `complete`. Browser: VERIFIED_BROWSER_REPORTED.

## F. Program management

- **Routes:** `/admin/programs`, `/admin/programs/create`,
  `/admin/programs/[id]`.
- **Action:** `createProgram` → RPC `create_program_with_institutes` (005).
- **Tables:** `programs`, `program_institutes`. **Commit:** `f4ec16d`/`e92acfd`.
- **Status:** `complete`. Browser: VERIFIED_BROWSER_REPORTED.

## G. Student enrolment

- **Route:** `/admin/programs/[id]` enrolment panel.
- **Action:** `enrollStudents`. **Table:** `program_enrollments` (005).
- **Status:** `complete`. Browser: VERIFIED_BROWSER_REPORTED.

## H. Student management

- **Route:** `/admin/students`. **Loader:** `src/lib/data/admin/students.ts`.
- **Status:** `complete` (list view incl. payment status display). No edit
  UI — matches MVP scope. Browser: VERIFIED_BROWSER_REPORTED.

## I. Educator management

- **Route:** `/admin/educators`. **Status:** `complete` (list). Browser:
  VERIFIED_BROWSER_REPORTED.

## J. External-member management

- **Route:** `/admin/external-members`. **Status:** `complete` (list +
  creation via user form). The external member **portal** is a stub (see AB/AC).

## K. Team creation

- **Routes:** `/admin/teams`, `/admin/teams/create`, `/admin/teams/[id]`.
- **Action:** `createTeam` → RPC `create_balanced_team` (004→005, re-issued 007).
- **Tables:** `teams`, `team_members`, `team_educators`.
- **Status:** `complete`. **Commit:** `f4ec16d` (+`e92acfd`). Browser:
  VERIFIED_BROWSER_REPORTED (fixture teams created via RPC).

## L. Team educator mapping

- **Mechanism:** `team_educators` rows written by `create_balanced_team`;
  matching rule `team_educators.student_id = portfolio_outputs.leader_student_id`.
- **Status:** `complete`. DB: VERIFIED_DATABASE_SCHEMA.

## M. Stage board

- **Route:** `/admin/stages`. **Status:** `complete`. **Commit:** `e31fad8`.
- Browser: VERIFIED_BROWSER_REPORTED.

## N. Stage journey start

- **Action:** `startTeamStageJourney` → RPC `start_team_stage_journey` (007).
- **Status:** `complete`. Browser: VERIFIED_BROWSER_REPORTED (seed uses it).

## O. BMS completion

- **Action:** `completeBmsSession` → RPC `complete_bms_session` (006→006a).
- **Status:** `complete`. Known history: seed utility passed a future date
  (fixed 2026-07-14, commit `d22b3b8` region, fix uncommitted?—fix was in
  `d22b3b8`'s file and later amended in working tree; see AJ).
- Browser: VERIFIED_BROWSER_REPORTED.

## P. Portfolio initialization

- **Mechanism:** `start_team_stage_journey` creates three sequential
  `portfolio_outputs` (photographer/makeup_artist/hairstylist) with
  `uq_team_one_active_portfolio` guard.
- **Status:** `complete`. DB: VERIFIED_DATABASE_SCHEMA.

## Q. Studio booking

- **Routes:** `/student/portfolio` booking panel; RPCs
  `get_studio_slot_availability`, `book_studio_slot` (008→009).
- **Action:** `bookStudioSlot`. **Tables:** `studio_bookings`,
  `studio_slot_occupancy`.
- **Status:** `complete_with_bug` — feature works
  (VERIFIED_BROWSER_REPORTED) but `npm run lint` reports 2 **errors**
  (`react-hooks/set-state-in-effect`) in
  `src/components/studio/StudioBookingPanel.tsx:51` and
  `src/hooks/useStudioAvailability.ts:29`. Runtime impact: extra render
  cascades; no functional failure reported. **Commit:** `e92acfd`.
- **Next action:** refactor the two effects (post-audit).

## R. Studio occupancy Realtime

- **Code:** `useStudioAvailability` subscribes via
  `supabase.channel("studio-occupancy-<date>")` on `postgres_changes`
  (VERIFIED_LOCAL_CODE).
- **Status:** `complete` locally; whether the `studio_slot_occupancy` table
  is in the remote Realtime publication is **UNKNOWN** (checked by audit
  script 001).

## S. Admin studio schedule

- **Route:** `/admin/studio-schedule`. **Status:** `complete`. Browser:
  VERIFIED_BROWSER_REPORTED.

## T. Student My Team

- **Route:** `/student/my-team`. **Status:** `complete`. **Commit:** `e92acfd`.

## U. Student My Stage

- **Route:** `/student/my-stage` + `TeamStageTimeline`.
- **Status:** `complete_with_bug` → repaired in working tree, **uncommitted**.
  `TeamStageTimeline.tsx` is modified (Stage 3 sync repair). Browser
  re-verification of the repair is pending.

## V. Portfolio submission

- **Route:** `/student/portfolio`. **Action:** `submitPortfolio` → RPC
  `submit_portfolio` (010). **Commit:** `f8f3b28`.
- **Status:** `complete`. Browser: VERIFIED_BROWSER_REPORTED.

## W. Educator portfolio review (Package D2)

- **Routes:** `/educator/dashboard`, `/educator/my-teams`,
  `/educator/my-students`, `/educator/portfolio-reviews[/[portfolio-id]]`.
- **Action:** `reviewPortfolioAsEducator` → RPC `review_portfolio_as_educator`
  (011). **Commit:** `0ef09bf` (+ RLS-safe loader repair in same lineage).
- **Status:** `complete`. Browser: VERIFIED_BROWSER_REPORTED (educator
  approve flow ran on Team Alpha Photography).
- **Caveat:** the backing RPC lives in **uncommitted** migration 011.

## X. Admin portfolio review (Package D3)

- **Routes:** `/admin/portfolio-approvals`, `/admin/portfolio-approvals/[portfolio-id]`,
  dashboard integration. **Action:** `reviewPortfolioAsAdmin` → RPC
  `review_portfolio_as_admin` (011→012). **Commit:** `d87efb5` (HEAD).
- **Status:** `complete` — with the **eligibility compatibility repair
  uncommitted** (`src/lib/data/admin/portfolio-approval-eligibility.ts` is
  untracked; without it the committed code would wrongly block Admin-routed
  revision resubmissions).
- Browser: VERIFIED_BROWSER_REPORTED (Admin approved Team Alpha Photography;
  sequential unlock observed: Makeup → awaiting_booking).

## Y. Student revision / resubmission (Package D4)

- **Backend:** RPC `resubmit_portfolio` exists (011, uncommitted).
- **Frontend:** `not_started`. Revision statuses are displayed read-only.
- **Next action:** D4 after commits + Stage 3 repair verification.

## Z. Stage 3 → Stage 4 transition

- **Backend:** implemented inside `review_portfolio_as_admin` (third approval
  completes Stage 3, starts Stage 4, bumps `current_stage_number`).
- **Status:** `partial` — backend complete (VERIFIED_LOCAL_CODE, uncommitted
  migration), never exercised end-to-end (fixture has not reached
  Hairstyling approval). No Stage 4 UI exists.

## AA. Stage 4 project creation — `not_started` (Package E; `projects` table exists unused).
## AB. External-member assignment — `not_started` (`project_assignments` unused; external portal is a stub with 3 dead nav links).
## AC. Project views — `not_started`.
## AD. Three Educator project approvals — `not_started` (`project_approvals` unused).
## AE. Admin project approval — `placeholder` (`/admin/project-approvals` placeholder page committed in `0ffd53b`).
## AF. Stage 5 unlock — `not_started`.

## AG. Notifications

- **Status:** `deferred` — tables exist (001), `/admin/notifications` is a
  placeholder, `/external/notifications` nav link 404s. No write path.

## AH. Activity logs

- **Status:** `deferred` — `activity_logs` table exists; docs explicitly
  defer all writes "until shared logging exists"; `/admin/activity-logs` is a
  placeholder.

## AI. Manual payment status

- **Status:** `partial` — `payment_status` set at user creation
  (`CreateUserForm`) and displayed on `/admin/students`; **no edit UI** to
  change it later.

## AJ. Test reset/seed utility

- **File:** `scripts/reset-and-seed-test-environment.mjs`. **Commit:**
  `d22b3b8` (committed & pushed, including the BMS-yesterday date fix).
- **Safety (VERIFIED_LOCAL_CODE):** dry-run default; destructive path
  requires `--confirm-reset`; backup to `tmp/test-reset-backups` (gitignored);
  full wipe-and-recreate on rerun; BMS date = yesterday Asia/Kolkata with
  local pre-assert; service-role used only in this server-side script;
  `TEST_CREDENTIALS.local.md` gitignored.
- **Status:** `complete`.

## AK. Deployment — `not_started` (no `.vercel`, no deploy config; see DEPLOYMENT_READINESS.md).
## AL. CI/CD — `not_started` (no `.github/`, no workflows).
## AM. Monitoring / error tracking — `not_started` (no Sentry or equivalent; only `console.error` loader logging).

---

## Totals

| Status | Count | Features |
|---|---|---|
| complete | 20 | B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, R, S, T, V, AJ |
| complete_with_bug | 2 | Q (lint errors in booking effects), U (repaired, uncommitted, unverified) |
| partial | 3 | A (doc drift), Z (backend only), AI (no edit UI) |
| placeholder | 2 | AE, AG-admin page (AG counted under deferred) |
| not_started | 9 | AA, AB, AC, AD, AF, AK, AL, AM, Y |
| deferred | 2 | AG, AH |
| removed | 0 | — (Institute Admin role was descoped in planning, not removed from code — it never existed in code) |

W and X are counted `complete` with the explicit caveat that their backend
SQL (migrations 011/012, policy 006) and the D3 eligibility repair are
**uncommitted**, which is the top repository risk.
