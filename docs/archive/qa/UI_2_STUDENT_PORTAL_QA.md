# UI-2 Student Portal QA — UI-2B

**Date:** 2026-07-15  
**Scope:** Full Student Stage 3 workflow QA + controlled presentation repairs  
**Status:** **PASS** — UI-2 complete

---

## 1. Fixture used

**`UI2 QA TEAM`** — disposable Stage 3 development fixture.

Initial portfolio graph after setup:

| Sequence | Type | Status |
|---|---|---|
| 1 | Photographer | `awaiting_booking` |
| 2 | Makeup Artist | `locked` |
| 3 | Hairstylist | `locked` |

Team stage: **3 / in_progress**

---

## 2. Fixture safety and cleanup

| Rule | Result |
|---|---|
| Does not modify TEST TEAM ALPHA / BETA | **Pass** (Stage 4 unchanged throughout) |
| Isolated team name | `UI2 QA TEAM` |
| Dedicated auth users only | `ui2.photo.student@`, `ui2.makeup.student@`, `ui2.hair.student@incluhub.test` |
| Reuses institutes / program / educators | Yes |
| Uses existing RPCs | `create_balanced_team`, `start_team_stage_journey`, `complete_bms_session` |
| Setup script | `scripts/fixtures/ui2-qa-fixture-setup.mjs` |
| Cleanup script | `scripts/fixtures/ui2-qa-fixture-cleanup.mjs` |
| Not a migration / not production-auto | Yes |

---

## 3. Accounts / roles tested (no passwords)

| Role | Account |
|---|---|
| Student (Photography leader) | `ui2.photo.student@incluhub.test` |
| Student (Hairstyling — locked) | `ui2.hair.student@incluhub.test` |
| Educator (approve / revision) | `photo.educator@incluhub.test` |
| Admin (final approval) | `admin@incluhub.test` |

Password sourced from existing `TEST_ACCOUNT_PASSWORD` (not recorded here).

---

## 4. Status matrix

| Status | How verified | Result |
|---|---|---|
| `locked` | Hair leader portfolio + photo peer view of locked makeup pre-unlock | **Pass** — explanation + work unavailable; no book/submit |
| `awaiting_booking` | Photo leader after fixture setup | **Pass** — book primary; occupied slot disabled; `aria-pressed` selection |
| `awaiting_submission` | After Confirm Booking | **Pass** — booking confirmation + submit form primary |
| `pending_educator` | After Submit Portfolio (+ after resubmit) | **Pass** — waiting copy; submitted summary; no duplicate submit |
| `pending_admin` | DB after educator approve (brief) | **Pass** (RPC status); Student UI progressed with flow |
| `revision_required` | After educator revision request | **Pass** — feedback prominent; resubmit primary; history shows v1 |
| `completed` | After admin approve | **Pass** — approved read-only; history v2→v1; no submit |

---

## 5. Dashboard result

**Pass** for Stage 3 photo leader:

- Team `UI2 QA TEAM`, Stage 3
- One primary next-action CTA (“Book studio slot”)
- Team sequence with active mark
- Secondary My Team / My Stage links only (no duplicate Portfolio CTA)

Stage 4 Beta messaging (prior UI-2A fix) remains correct when re-checked earlier.

---

## 6. My Team result

**Pass** for structure:

- Team name / Stage 3 / member disciplines
- Incomplete-team warning not shown (team complete)
- No new private fields exposed

**Known pre-existing data visibility:** teammate/educator display names can render as “—” under Student RLS joins (also observed on Alpha previously). Not a UI-2A token defect; deferred (loader/RLS — out of repair scope).

---

## 7. My Stage result

**Pass:**

- Steps 0–2 completed; Stage 3 current; 4–5 locked
- Portfolio sequence badges match workflow
- No fabricated eligibility logic
- Stage 4 messaging not shown incorrectly for this Stage 3 team

---

## 8. Portfolio result

**Pass:**

- Own workspace once
- Team sequence accurate
- Peers without duplicating own card
- Canonical `PortfolioWorkflowBadge` labels
- Primary action matches state

---

## 9. Booking result

**Pass** at 1280px (and exercised slot UI):

- Five slot buttons; occupied cannot select
- Selected uses `aria-pressed` + brand fill
- Final-booking warning via `StatusPanel`
- Confirm succeeds → `awaiting_submission`
- Slot times unchanged

---

## 10. Submission result

**Pass:**

- Title / URL / notes present and labelled
- Submit succeeds → `pending_educator`
- Submitted card visible; no second submit control

---

## 11. Revision / resubmission result

**Pass:**

- Educator revision comments path via `review_portfolio_as_educator`
- Student sees revision feedback + previous version
- Resubmit creates **v2** → returns to `pending_educator`
- Then educator approve → `pending_admin` → admin approve → `completed`

---

## 12. Timeline result

**Pass:**

- Newest-first (v2 then v1)
- Submission dates preserved
- Educator revision on v1; approvals on v2
- No invented events

---

## 13. Mobile result (≈375px)

**Pass:**

- No horizontal overflow (`scrollWidth === clientWidth`)
- Mobile drawer available
- One `h1`
- Locked state readable without booking controls

---

## 14. Keyboard / accessibility

**Pass (sampling):**

- Slot selection exposes `aria-pressed`
- Occupied slots disabled
- Form labels tied to title/URL/notes
- Focus ring classes on slot buttons
- Status never color-only (badge + icon + text panels)

**Known non-blocking:** intermittent Next.js hydration overlay noise (LoginForm / MobileNavigation) remains pre-existing in DevTools.

---

## 15. Defects found

1. **SectionHeader dynamic heading tag** — Student portfolio hydration pointed at dynamic `<Heading>`; can confuse React hydration.
2. **Teammate name “—”** — pre-existing Student visibility of peer/educator names (data/RLS); not repaired.
3. **Assistance blanks “—, —”** — same visibility pattern for assistant names.

---

## 16. Repairs made

| File | Repair |
|---|---|
| `src/components/layout/SectionHeader.tsx` | Render explicit `h2` / `h3` instead of dynamic `ElementType` to reduce hydration mismatch risk |

No loader / RPC / action / workflow changes.

---

## 17. Technical checks

| Check | Result |
|---|---|
| `git diff --check` | Pass (CRLF whitespace warnings only; no conflict markers) |
| `npm run lint` | Pass — 0 errors, 3 pre-existing warnings (unused vars outside UI-2B scope) |
| `npx tsc --noEmit` | Pass (`tsc:0`) |
| `npm run build` | Pass (`build:0`) |

---

## 18. Deferred issues

- Peer/educator name visibility under Student reads (“—” labels)
- Full keyboard audit suite expansion in CI (manual sampling done)
- Educator/Admin visual redesign (UI-3 / UI-4)
- DevTools hydration warnings on LoginForm / MobileNavigation

---

## 19. Cleanup status

Cleanup script executed after verification (`node scripts/fixtures/ui2-qa-fixture-cleanup.mjs`).  
Alpha/Beta remain Stage 4 and untouched.  
Scripts remain for future re-seeding of `UI2 QA TEAM`.

---

## 20. Final UI-2 verdict

**PASS — UI-2 is complete.**

Blocking Stage 3 workflow states exercised on disposable fixture; presentation defects limited to one controlled shared repair; Alpha/Beta safety preserved.
