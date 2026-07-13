# Implementation Progress

## Package B — Real-Time Leader-Only Studio Booking

**Status:** Implemented (application code). Apply migration `008_studio_bookings.sql` and policy `004_studio_booking_rls.sql` in Supabase.

**Date:** 2026-07-13

### Scope delivered

- Migration `008_studio_bookings.sql`
- Policy `004_studio_booking_rls.sql`
- `studio_slot_occupancy` privacy-safe availability table + Realtime publication
- `studio_bookings` immutable private booking table
- `get_studio_slot_availability` RPC (authenticated, five ordered rows)
- `book_studio_slot` RPC (student leader only, atomic booking)
- Student portfolio page at `/student/portfolio` with leader booking UI + Realtime availability
- Admin read-only studio schedule at `/admin/studio-schedule`
- Educator data loader `getEducatorStudioBookings` (future assigned-team screen)
- Verification SQL scripts

### Files created

| File | Purpose |
|------|---------|
| `supabase/migrations/008_studio_bookings.sql` | Tables + RPCs + Realtime |
| `supabase/policies/004_studio_booking_rls.sql` | RLS for studio tables |
| `supabase/scripts/verify_package_b.sql` | Read-only checks |
| `supabase/scripts/verify_package_b_rpc.sql` | RPC integration (BEGIN/ROLLBACK) |
| `src/lib/constants/studioSlots.ts` | Slot codes, labels, timezone helpers |
| `src/types/studio-booking.ts` | Package B view types |
| `src/lib/data/studio/availability.ts` | Availability fetch helper |
| `src/lib/data/student/portfolio.ts` | Student portfolio page loader |
| `src/lib/data/admin/studioSchedule.ts` | Admin schedule loader |
| `src/lib/data/educator/studioBookings.ts` | Educator assigned-team loader |
| `src/actions/studio/bookStudioSlot.ts` | Booking server action |
| `src/hooks/useStudioAvailability.ts` | Realtime availability hook |
| `src/components/studio/PortfolioCard.tsx` | Portfolio card with booking states |
| `src/components/studio/StudioBookingPanel.tsx` | Leader booking form |
| `src/components/studio/StudioSlotGrid.tsx` | Five-slot grid |
| `src/components/studio/ConfirmedBookingCard.tsx` | Confirmed booking display |
| `src/components/studio/StudioScheduleTable.tsx` | Admin schedule table |
| `src/app/student/portfolio/page.tsx` | Student portfolio route |
| `src/app/admin/studio-schedule/page.tsx` | Admin schedule route |

### Files modified

| File | Change |
|------|--------|
| `src/lib/permissions/roles.ts` | Admin sidebar Studio Schedule link |
| `src/types/database.ts` | Studio tables + RPC types |

### Migration summary (`008`)

- `studio_slot_occupancy` — `booking_date`, `slot_code`, unique date+slot, no PII
- `studio_bookings` — immutable links to portfolio, team, leader, occupancy, creator
- `get_studio_slot_availability(p_booking_date)` — five ordered availability rows
- `book_studio_slot(...)` — leader-only atomic booking + portfolio → `awaiting_submission`
- Realtime publication for `studio_slot_occupancy` (idempotent)

### RPC summary

| RPC | Access | Purpose |
|-----|--------|---------|
| `get_studio_slot_availability(date)` | authenticated | Five slot rows, no private data |
| `book_studio_slot(portfolio, date, slot)` | authenticated student leader | Atomic booking |

### RLS rules

| Table | Admin | Student | Educator | External |
|-------|-------|---------|----------|----------|
| `studio_slot_occupancy` | SELECT | SELECT | SELECT | — |
| `studio_bookings` | SELECT all | SELECT own team | SELECT assigned teams | no access |

No INSERT/UPDATE/DELETE policies — all writes via `book_studio_slot`.

### Realtime design

- Publication: `studio_slot_occupancy` only
- Client: `useStudioAvailability` subscribes to INSERT, refetches availability for selected date
- `studio_bookings` not exposed via Realtime to students

### Student UI

- `/student/portfolio` — team context, three portfolio cards, leader/assistant roles
- Leader (`awaiting_booking`): date picker, five slots, confirm with final warning
- Assistant: waiting message with dynamic portfolio name
- `awaiting_submission`: confirmed booking + submission hint (no submission form)

### Admin schedule

- `/admin/studio-schedule` — read-only table with date filter
- Shows date, slot, team, program, portfolio type, leader, booked at
- No create/edit/cancel/reschedule/delete controls

### Educator visibility

- `getEducatorStudioBookings()` secure loader for assigned teams
- No educator booking UI (intended for future Package D assigned-team view)

### Manual Supabase steps

1. Run `supabase/migrations/008_studio_bookings.sql`
2. Run `supabase/policies/004_studio_booking_rls.sql`
3. Run `supabase/scripts/verify_package_b.sql`
4. (Optional) Run `verify_package_b_rpc.sql` inside transaction
5. If Realtime check shows `MANUAL_CHECK_REQUIRED`: Dashboard → Database → Replication → enable `studio_slot_occupancy` on `supabase_realtime`

### Tests run

- `npx tsc --noEmit` — see final report
- `npm run build` — see final report

### Known limitations

- Educator UI screen not built (loader only)
- Portfolio submission, unlocking, Stage 3 completion not implemented (Package C+)
- Admin schedule date filter applied in application layer after fetch

### Package C

**Not started.**

---

## Package A.1 — Team Stage Journey Enrollment

**Status:** Implemented (application code). Apply migration `007_team_stage_journey_enrollment.sql` in Supabase.

**Date:** 2026-07-13

### Scope delivered

- Migration `007_team_stage_journey_enrollment.sql`
- `start_team_stage_journey` secure RPC
- Updated `create_balanced_team` — no auto stage initialization
- Nullable `teams.current_stage_number` and `students.current_stage_number`
- Admin team detail Stage Journey section
- Admin Stage Board **Not Enrolled** section
- Server action `startTeamStageJourneyAction`
- Verification SQL scripts

### Files created

| File | Purpose |
|------|---------|
| `supabase/migrations/007_team_stage_journey_enrollment.sql` | Schema + RPCs |
| `supabase/scripts/verify_package_a1.sql` | Read-only checks |
| `supabase/scripts/verify_package_a1_rpc.sql` | RPC integration (BEGIN/ROLLBACK) |
| `src/lib/stages/teamJourneyReadiness.ts` | Client-side readiness assessment |
| `src/actions/stages/startTeamStageJourney.ts` | Enrollment server action |
| `src/components/stages/StageJourneySection.tsx` | Journey UI on team detail |

### Files modified

| File | Change |
|------|--------|
| `src/app/admin/teams/[id]/page.tsx` | Stage Journey section + conditional timeline |
| `src/app/admin/stages/page.tsx` | Pass not-enrolled teams to board |
| `src/components/stages/StageBoard.tsx` | Not Enrolled section |
| `src/components/tables/TeamsTable.tsx` | Show "Not enrolled" for null stage |
| `src/lib/data/admin/stages.ts` | Not-enrolled team detection |
| `src/lib/data/admin/team-stage.ts` | `journeyEnrolled` flag |
| `src/lib/data/admin/teams.ts` | Nullable stage number types |
| `src/types/stage-management.ts` | Not-enrolled board data |
| `src/types/admin-records.ts` | Nullable `currentStageNumber` |
| `src/types/database.ts` | RPC type + nullable stage fields |

### Migration summary (`007`)

- `teams.current_stage_number` nullable; `not_started` default for new teams
- `students.current_stage_number` nullable
- `create_balanced_team` creates team only (no `team_stage_progress`)
- `start_team_stage_journey` initializes Stages 0–5 and moves team to Stage 2

### RPC summary

`start_team_stage_journey(p_team_id)` — admin-only, validates team composition and educator mappings, creates six progress rows atomically, no portfolio outputs.

### Permission rules

- Enrollment writes only via `start_team_stage_journey` (SECURITY DEFINER)
- Existing RLS read policies unchanged
- No new policy file required

### UI behaviour

- **New team:** Stage Journey shows setup state → **Start Stage Journey** when valid
- **Old team without progress:** **Enroll in Stage Journey**
- **Enrolled team:** Timeline + BMS form (unchanged); no enrollment button
- **Stage board:** Not Enrolled section for teams without `team_stage_progress`

### Tests run

- `npx tsc --noEmit` — see final report
- `npm run build` — see final report

### Manual Supabase steps

1. Run `supabase/migrations/007_team_stage_journey_enrollment.sql`
2. Run `supabase/scripts/verify_package_a1.sql`
3. (Optional) Run `verify_package_a1_rpc.sql` inside transaction

---

## Package A — Stage Board, BMS Completion, Stage 3 Portfolio Initialization

**Status:** Completed and committed.
