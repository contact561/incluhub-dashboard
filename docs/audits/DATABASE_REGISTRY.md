# Database File Registry — Audit 2026-07-14

Audit-only document. No SQL was applied or modified.

Evidence base: file inventory and source inspection of `supabase/migrations/`,
`supabase/policies/`, `supabase/scripts/` (VERIFIED_LOCAL_CODE /
VERIFIED_DATABASE_SCHEMA where the schema is defined in local files), plus Git
tracking status (VERIFIED_LOCAL_GIT). The **remote** database state is
UNKNOWN in this audit — the Supabase CLI is not linked, and no SQL was
executed. Applied-to-remote claims below come from
`docs/IMPLEMENTATION_PROGRESS.md` and prior browser sessions
(DOCUMENTED_PLAN / VERIFIED_BROWSER_REPORTED).

`supabase/seed/` does not exist. Seeding is performed by
`scripts/seed/reset-and-seed-test-environment.mjs` (Node, service-role).

---

## 1. Migrations (`supabase/migrations/`)

| # | File | Purpose | Depends on | Git status |
|---|---|---|---|---|
| 001 | `001_initial_schema.sql` | Full initial schema: 7 enums, 21 tables, `set_updated_at()` trigger fn | — | committed |
| 002 | `002_table_grants.sql` | Baseline table grants | 001 | committed |
| 003 | `003_fix_rls_recursion.sql` | 6 SECURITY DEFINER helper functions to break RLS recursion (`is_external_assigned_to_team`, `is_educator_assigned_to_team`, etc.) | 001–002 | committed |
| 004 | `004_create_balanced_team.sql` | First `create_balanced_team` RPC | 001–003 | committed — **superseded by 005** |
| 005 | `005_cross_institute_program_teams.sql` | `program_institutes`, `program_enrollments` tables; `create_program_with_institutes`; **replaces** `create_balanced_team`; enrollment helpers | 004 | committed |
| 006 | `006_stage_bms_foundation.sql` | `portfolio_workflow_status` enum; stage/BMS foundation; first `complete_bms_session` | 005 | committed — RPC **superseded by 006a** |
| 006a | `006a_fix_complete_bms_session_rpc.sql` | Repair of `complete_bms_session` | 006 | committed — **off-pattern numbering** (letter suffix) |
| 007 | `007_team_stage_journey_enrollment.sql` | `start_team_stage_journey` RPC; portfolio initialization; re-issues `create_balanced_team` | 006a | committed |
| 008 | `008_studio_bookings.sql` | `studio_slot_occupancy`, `studio_bookings` tables; `get_studio_slot_availability`; first `book_studio_slot` | 007 | committed — booking RPC **superseded by 009** |
| 009 | `009_fix_studio_booking_conflict.sql` | Repair of `book_studio_slot` (conflict handling) | 008 | committed |
| 010 | `010_portfolio_submission.sql` | `portfolio_submissions` table; `submit_portfolio` RPC | 009 | committed |
| 011 | `011_portfolio_review_workflow.sql` | Package D1: 3 review enums, immutable `portfolio_reviews` table, `revision_return_to` column + CHECK, `is_matching_portfolio_leader_educator`, `review_portfolio_as_educator`, `review_portfolio_as_admin`, `resubmit_portfolio`, legacy `portfolio_approvals` write revocation | 010 | **UNTRACKED — never committed** |
| 012 | `012_fix_admin_review_status_ambiguity.sql` | Repair of `review_portfolio_as_admin` (status ambiguity) | 011 | **UNTRACKED — never committed** |

Numbering conflicts: none duplicated, but `006a` breaks the pure-numeric
convention, and repair-migration style is inconsistent (`006a_fix…` vs
`009_fix…`/`012_fix…`).

**Critical Git gap (VERIFIED_LOCAL_GIT):** the entire Package D1 backend
(`011`, `012`) exists only in the working tree. If applied to the remote
database (as documented), the remote schema currently exceeds what Git
history describes.

## 2. Policies (`supabase/policies/`)

| File | Purpose | Git status |
|---|---|---|
| `002_rls_policies.sql` | Initial RLS policy set for all 001 tables | committed |
| `003_stage_management_rls.sql` | Stage/BMS-related RLS | committed |
| `004_studio_booking_rls.sql` | Studio occupancy/booking RLS (read paths; mutations RPC-only) | committed |
| `005_portfolio_submission_rls.sql` | `portfolio_submissions` RLS (SELECT paths; writes RPC-only) | committed |
| `006_portfolio_review_rls.sql` | `portfolio_reviews` SELECT-only RLS (D1) | **UNTRACKED — never committed** |

Note: there is no `001_*.sql` in `policies/` — policy numbering starts at 002
to mirror migration pairing, which is a naming quirk (INFO).

## 3. Scripts (`supabase/scripts/`)

| File | Purpose | Git status |
|---|---|---|
| `verify_clean_database.sql` | Read-only clean-state verification | committed |
| `reset_test_data.sql` | SQL test-data reset (predates Node utility) | committed |
| `audit_test_data_before_reset.sql` | Pre-reset audit | committed |
| `verify_package_a.sql` / `verify_package_a_rpc.sql` | Package A static + RPC verification | committed |
| `verify_package_a1.sql` / `verify_package_a1_rpc.sql` | Package A.1 verification | committed |
| `verify_package_b.sql` / `verify_package_b_rpc.sql` | Package B verification | committed |
| `verify_package_c.sql` / `verify_package_c_rpc.sql` | Package C verification | committed |
| `verify_package_d.sql` / `verify_package_d_rpc.sql` | Package D verification | **UNTRACKED — never committed** |
| `audit/001–004_*.sql` | Created by this audit (read-only) | new, untracked |

## 4. Table classification

All 21 base tables are created in `001_initial_schema.sql`; two more were
added in `005`. Classification is based on which tables the application code,
RPCs, and seed utility actually read/write (VERIFIED_LOCAL_CODE).

### 4.1 Canonical runtime tables (actively read/written)

| Table | Written by | Read by |
|---|---|---|
| `profiles` | `createUser` (service role), reset utility | all portals |
| `institutes` | `createInstitute` | admin |
| `programs` | `create_program_with_institutes` RPC | admin |
| `program_institutes` (005) | same RPC | admin |
| `program_enrollments` (005) | `enrollStudents` | admin, team creation |
| `students` | `createUser` | admin, educator, student |
| `educators` | `createUser` | admin, educator |
| `external_members` | `createUser` | admin |
| `teams` | `create_balanced_team` RPC | all |
| `team_members` | `create_balanced_team` RPC | all |
| `team_educators` | `create_balanced_team` RPC | educator queue matching |
| `stages` | seeded reference data | stage board |
| `team_stage_progress` | `start_team_stage_journey`, `complete_bms_session`, `review_portfolio_as_admin` (Stage 3→4) | stage views |
| `portfolio_outputs` | `start_team_stage_journey`, booking/submission/review RPCs | student/educator/admin |
| `portfolio_submissions` (010) | `submit_portfolio`, `resubmit_portfolio` RPCs (immutable rows) | all review views |
| `portfolio_reviews` (011) | `review_portfolio_as_educator`, `review_portfolio_as_admin` RPCs (immutable) | review history views |
| `studio_slot_occupancy` (008) | `book_studio_slot` RPC | Realtime subscription (`useStudioAvailability`) |
| `studio_bookings` (008) | `book_studio_slot` RPC | studio schedule, student portfolio |

### 4.2 Legacy / deprecated

| Table | Status |
|---|---|
| `portfolio_approvals` | **Deprecated by Package D1** (011 revokes authenticated write; SELECT retained). No application code writes it. |

### 4.3 Created but not yet used (planned, schema exists, no app feature)

| Table | Planned feature | Package |
|---|---|---|
| `portfolio_participants` | Portfolio participant tracking | not used by any loader/action found |
| `projects` | Stage 4 Brand/Creative project | E (not started) |
| `project_assignments` | External member assignment | E (not started) |
| `project_approvals` | 3-educator + admin project approval | E (not started) |
| `notifications` | Notifications | deferred (placeholder route only) |
| `notification_recipients` | Notifications | deferred |
| `activity_logs` | Activity logging | deferred (writes explicitly deferred in docs) |

### 4.4 Planned but not implemented tables

None missing relative to `docs/Database_Plan.md` at the table level — the
initial schema created the full planned surface up front. The gap is the
opposite direction: many tables exist ahead of their features.

## 5. Enums

| Enum | Migration | Values (source) |
|---|---|---|
| `user_role` | 001 | admin, student, educator, external_member |
| `student_category` | 001 | photographer, makeup_artist, hairstylist (+ per 001) |
| `educator_type` | 001 | per 001 |
| `external_member_type` | 001 | per 001 |
| `stage_status` | 001 | per 001 |
| `approval_status` | 001 | legacy (used by `portfolio_approvals`) |
| `payment_status` | 001 | per 001 |
| `portfolio_workflow_status` | 006 | locked, awaiting_booking, awaiting_submission, pending_educator, pending_admin, revision_required, completed |
| `portfolio_reviewer_stage` | 011 | educator, admin |
| `portfolio_review_decision` | 011 | approved, revision_required |
| `portfolio_revision_route` | 011 | educator, admin |

## 6. Function/RPC inventory (see also master report §10)

| Function | Defined | Superseded by | SECURITY | search_path fixed | REVOKE anon/PUBLIC |
|---|---|---|---|---|---|
| `set_updated_at` | 001 | — | trigger fn | n/a | n/a |
| RLS helpers ×6 (`is_external_assigned_to_team`, `is_external_assigned_to_project`, `project_team_id`, `is_educator_assigned_to_team`, `is_educator_assigned_to_project`, `is_student_on_educator_team`) | 003 | — | DEFINER | yes (13 refs in file) | per file |
| `create_balanced_team` | 004 | 005 (and re-issued in 007) | DEFINER | yes | yes |
| `is_student_enrolled_in_program`, `is_educator_on_program_team` | 005 | — | DEFINER | yes | yes |
| `create_program_with_institutes` | 005 | — | DEFINER | yes | yes |
| `complete_bms_session` | 006 | **006a** | DEFINER | yes | yes |
| `start_team_stage_journey` | 007 | — | DEFINER | yes | yes |
| `get_studio_slot_availability` | 008 | — | DEFINER | yes | yes |
| `book_studio_slot` | 008 | **009** | DEFINER | yes | yes |
| `submit_portfolio` | 010 | — | DEFINER | yes | yes |
| `is_matching_portfolio_leader_educator` | 011 | — | DEFINER | yes | yes |
| `review_portfolio_as_educator` | 011 | — | DEFINER | yes | yes |
| `review_portfolio_as_admin` | 011 | **012** | DEFINER | yes | yes |
| `resubmit_portfolio` | 011 | — | DEFINER | yes | yes |

Locking: workflow RPCs consistently use `SELECT … FOR UPDATE` (verified: 30+
occurrences across 007–012), covering team, portfolio, submission, and
occupancy rows.

## 7. Remote application status

| Item | Status | Evidence |
|---|---|---|
| Migrations 001–010 applied remotely | Reported applied | DOCUMENTED_PLAN + prior browser sessions |
| Migration 011 + 012 + policy 006 applied remotely | Reported applied (D1 report + working D2/D3 browser flows) | VERIFIED_BROWSER_REPORTED |
| Remote migration ledger | **UNKNOWN** | `npx supabase migration list` fails: project not linked |

Manual verification instructions are in
`docs/audits/DEPLOYMENT_READINESS.md` §Supabase and the audit scripts in
`supabase/scripts/audit/`.
