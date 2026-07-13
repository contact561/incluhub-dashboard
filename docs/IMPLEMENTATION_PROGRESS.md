# Implementation Progress

## Package A — Stage Board, BMS Completion, Stage 3 Portfolio Initialization

**Status:** Implemented (application code). Database migration must be applied manually in Supabase.

**Date:** 2026-07-13

### Scope delivered

- Migration `006_stage_bms_foundation.sql`
- Policy file `supabase/policies/003_stage_management_rls.sql`
- Admin Stage Board at `/admin/stages`
- Team Stage Timeline (Stage 0–5) on `/admin/teams/[id]`
- Stage 2 BMS completion form + `complete_bms_session` server action
- Atomic Stage 2 → Stage 3 transition with portfolio/participant initialization
- Verification SQL scripts
- TypeScript types and data loaders

### Files created

| File | Purpose |
|------|---------|
| `supabase/migrations/006_stage_bms_foundation.sql` | Schema + RPC |
| `supabase/policies/003_stage_management_rls.sql` | Remove student portfolio INSERT/UPDATE |
| `supabase/scripts/verify_package_a.sql` | Read-only schema/data checks |
| `supabase/scripts/verify_package_a_rpc.sql` | RPC integration checks (use in transaction + ROLLBACK) |
| `src/types/stage-management.ts` | Stage board + timeline types |
| `src/lib/data/admin/stages.ts` | Stage board data loader |
| `src/lib/data/admin/team-stage.ts` | Team timeline + portfolio loader |
| `src/actions/stages/completeBmsSession.ts` | BMS server action |
| `src/components/stages/StageBoard.tsx` | Admin stage board UI |
| `src/components/stages/TeamStageTimeline.tsx` | Stage 0–5 timeline |
| `src/components/stages/BmsCompletionForm.tsx` | BMS form (client) |
| `src/lib/constants/stage-labels.ts` | Workflow status labels |

### Files modified

| File | Change |
|------|--------|
| `src/app/admin/stages/page.tsx` | Replaced placeholder with Stage Board |
| `src/app/admin/teams/[id]/page.tsx` | Added timeline + BMS form |
| `src/types/database.ts` | Added `PortfolioWorkflowStatus`, BMS fields, RPC type |

### Migration summary (`006`)

- Added `bms_session_date`, `bms_remarks` to `team_stage_progress`
- Created `portfolio_workflow_status` enum (7 values)
- Extended `portfolio_outputs` with `sequence_order`, `workflow_status`
- Made `portfolio_title`, `portfolio_link` nullable
- Added partial unique index for one active portfolio per team
- Prepared `portfolio_approvals` uniqueness on `(portfolio_output_id, approver_role)`
- Updated Stage 3 name to **Sequential Portfolio Production**
- Added `complete_bms_session` RPC

### Policy summary (`003`)

- Dropped `portfolio_outputs_insert_student_leader`
- Dropped `portfolio_outputs_update_student_pending`
- Portfolio initialization is RPC-only

### Tests run

- `npx tsc --noEmit` — see final report
- `npm run build` — see final report

### Manual Supabase steps still required

1. Run `supabase/migrations/006_stage_bms_foundation.sql` in SQL Editor
2. Run `supabase/policies/003_stage_management_rls.sql`
3. Run `supabase/scripts/verify_package_a.sql` to confirm schema
4. (Optional) Run `verify_package_a_rpc.sql` inside `BEGIN` … `ROLLBACK` on a test Stage 2 team

### Known limitations

- Studio booking (Package B) not started
- Portfolio submission, educator/admin review, sequential unlock not started
- Stage 4/5 transitions not started
- No notifications or activity logs for BMS completion
- `portfolio_approvals.approver_user_id` remains NOT NULL until Package D prepares pending slots
- Stage board does not include drag-and-drop or generic stage advance buttons

### Package B

**Not started.**
