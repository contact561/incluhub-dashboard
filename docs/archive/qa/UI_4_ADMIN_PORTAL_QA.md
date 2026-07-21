# UI-4 Admin Portal QA — UI-4B

**Date:** 2026-07-15  
**Scope:** Final Admin Stage 3 approval/revision workflow QA + controlled presentation repair  
**Status:** **PASS** — UI-4 complete

---

## 1. Fixture strategy

Disposable **`UI4 QA TEAM`** (Stage 3) via:

- `scripts/ui4-qa-fixture-setup.mjs`
- `scripts/ui4-qa-fixture-cleanup.mjs`

Setup creates three dedicated students, balanced team + BMS completion, then books photography via existing `book_studio_slot` → **`awaiting_submission`**. Alpha/Beta are never modified.

During QA, application RPCs only:

- `submit_portfolio` → `pending_educator`
- `review_portfolio_as_educator` (approve) → `pending_admin`
- Admin UI → `review_portfolio_as_admin` (revision / approve)
- `resubmit_portfolio` after Admin revision → `pending_admin` (canonical return-to-admin path; no Educator re-approval)

---

## 2. Fixture safety

| Rule | Result |
|---|---|
| Alpha / Beta untouched | **Pass** (remain Stage 4 throughout) |
| Isolated team name | `UI4 QA TEAM` |
| Dedicated test students only | `ui4.photo.student@`, `ui4.makeup.student@`, `ui4.hair.student@incluhub.test` |
| Reuses institutes / program / educators | Yes |
| Existing RPCs only | Yes |
| Credentials from env | `TEST_ACCOUNT_PASSWORD` (not stored in scripts) |
| Not a migration / not production-auto | Yes |
| Fully removable | Cleanup script |

---

## 3. Roles tested (no passwords)

| Role | Account |
|---|---|
| Admin | `admin@incluhub.test` |
| Student (Photography leader) | `ui4.photo.student@incluhub.test` |
| Student (unrelated teammate) | `ui4.makeup.student@incluhub.test` |
| Educator (assigned) | `photo.educator@incluhub.test` |
| Educator (unrelated) | `makeup.educator@incluhub.test` |

Password sourced from existing `TEST_ACCOUNT_PASSWORD`.

---

## 4. Status-transition matrix

| Step | Action | Resulting status |
|---|---|---|
| Fixture ready | `book_studio_slot` | `awaiting_submission` |
| Student submit | `submit_portfolio` | `pending_educator` |
| Educator approve | `review_portfolio_as_educator` | `pending_admin` |
| Admin revision (UI) | `review_portfolio_as_admin` | `revision_required` (`revision_return_to=admin`) |
| Student resubmit | `resubmit_portfolio` | `pending_admin` (v2; **no** Educator re-approval) |
| Admin approve (UI) | `review_portfolio_as_admin` | `completed` |

Canonical Admin-focused statuses:

| Status | Result |
|---|---|
| `pending_admin` | **Pass** — dashboard count 1; queue item; detail + one ActionPanel |
| `revision_required` | **Pass** — comments enforced; ActionPanel removed; Timeline keeps Educator + Admin |
| `pending_admin` (after Admin-routed resubmit) | **Pass** — v2 + prior v1 visible; returns to Admin |
| `completed` | **Pass** — queue empty; detail readable; no Admin action |

---

## 5. Dashboard result

**Pass**

- Pending approvals metric = **1** while `pending_admin`; then **0** after completion
- One primary operational CTA (`Open portfolio approvals` / `View approval queue`)
- Preview showed UI4 QA Photography Portfolio v1 · Photographer · UI4 QA TEAM · Version 1 · Educator approved
- Secondary Stage board / Studio schedule / Teams links present
- Empty state after completion: “No portfolios awaiting approval” / “Queue is clear”
- Metrics from existing loader data only (no fabricated counts)

---

## 6. Approval queue result

**Pass**

- Only eligible `pending_admin` item (UI4 QA Photography Portfolio)
- Student / team / discipline / version accurate
- Canonical workflow badge via shared presentation
- Empty state after approval: “No pending portfolio approvals”

---

## 7. Approval detail result

**Pass**

- ProfileSummary: title, Photographer · UI4 QA TEAM, Stage 3 in progress
- Current submission + Educator review context visible (or prior Admin revision context after return-to-admin resubmit)
- Exactly one `Admin decision` ActionPanel while `pending_admin`
- Submission history + Review history Timelines accurate
- Validation: empty revision shows “Revision comments are required.”
- Completed detail: “Not awaiting Admin review” — no actionable Admin form

---

## 8. Admin revision result

**Pass** (interactive Admin UI)

- Decision `revision_required` with required comments
- DB: `workflow_status=revision_required`, `revision_return_to=admin`
- Queue count → 0; detail ActionPanel replaced by revision notice
- Timeline: Admin · Revision Required + prior Educator · Approved

---

## 9. Resubmission and re-approval result

**Pass**

- Student `resubmit_portfolio` created Version 2
- Workflow returned to **`pending_admin`** (did **not** bypass incorrectly — Educator re-approval is not required when `revision_return_to=admin`)
- Prior Version 1 remains visible
- Detail note: “Revised submission returned to Admin. No new Educator approval is required for this version.”

---

## 10. Admin approval result

**Pass** (interactive Admin UI)

- Approve → `completed`
- `pending_admin_count` → 0
- Item left pending queue
- Completed detail remains readable
- Review history includes Admin · Approved (v2)

---

## 11. Permission result

**Pass** (RPC denials; Admin-only server action gate unchanged)

| Check | Result |
|---|---|
| Photo educator → `review_portfolio_as_admin` | Denied — “You do not have permission…” |
| Makeup educator → `review_portfolio_as_admin` | Denied |
| Photo student → `review_portfolio_as_admin` | Denied |
| Makeup student → `review_portfolio_as_admin` | Denied |
| Admin revision without comments | Denied — “Revision comments are required.” |
| Admin UI form | Only admin session can reach ActionPanel |

No permission checks weakened.

---

## 12. Stage Board result

**Pass**

| Check | Result |
|---|---|
| Alpha / Beta | Stage 4 (2 teams) |
| UI4 QA TEAM | Stage 3 (1 team) while fixture present |
| Stage labels | Text-based column titles |
| Team links | View team present |
| Drag/drop / mutation | None introduced |
| Document overflow (375px) | No uncontrolled document overflow |
| Mobile | Drawer nav; horizontal stage-column scroller present (`overflow-x-auto` / `min-w-max`) |

---

## 13. Studio Schedule result

**Pass**

- Slot times unchanged (read-only)
- UI4 booking visible: **15 Jul 2026 · 3:00 PM – 6:00 PM** (`slot_15_18`)
- Date filter control present (`Filter by date` / Apply)
- No booking action or availability calculation changed

---

## 14. CRUD / list result

**Pass** (sample)

| Route | Result |
|---|---|
| `/admin/users` | PageHeader; Create User; mobile drawer |
| `/admin/users/create` | Existing fields + validation (role/status/student details) retained |
| `/admin/students`, `/admin/educators`, `/admin/external-members`, `/admin/institutes`, `/admin/programs`, `/admin/teams` | Visual redesign from UI-4A; no permanent records created for QA |
| DataTable | Presentation wrapper only — no fetch/sort reinterpretation |

---

## 15. Placeholder result

**Pass**

| Page | Result |
|---|---|
| Project Approvals | “Coming later”; no fake data; no actions |
| Notifications | Same |
| Activity Logs | Same |
| Nav badges | Remain (“Coming later”) |

---

## 16. Responsive result

**Pass** (~375 / drawer mobile; desktop nav at wider widths)

- Mobile drawer functional (`Open navigation menu`)
- Stage Board columns use controlled horizontal region
- Approval ActionPanel / forms usable
- Create User form fields labeled and reachable

---

## 17. Accessibility result

**Pass** (practical)

- One `h1` per sampled page
- Logical heading hierarchy on approval detail
- Form labels connected (Approve / Request revision / Comments)
- Validation errors exposed (`role`/visible alert copy)
- Status via text + StatusBadge (not color-only)
- Skip-to-content link present
- Pre-existing hydration overlay noise on shell/label still deferred (not introduced by Admin actions)

---

## 18. Defects found

1. Residual Admin-facing zinc classes on team-detail stage helpers (`StageJourneySection`, `TeamStageTimeline`, `BmsCompletionForm`) and raw `text-green-700` success copy.
2. No interactive `pending_admin` fixture existed before UI-4B (environment gap — addressed by disposable fixture).

No loader / action / workflow / permission defects requiring code changes beyond presentation tokens.

---

## 19. Repairs made

Presentation-only token alignment on Admin team-detail helpers:

- `src/components/stages/StageJourneySection.tsx`
- `src/components/stages/TeamStageTimeline.tsx`
- `src/components/stages/BmsCompletionForm.tsx`

Replaced zinc / green utility classes with UI-1 semantic tokens (`border-border-default`, `text-text-*`, `bg-surface-*`, `text-status-success`). No BMS / journey / timeline behaviour changes.

---

## 20. Technical checks

| Check | Result |
|---|---|
| `git diff --check` | **Pass** (CRLF warnings only) |
| `npm run lint` | **Pass** — 0 errors; 2 pre-existing unused-var warnings |
| `npx tsc --noEmit` | **Pass** (`tsc_exit:0`) |
| `npm run build` | **Pass** (`build_exit:0`) |

---

## 21. Cleanup status

`node scripts/ui4-qa-fixture-cleanup.mjs` — **executed**.  

Confirm: UI4 QA TEAM remaining **0**; Alpha/Beta still Stage 4.

---

## 22. Deferred issues

- Pre-existing React hydration mismatch overlays (PortalNavList / Label / RoleLayout) — shell, not Admin approval logic
- Unused legacy `src/components/stages/StageBoard.tsx` (admin page uses `AdminStageBoard`) — cleanup optional later
- Stage 4 / Stage 5 / Notifications / Activity Logs features — out of scope
- UI-5 cross-portal responsive/a11y package

---

## 23. Final UI-4 verdict

**UI-4 complete.**  

UI-4A visual redesign + UI-4B Admin revision/approval workflow QA both **Pass**. Admin revision and Admin approval verified interactively against disposable fixture without mutating Alpha/Beta.
