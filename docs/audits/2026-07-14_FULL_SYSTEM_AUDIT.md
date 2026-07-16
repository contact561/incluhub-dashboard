# IncluHub Education Management Dashboard — Full System Reconciliation Audit

**Date:** 2026-07-14
**Repository:** `C:\Users\LENOVO\Desktop\inclu_education\incluhub-dashboard`
**Type:** Audit and documentation only. No product code, migrations, policies,
RPCs, or seed logic was modified. No SQL executed. Nothing committed or pushed.

Companion documents produced by this audit:

- `docs/audits/FEATURE_REGISTRY.md`
- `docs/audits/ROUTE_REGISTRY.md`
- `docs/audits/DATABASE_REGISTRY.md`
- `docs/audits/DEPLOYMENT_READINESS.md`
- `supabase/scripts/audit/001_schema_security_audit.sql`
- `supabase/scripts/audit/002_workflow_integrity_audit.sql`
- `supabase/scripts/audit/003_fixture_state_audit.sql`
- `supabase/scripts/audit/004_role_visibility_audit.sql`

### Audit script repair (same day)

The four SQL audit scripts were repaired after first-run failures against the
actual schema:

| Failure | Root cause | Fix |
|---|---|---|
| 001 | Queried `supabase_migrations.schema_migrations` (absent when migrations applied via SQL editor) | Replaced with `to_regclass(...)` presence check + `expected_tables` inventory; added comment that NULL ledger is not proof migrations were skipped |
| 002–004 | Used `teams.name` (column does not exist) | Replaced with `teams.team_name` |
| 002 | Used `students.category`, `team_members.status` | Replaced with `students.student_category`, `team_members.member_status` |
| 003 | Used nonexistent `studio_bookings.booking_date` / `slot_number` / `status` | Join `studio_slot_occupancy` for `booking_date` and `slot_code`; use `booked_at` |
| 004 | Used PL/pgSQL `DO` blocks | Replaced with `set_config('request.jwt.claims', …)` + `SET LOCAL role` inside `BEGIN`/`ROLLBACK`; added `test_user_not_found` diagnostics |

All four scripts remain SELECT-only (plus transaction-local role/JWT simulation
in 004).

Evidence classifications used throughout: VERIFIED_LOCAL_CODE,
VERIFIED_LOCAL_GIT, VERIFIED_BUILD, VERIFIED_DATABASE_SCHEMA,
VERIFIED_REMOTE_DATABASE, VERIFIED_BROWSER_REPORTED, DOCUMENTED_PLAN,
INFERRED, UNKNOWN.

---

## 1. Executive verdict

The MVP has advanced through Package D3 with a working sequential Stage 3
review workflow, but the repository is in an **inconsistent, unsafe-to-lose
state**: the entire Package D1 database backend (migrations 011/012, policy
006) and two significant frontend repairs (Stage 3 synchronization, D3
admin-revision eligibility) exist **only in the uncommitted working tree**,
while the remote development database already runs that schema. A machine
failure today would lose the only copy of the applied schema definition.

Type-check and production build pass; lint fails with 2 errors. Remote
database state could not be verified (Supabase CLI unlinked) — all remote
claims are VERIFIED_BROWSER_REPORTED or DOCUMENTED_PLAN, never
VERIFIED_REMOTE_DATABASE.

**The single most important next step is not new feature work: it is
verifying the Stage 3 repair in the browser, then committing the uncommitted
schema and repair files.** After that, Package D4 (student resubmission) is
the correct next development package.

## 2. Current repository identity

| Item | Value | Evidence |
|---|---|---|
| Toplevel | `C:/Users/LENOVO/Desktop/inclu_education/incluhub-dashboard` | VERIFIED_LOCAL_GIT |
| Package name | `incluhub-temp` v0.1.0 (private) | VERIFIED_LOCAL_CODE |
| Remote | `https://github.com/preetamnaik3-cpu/incluhub-dashboard.git` | VERIFIED_LOCAL_GIT |
| Tracked files | 228 | VERIFIED_LOCAL_GIT |

## 3. Current Git state (VERIFIED_LOCAL_GIT)

- **Branch:** `master`, upstream `origin/master`, **0 ahead / 0 behind**.
- **HEAD:** `d87efb5` — "Add Package D3 admin portfolio approval frontend" — pushed.
- **Working tree: DIRTY.** No staged files.

**Modified (10):** `src/app/student/dashboard/page.tsx`,
`src/app/student/portfolio/page.tsx`,
`src/components/stages/TeamStageTimeline.tsx`,
`src/components/studio/PortfolioCard.tsx`,
`src/components/studio/SubmittedPortfolioCard.tsx`,
`src/lib/constants/stage-labels.ts`, `src/lib/data/student/portfolio.ts`,
`src/types/database.ts`, `src/types/student-portal.ts`,
`src/types/studio-booking.ts` — all belong to the **Stage 3 synchronization
repair** (except `src/types/database.ts`, which also carries Package D1 type
additions).

**Untracked (9 paths):**

| Path | Belongs to |
|---|---|
| `src/components/student/` (Stage3PortfolioPanels.tsx) | Stage 3 sync repair |
| `src/lib/data/student/dashboard.ts` | Stage 3 sync repair |
| `src/lib/portfolio/workflow-status.ts` | Stage 3 sync repair (canonical status helper) |
| `src/lib/data/admin/portfolio-approval-eligibility.ts` | D3 eligibility repair |
| `supabase/migrations/011_portfolio_review_workflow.sql` | **Package D1 backend — never committed** |
| `supabase/migrations/012_fix_admin_review_status_ambiguity.sql` | **Package D1 repair — never committed** |
| `supabase/policies/006_portfolio_review_rls.sql` | **Package D1 RLS — never committed** |
| `supabase/scripts/verify_package_d.sql`, `verify_package_d_rpc.sql` | D1 verification — never committed |

**Package commit boundaries:** Foundation `69f31d4`→`8df096e`; Auth
`7b449c2`; Package A `4fa8e76`/`f4ec16d`/`e31fad8`; A.1/B/B.1 `e92acfd`;
C `f8f3b28`; D2 `0ef09bf`; reset utility `d22b3b8`; D3 `d87efb5`.

**D1 committed? NO** (SQL untracked). **D2 committed? YES** (`0ef09bf`,
pushed). **D3 committed? PARTIALLY** (`d87efb5` pushed, but the eligibility
repair that makes admin-routed revisions reviewable is untracked).

**Secret/backup safety:** `.env.local`, `TEST_CREDENTIALS.local.md`, and
`tmp/test-reset-backups` are all confirmed gitignored (`git check-ignore`);
`git ls-files ".env*"` is empty; no credential/backup file is tracked.
`git diff --check` reports no whitespace errors (LF→CRLF warnings only,
consistent with `core.autocrlf` on Windows).

## 4. Current build state (VERIFIED_BUILD, run 2026-07-14)

| Check | Result |
|---|---|
| `npx tsc --noEmit` | **PASS** |
| `npm run build` | **PASS** — 34 routes, middleware compiled |
| `npm run lint` | **FAIL** — 2 errors, 6 warnings |
| `git diff --check` | PASS |

Lint errors (both `react-hooks/set-state-in-effect`):
`src/components/studio/StudioBookingPanel.tsx:51`,
`src/hooks/useStudioAvailability.ts:29`. Warnings: unused imports/vars in 4
files (see FEATURE_REGISTRY §Q and lint output).

Toolchain: **Next.js 16.2.10**, **React 19.2.4**, **TypeScript 5.9.3**,
**@supabase/supabase-js 2.110.2**, **@supabase/ssr 0.12.0**, Tailwind 4,
ESLint 9. Scripts: `dev`, `build`, `start`, `lint`, `test:reset`. **No test
framework installed.** Deprecation: Next 16 `middleware` → `proxy` file
naming. Environment validation is ad-hoc inside the Supabase client
factories; service-role key is referenced only in `src/lib/supabase/admin.ts`
(server-only) and the Node reset script.

## 5. Product-plan summary (DOCUMENTED_PLAN)

Roles: admin, student, educator, external_member (Institute Admin descoped —
never implemented in code). Stage flow: 0 Onboarding → 1 Team Assignment →
2 BMS Session → 3 Sequential Portfolio Production → 4 Brand/Creative Project
→ 5 Ecosystem Unlock. Stage 3 is sequential per discipline
(Photography → Makeup → Hairstyling), each portfolio owned by its category
leader with booking-before-submission and Educator → Admin review.
Package sequence: Foundation, A, A.1, B, B.1, C, D1–D4, E.

## 6. Feature completion matrix

Full detail in `FEATURE_REGISTRY.md`. Totals across groups A–AM:

| Status | Count |
|---|---|
| complete | 20 |
| complete_with_bug | 2 (Q studio booking lint errors; U My Stage — repaired but uncommitted/unverified) |
| partial | 3 (A docs drift; Z Stage 3→4 backend-only; AI payment status no edit UI) |
| placeholder | 2 (AE admin project approvals; AG admin notifications page) |
| not_started | 9 (Y/D4, AA, AB, AC, AD, AF, AK, AL, AM) |
| deferred | 2 (AG notifications feature, AH activity logs) |
| removed | 0 |

## 7. Package completion matrix

| Package | Scope | Status | Committed | Evidence |
|---|---|---|---|---|
| Foundation | setup, schema, RLS, clients | complete | yes | VERIFIED_LOCAL_GIT |
| A | users/institutes/programs/teams/stages/BMS | complete | yes | VERIFIED_BROWSER_REPORTED |
| A.1 | cross-institute programs, enrolment, balanced teams | complete | yes | VERIFIED_BROWSER_REPORTED |
| B | stage journey + portfolio init | complete | yes | VERIFIED_BROWSER_REPORTED |
| B.1 | studio booking + Realtime occupancy | complete (2 lint errors) | yes | VERIFIED_BROWSER_REPORTED |
| C | portfolio submission | complete | yes | VERIFIED_BROWSER_REPORTED |
| D1 | review backend (SQL) | complete in files; applied to dev DB per docs | **NO — untracked** | VERIFIED_LOCAL_CODE / VERIFIED_BROWSER_REPORTED |
| D2 | educator review frontend | complete | yes (`0ef09bf`) | VERIFIED_BROWSER_REPORTED |
| D3 | admin approval frontend | complete | **partially** (`d87efb5` + untracked eligibility repair) | VERIFIED_BROWSER_REPORTED |
| D4 | student resubmission frontend | **not_started** | — | VERIFIED_LOCAL_CODE |
| E | Stage 4/5 projects | **not_started** (placeholder routes + unused tables) | placeholders committed | VERIFIED_LOCAL_CODE |

## 8. Route and navigation matrix

Full detail in `ROUTE_REGISTRY.md`. Summary: 34 routes; 30 real, 3 admin
placeholders (`project-approvals`, `notifications`, `activity-logs`), 1
external stub. **3 dead nav links (404) for external members:**
`/external/assigned-team`, `/external/project-details`,
`/external/notifications`. No admin/student/educator nav 404s. No mock data.
No role leakage found in code.

## 9. Database/migration matrix

Full detail in `DATABASE_REGISTRY.md`. 13 migrations (001–012 + 006a), 5
policy files (002–006). Supersessions: 004→005 (`create_balanced_team`),
006→006a (`complete_bms_session`), 008→009 (`book_studio_slot`), 011→012
(`review_portfolio_as_admin`). 23 tables: 18 canonical runtime, 1 deprecated
(`portfolio_approvals`), 7 created-but-unused (Package E + notifications +
activity logs + `portfolio_participants`). **Migrations 011/012 and policy
006 are untracked in Git.**

## 10. RPC matrix

All 14+ functions are `SECURITY DEFINER` with pinned `search_path`, REVOKE
statements for anon/PUBLIC, caller-role and active-profile validation, and
`SELECT … FOR UPDATE` row locking in workflow paths (VERIFIED_LOCAL_CODE from
migration sources; remote grants UNKNOWN until audit script 001 is run).

| RPC | Migration | Validation highlights |
|---|---|---|
| `create_balanced_team` | 004→005 (re-issued 007) | admin-only; category balance; enrollment checks |
| `start_team_stage_journey` | 007 | admin-only; creates stage progress + 3 sequential portfolios; `uq_team_one_active_portfolio` |
| `complete_bms_session` | 006→006a | admin-only; rejects future session dates |
| `get_studio_slot_availability` | 008 | read-only availability |
| `book_studio_slot` | 008→009 | leader-only; occupancy conflict handling (009 repair) |
| `submit_portfolio` | 010 | leader-only; version 1; immutable submission row |
| `review_portfolio_as_educator` | 011 | matching-educator rule via `is_matching_portfolio_leader_educator`; unique (submission, stage) review |
| `review_portfolio_as_admin` | 011→012 | admin-only; entry-path validation (educator-approved OR admin-revision chain); sequential unlock; Stage 3→4 |
| `resubmit_portfolio` | 011 | leader-only; contiguous version increment; routes to educator/admin per `revision_return_to` |

**Direct workflow writes from app code: none found.** All mutations to
`teams`, `team_stage_progress`, `portfolio_outputs`, `portfolio_submissions`,
`portfolio_reviews`, `studio_bookings`, `studio_slot_occupancy` go through
RPCs (grep-verified). The only direct-table writes are `createUser` /
`createInstitute` / `enrollStudents` admin actions on non-workflow tables
(users/institutes/enrollments), with `createUser` using the server-only
service-role client by design.

## 11. RLS/security matrix

From local policy files (VERIFIED_LOCAL_CODE); remote enforcement UNKNOWN
until scripts 001/004 are run.

Permission expectations by principal:

| Principal | teams | portfolio_outputs | portfolio_submissions | portfolio_reviews | mutations |
|---|---|---|---|---|---|
| admin | all | all | all | all | via RPCs + admin actions |
| matching student leader | own team | own team's | own team's | own team's | book/submit/resubmit RPCs (own portfolio only) |
| student assistant (same team) | own team | own team's (read) | read | read | none |
| unrelated student | none | none | none | none | none |
| matching educator (team_educators) | mapped teams | mapped-leader portfolios | mapped | mapped | `review_portfolio_as_educator` only |
| unrelated educator | none | none | none | none | none |
| external member | assigned project team only (Package E; unused) | none | none | none | none |
| inactive profile | RPCs reject via active-profile checks | — | — | — | blocked in RPCs |
| anon | none (REVOKEs + RLS) | none | none | none | none |

Findings by severity:

| Sev | Finding |
|---|---|
| **CRITICAL** | None in code. (The process-level critical risk is the uncommitted schema — Git issue, not RLS.) |
| **HIGH** | Remote RLS/grants never independently verified (no VERIFIED_REMOTE_DATABASE evidence). Run audit scripts 001 + 004. |
| **MEDIUM** | D2 educator loaders were RLS-blocked on `profiles` joins (worked around with stepwise queries); indicates educator→student profile read policy is absent — student names show as category labels. Revisit policy design. |
| **MEDIUM** | Legacy `portfolio_approvals` retains SELECT for authenticated users; harmless but should eventually be dropped. |
| **LOW** | No env-schema validation; lint errors in booking components; `middleware`→`proxy` deprecation. |
| **INFO** | Route param naming inconsistency; policies numbering starts at 002. |

Verified positives: service-role key confined to one server-only module +
reset script; immutable `portfolio_reviews`/`portfolio_submissions` (no
UPDATE/DELETE paths); all SECURITY DEFINER functions pin `search_path`;
REVOKE anon/PUBLIC present in every RPC migration.

## 12. Current remote-database knowledge

**VERIFIED_REMOTE_DATABASE: nothing.** Supabase CLI 2.107.0 is installed but
the project is not linked (`npx supabase migration list` → "Cannot find
project ref"). All migrations were applied manually via the SQL editor
(DOCUMENTED_PLAN). Working D2/D3 browser flows imply 011/012/policy-006 are
applied (VERIFIED_BROWSER_REPORTED, INFERRED for exact object state). The
four scripts in `supabase/scripts/audit/` provide the verification path; they
were **not executed** per audit rules.

## 13. Stage 3 synchronization defect (dedicated section)

**Canonical rules confirmed in schema and RPCs (VERIFIED_LOCAL_CODE):** three
separate `portfolio_outputs` per team (sequence 1 photographer, 2
makeup_artist, 3 hairstylist), each with its own leader
(`leader_student_id`), booking, submission chain (scoped by
`portfolio_output_id`), review chain (scoped by `portfolio_submission_id`),
and workflow status. Educator matching uses
`team_educators.student_id = portfolio_outputs.leader_student_id`.

**The defect (reported in browser 2026-07-14):** after Photography was
Admin-approved on Team Alpha, the Makeup student's dashboard showed
"Educator needs to approve" although the Makeup portfolio was
`awaiting_booking` and unsubmitted.

**Exact defective files (as committed at HEAD `d87efb5`):**

1. `src/components/studio/SubmittedPortfolioCard.tsx` — hardcoded
   "Pending Educator Review" text for any surfaced portfolio regardless of
   `workflow_status`.
2. `src/lib/data/student/portfolio.ts` — did not separate the logged-in
   student's own portfolio (`leader_student_id = current student`) from the
   team's active portfolio; the team's active/first portfolio state could be
   presented as the student's own.
3. `src/lib/constants/stage-labels.ts` +
   `src/components/studio/PortfolioCard.tsx` +
   `src/components/stages/TeamStageTimeline.tsx` — duplicated,
   partially-contradictory status-label logic instead of a single helper.

**Repair state:** a repair exists **in the uncommitted working tree**: new
canonical helper `src/lib/portfolio/workflow-status.ts`, new loader
`src/lib/data/student/dashboard.ts` and `Stage3PortfolioPanels.tsx`
separating `ownPortfolioOutput` / `teamPortfolioProgress` /
`activeTeamPortfolio`, and updates to the five files above. tsc and build
pass with the repair applied (VERIFIED_BUILD). **Browser verification of the
repair is pending** — expected UI per role (Photography student: completed,
no action; Makeup student: Book Studio, no educator message; Hairstyling
student: locked; no educator has a Team Alpha pending review) has not been
re-tested since the repair.

Educator loaders were audited for the failure patterns and are clean:
queue matching uses team + leader-student + `pending_educator`; no
category-only or team-only matching; submission history is scoped by
`portfolio_output_id` everywhere (grep-verified).

## 14. Test-fixture health

`scripts/reset-and-seed-test-environment.mjs` (committed `d22b3b8`, pushed):
dry-run default; destructive path requires `--confirm-reset`; JSON backups to
gitignored `tmp/test-reset-backups`; full wipe-and-recreate rerun strategy
(safe after partial failure); BMS session date = yesterday in Asia/Kolkata
with a local `<= today` assertion (future-date bug fixed); strong final
assertions on portfolio statuses; service-role used server-side only;
credentials file gitignored.

Seeded expectation: Team Alpha — Photography `pending_educator`, Makeup/Hair
`locked`; Team Beta — Photography `completed`, Makeup `pending_educator`,
Hair `locked`; both Stage 3. **Current live state has drifted from the seed**
via interactive testing: Team Alpha Photography was Educator- and
Admin-approved, so Alpha should now be Photography `completed` / Makeup
`awaiting_booking` / Hair `locked` (VERIFIED_BROWSER_REPORTED; confirm with
audit script 003).

## 15. Documentation drift

| Drift | Location | Reality |
|---|---|---|
| Contradictory D3 rows: "D3 … Implemented" and "D3 Admin frontend: Not started" in the same status table | `docs/IMPLEMENTATION_PROGRESS.md` | D3 is implemented (`d87efb5`) |
| D1 header says "Not applied to Supabase" | `IMPLEMENTATION_PROGRESS.md` | Later browser flows imply applied; status text never updated |
| Stage 3 sync repair and D3 eligibility repair undocumented | all docs | both exist in working tree |
| Old parallel-portfolio wording vs sequential flow | planning docs (`Product_Master.md` lineage) | sequential is canonical since Package B/C |
| `portfolio_approvals` still described as active approval mechanism | `Database_Plan.md` | deprecated by D1; `portfolio_reviews` is canonical |
| Institute Admin role appears in early planning docs | `Product_Master.md`/`User_Flows.md` | descoped; never in code |
| External member portal described as functional screens | `Screen_Structure.md` | stub + 3 dead nav links |
| Educator described as read-only in early docs | planning docs | educators now approve/reject portfolios (D2) |

### Maneuvers and Decisions

| Date (best evidence) | Old decision | New decision | Reason | Affected | Docs updated? |
|---|---|---|---|---|---|
| pre-Foundation | Institute Admin role | 4-role MVP (admin/student/educator/external) | scope reduction | schema `user_role`, guards | partially |
| Package A.1 (`e92acfd`) | single-institute programs, `create_balanced_team` v1 (004) | cross-institute programs + enrollments, RPC v2 (005) | product requirement | programs, teams | yes |
| Package B (006→006a) | first `complete_bms_session` | repaired RPC (006a) | validation bug | BMS flow | yes |
| Package B.1 (008→009) | first `book_studio_slot` | conflict-safe rebook (009) | double-booking bug | studio booking | yes |
| Package C/D0 | `portfolio_approvals` table as approval store | immutable `portfolio_reviews` keyed to submissions | versioned review chains | D1 schema | D1 section yes; older docs no |
| 2026-07-14 (D3 repair, uncommitted) | Admin review requires Educator approval on latest submission | Admin-routed revision chain also valid entry path | matched RPC 011/012 semantics | D3 loaders/types/components | **no** |
| 2026-07-14 (reset fix, `d22b3b8`) | BMS seeded with "tomorrow" (future in IST) | BMS = yesterday Asia/Kolkata + local assert | `complete_bms_session` rejected future dates | reset utility | yes |
| 2026-07-14 (Stage 3 repair, uncommitted) | per-component status text; team-active portfolio as own | canonical `workflow-status.ts` helper; own vs team separation | Makeup student saw wrong status | 14 files | **no** |

## 16. Maneuvers and scope changes — see §15 table (consolidated there).

## 17. Deployment readiness

**NOT_READY.** Full analysis in `DEPLOYMENT_READINESS.md`. Headlines: no
hosting/CI/monitoring exists; single shared dev Supabase project; remote
schema applied outside any migration ledger; uncommitted schema files; lint
gate failing.

## 18. Critical blockers

1. **Uncommitted Package D1 SQL** (`011`, `012`, policy `006`) — the applied
   remote schema's only definition is untracked local files. Risk of
   permanent loss. (VERIFIED_LOCAL_GIT)
2. **Uncommitted D3 eligibility repair + Stage 3 sync repair** — HEAD alone
   contains the known Stage 3 status bug and the admin-revision blocking bug;
   any fresh clone reintroduces both.

## 19. High-priority issues

1. Stage 3 repair not yet browser-verified (defect officially still open
   until verified).
2. Remote database never independently verified; CLI unlinked; no migration
   ledger (run audit scripts 001–004).
3. Three dead `/external/*` navigation links return 404 for external users.
4. `npm run lint` fails (2 `react-hooks/set-state-in-effect` errors) — will
   block any CI lint gate.
5. `docs/IMPLEMENTATION_PROGRESS.md` contradicts itself on D3 status.

## 20. Medium/low issues

- MEDIUM: educator cannot read student profile names (RLS gap workaround
  shows category labels); decide on a scoped profile-read policy.
- MEDIUM: deprecated `portfolio_approvals` still present with SELECT grants.
- MEDIUM: no test framework/automated tests at all.
- LOW: 6 lint warnings (unused imports); env validation ad-hoc; Next 16
  `middleware`→`proxy` deprecation; `006a` numbering; `[id]` vs
  `[portfolio-id]` param naming; package name still `incluhub-temp`.

## 21. Exact remaining MVP backlog

1. Verify + commit Stage 3 sync repair, D3 eligibility repair, D1 SQL (no new
   code — verification and commits).
2. **Package D4** — student revision/resubmission frontend (backend RPC
   `resubmit_portfolio` ready): revision notice with comments, resubmission
   form, version history, educator-route vs admin-route return paths.
3. Full Stage 3 sequence verification: Makeup booking → submission → educator
   → admin; Hairstyling likewise; Stage 3 → 4 transition observed end-to-end.
4. **Package E** — Stage 4 project creation, external-member assignment,
   project views, 3-educator + admin project approvals, Stage 5 unlock; plus
   external portal routes (or descope decision + nav cleanup).
5. Deferred subsystems decision: notifications, activity logs, payment-status
   editing.
6. Deployment track: fix lint errors, CI, hosting, staging Supabase, per
   `DEPLOYMENT_READINESS.md` gates.

## 22. Recommended implementation order (evidence-based)

1. **Browser-verify the Stage 3 repair** with the three Team Alpha students +
   three educators (checklist in §13). It is uncommitted and unverified —
   committing unverified or discarding it are both worse options.
2. **Commit in coherent units:** (a) D1 SQL + verify scripts; (b) D3
   eligibility repair; (c) Stage 3 sync repair. Push.
3. **Link Supabase CLI and run audit scripts 001–004** to convert remote
   claims from UNKNOWN/REPORTED to VERIFIED_REMOTE_DATABASE.
4. **Package D4** (student resubmission) — the only missing piece of the
   Stage 3 loop; unblocks full-sequence testing.
5. Full-sequence Stage 3→4 verification (needs D4 for revision paths).
6. Lint fixes + minimal CI.
7. Package E or explicit descope; external nav cleanup either way.

Rationale: D4 is *not* first because a known integration defect repair is
sitting uncommitted; sequencing new work on top of an unverified dirty tree
compounds risk.

## 23. Before staging

Items 1–3 + 6 above, plus a separate staging Supabase project with
migrations applied from Git, hosting provisioning, and env-var separation
(details: `DEPLOYMENT_READINESS.md` §8).

## 24. Before production

Staging list plus: D4 complete and verified, Package E or formal descope,
monitoring/alerting, backup + rollback policy, branch protection, privacy/
legal review for student data, production Supabase project and data
migration process.

## 25. Exact next development package

**Package D4 — Student revision/resubmission frontend** — but only after the
verify-and-commit sequence in §22 steps 1–3. Backend (`resubmit_portfolio`,
revision routing, D3 admin re-review path) is already in place, making D4 a
pure frontend vertical slice: revision banner with reviewer comments,
resubmission form calling `resubmit_portfolio`, version history display, and
correct return-path handling (educator vs admin).
