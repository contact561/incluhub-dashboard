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
- Educator/Admin approval and revision workflows not implemented (Package D+)
- Stage 3 completion / next-portfolio unlock not implemented (Package D+)
- Admin schedule date filter applied in application layer after fetch

### Package C

See Package C section below.

---

## Package C — Link-Only Portfolio Submission

**Status:** Implemented (application code). Apply migration `010_portfolio_submission.sql` and policy `005_portfolio_submission_rls.sql` in Supabase before browser testing.

**Date:** 2026-07-14

### Scope delivered

- Migration `010_portfolio_submission.sql`
- Policy `005_portfolio_submission_rls.sql`
- Immutable `portfolio_submissions` table (versioned; Package C creates version 1 only)
- `submit_portfolio` SECURITY DEFINER RPC (student leader only)
- Student portfolio submission form on `/student/portfolio` when `awaiting_submission`
- Read-only submitted portfolio card after `pending_educator`
- My Stage / admin team timeline shows submitted title + link when available
- Verification SQL scripts
- No educator/Admin approval actions (Package D)

### Files created

| File | Purpose |
|------|---------|
| `supabase/migrations/010_portfolio_submission.sql` | Table + `submit_portfolio` RPC |
| `supabase/policies/005_portfolio_submission_rls.sql` | SELECT-only RLS |
| `supabase/scripts/verify_package_c.sql` | Read-only static checks |
| `supabase/scripts/verify_package_c_rpc.sql` | RPC integration (BEGIN/ROLLBACK) |
| `src/types/portfolio-submission.ts` | Submission view types |
| `src/actions/portfolio/submitPortfolio.ts` | Controlled server action |
| `src/components/studio/PortfolioSubmissionForm.tsx` | Leader submission form |
| `src/components/studio/SubmittedPortfolioCard.tsx` | Read-only submitted card |

### Files modified

| File | Change |
|------|--------|
| `src/types/database.ts` | `PortfolioSubmission` + RPC typing |
| `src/types/studio-booking.ts` | `submission` on portfolio card |
| `src/types/stage-management.ts` | Submission title/URL on portfolio summary |
| `src/lib/data/student/portfolio.ts` | Load submissions + waiting copy |
| `src/lib/data/admin/team-stage.ts` | Nested submission fields for timeline |
| `src/components/studio/PortfolioCard.tsx` | Form / waiting / submitted states |
| `src/components/stages/TeamStageTimeline.tsx` | Show submitted title/link + pending educator |
| `docs/IMPLEMENTATION_PROGRESS.md` | Package C documentation |

### Migration summary (`010`)

- `portfolio_submissions` — **authoritative immutable submission history** (`version_number`, title, URL, optional notes, submitter, creator)
- `portfolio_outputs` — **latest-submission snapshot only** for dashboard display (`portfolio_title`, `portfolio_link`, `notes`, `submitted_at`, `workflow_status`)
- Unique `(portfolio_output_id, version_number)` (not a sole unique on `portfolio_output_id`)
- CHECK: `version_number >= 1`, non-blank title/URL
- `submit_portfolio(...)` — one targeted insert (`ON CONFLICT … DO NOTHING` on the version unique constraint) + one snapshot update → `pending_educator`
- Future Package D revisions must insert a new version and update the snapshot atomically
- No Storage buckets, no file columns, no approval rows

### Source of truth

| Store | Role |
|-------|------|
| `portfolio_submissions` | Authoritative immutable history (Package C writes version 1 only) |
| `portfolio_outputs` title/link/notes/`submitted_at` | Denormalized latest-submission snapshot for dashboards |

### RPC summary

`submit_portfolio(p_portfolio_output_id, p_title, p_portfolio_url, p_notes)`

- Authenticated active student leader only
- Requires Stage 3, `awaiting_submission`, confirmed studio booking, sole active portfolio
- Title 3–150 chars; absolute HTTP/HTTPS URL; notes optional ≤ 2000
- Concurrent duplicates blocked via row locks + targeted `ON CONFLICT` on `(portfolio_output_id, version_number)` only
- Does not unlock Makeup/Hairstyling, does not change team stage

### RLS rules

| Table | Admin | Student | Educator | External |
|-------|-------|---------|----------|----------|
| `portfolio_submissions` | SELECT (active admin + `is_admin()`) | SELECT own team (active student) | SELECT assigned teams (active educator) | no access |

No INSERT / UPDATE / DELETE policies — writes only via `submit_portfolio`.

### Student UI

- Leader (`awaiting_submission`): title, URL, optional notes, Submit Portfolio
- Assistant (`awaiting_submission`): waiting message, no form
- After submit (`pending_educator`): read-only card for all team members (title, link, notes, submitted by/at)
- No edit / delete / resubmit / approve controls

### My Stage

- Stage 3 portfolio sequence shows Photography / Makeup / Hairstyling statuses
- Submitted title + clickable URL when available
- “Pending Educator Review” label when status is `pending_educator`
- No review or stage-progression controls

### Educator / Admin visibility

- RLS permits assigned educators and admins to read submissions
- Existing Stage timeline surfaces title/link read-only when loaded
- **Review / approve / revision actions remain Package D**

### Activity log

`activity_logs` table exists, but no shared `logActivity` helper or established Package B logging pattern. Package C does **not** invent a new logging architecture. `portfolio_submitted` activity recording is pending MVP infrastructure work.

### Manual Supabase steps

1. Run `supabase/migrations/010_portfolio_submission.sql`
2. Run `supabase/policies/005_portfolio_submission_rls.sql`
3. Run `supabase/scripts/verify_package_c.sql`
4. (Optional) Run `verify_package_c_rpc.sql` inside transaction (requires a portfolio in `awaiting_submission` with booking)

### Tests run

- `git diff --check` — see final report
- `npx tsc --noEmit` — see final report
- `npm run build` — see final report

### Browser testing status

Pending local SQL apply. Manual checklist is in the Package C final report.

### Known limitations

- Educator and Admin approval / revision (Package D) not started
- Version 2+ submissions not created in Package C
- Next portfolio unlock and Stage 3 completion not implemented
- Activity log write for `portfolio_submitted` deferred until shared logging exists

### Package D

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
