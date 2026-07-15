# UI-3 Educator Portal QA — UI-3B

**Date:** 2026-07-15  
**Scope:** Final Educator Stage 3 revision/approval workflow QA + controlled repair  
**Status:** **PASS** — UI-3 complete

---

## 1. Fixture strategy

Disposable **`UI3 QA TEAM`** (Stage 3) via:

- `scripts/ui3-qa-fixture-setup.mjs`
- `scripts/ui3-qa-fixture-cleanup.mjs`

Setup creates three dedicated students, balanced team + BMS completion, then books photography via existing `book_studio_slot` → **`awaiting_submission`**. Alpha/Beta are never modified.

---

## 2. Fixture safety

| Rule | Result |
|---|---|
| Alpha / Beta untouched | **Pass** (remain Stage 4 throughout) |
| Isolated team name | `UI3 QA TEAM` |
| Dedicated test students only | `ui3.photo.student@`, `ui3.makeup.student@`, `ui3.hair.student@incluhub.test` |
| Reuses institutes / program / educators | Yes |
| Existing RPCs only | `create_balanced_team`, `start_team_stage_journey`, `complete_bms_session`, `book_studio_slot`, plus app workflow RPCs during QA |
| Credentials from env | `TEST_ACCOUNT_PASSWORD` (not stored in scripts) |
| Not a migration / not production-auto | Yes |

---

## 3. Roles tested (no passwords)

| Role | Account |
|---|---|
| Student (Photography leader) | `ui3.photo.student@incluhub.test` |
| Educator (assigned) | `photo.educator@incluhub.test` |
| Educator (unrelated) | `makeup.educator@incluhub.test` |

Password sourced from existing `TEST_ACCOUNT_PASSWORD`.

---

## 4. Status transition matrix

| Step | Action | Resulting status |
|---|---|---|
| Fixture ready | book_studio_slot | `awaiting_submission` |
| Student submit | `submit_portfolio` | `pending_educator` |
| Educator revision (UI) | `review_portfolio_as_educator` | `revision_required` |
| Student resubmit | `resubmit_portfolio` | `pending_educator` (v2) |
| Educator approve (UI) | `review_portfolio_as_educator` | `pending_admin` |

Canonical statuses exercised for Educator focus:

| Status | Result |
|---|---|
| `pending_educator` | **Pass** — queue + dashboard count 1; one ActionPanel; submission visible |
| `revision_required` | **Pass** — feedback required; history records event; queue cleared |
| `pending_educator` (resubmit) | **Pass** — v2 in queue/dashboard |
| `pending_admin` | **Pass** — actions removed; approval in Timeline |
| `completed` (prior Alpha) | **Pass** (UI-3A) — readable, no actions |

---

## 5. Dashboard result

**Pass**

- Awaiting review metric = 1 while pending; StatusPanel primary CTA “Open portfolio reviews”
- Preview `ReviewCard` showed correct title/team/version
- Secondary My Teams / My Students only
- After approval, queue empty / count returned to 0

---

## 6. My Teams result

**Pass**

- Photo educator: Alpha, Beta, UI3 QA TEAM
- Makeup educator: Alpha, Beta, UI3 QA TEAM (makeup mapping only) — no unauthorized Open review for photography
- Stage and badges presentation tokenized

---

## 7. My Students result

**Pass** (structure from UI-3A retained)

- Mapped students only
- Mobile cards / desktop table pattern unchanged
- No new private fields

---

## 8. Review queue result

**Pass**

- Pending photography item only when `pending_educator`
- Empty state when revision_required / pending_admin
- Makeup educator queue did not list UI3 photography

---

## 9. Review detail result

**Pass**

- `ProfileSummary` + current submission + single `ActionPanel`
- Exactly one review decision region
- Sticky desktop panel did not obscure submission content
- After transition away from pending: “Not awaiting educator review” `StatusPanel`; no form

---

## 10. Revision result

**Pass**

- Empty comments → validation StatusPanel (“Revision comments are required.”); values preserved
- With comments → `revision_required`; Timeline: Educator · Revision Required (v1) + feedback text

---

## 11. Resubmission review result

**Pass**

- Dashboard/queue showed **v2** title and version
- Prior revision feedback remained in Timeline
- ActionPanel available again for v2

---

## 12. Educator approval result

**Pass**

- Approve (existing confirm) → `pending_admin`
- Badge “Educator approved”; Timeline gains Educator · Approved (v2)
- Action controls removed

---

## 13. Timeline / history result

**Pass**

- Order: newest first (Approved v2, then Revision Required v1)
- No invented/duplicate events
- Shared `Timeline` via `ReviewHistory`

---

## 14. Permission result

**Pass**

- Assigned photo educator can review
- Unrelated makeup educator → **404** on photography detail URL
- Makeup review RPC rejected by existing rules
- Photo educator cannot call `review_portfolio_as_admin` (“You do not have permission…”)

---

## 15. Mobile result (~375px)

**Pass**

- Mobile navigation drawer present
- Queue empty state readable
- No horizontal overflow observed on sampled educator pages (UI-3A + UI-3B)

---

## 16. Accessibility / keyboard result

**Pass** (sampled)

- One `h1` on review pages
- Comments labelled (optional/required)
- Status not color-only (`PortfolioWorkflowBadge` + panels)
- Radios / submit reachable
- Validation announced via StatusPanel

---

## 17. Defects found

1. **Leader display name** often shows category-style label (“Photographer student”) instead of profile full name — existing mapping/loader visibility; **not repaired** (loader change forbidden).
2. **Dev hydration overlays** on `MobileNavigation` / `RoleLayout` / login Input — pre-existing shell noise; outside Educator-only repair scope for this package.

No Educator presentation blocker found for revision/approval UX.

---

## 18. Repairs made

**None** — verified defects requiring UI-3B presentation repairs were not present.

---

## 19. Technical checks

| Check | Result |
|---|---|
| `git diff --check` | Pass (CRLF whitespace warnings only) |
| `npm run lint` | Pass — 0 errors, 3 pre-existing warnings |
| `npx tsc --noEmit` | Pass (`tsc:0`) |
| `npm run build` | Pass (`build:0`) |

---

## 20. Cleanup status

`node scripts/ui3-qa-fixture-cleanup.mjs` executed after verification.  
`UI3 QA TEAM` removed; Alpha/Beta remain Stage 4.

---

## 21. Deferred issues

- Student display-name visibility under educator mappings
- Shell hydration warnings (`MobileNavigation` / `RoleLayout`)
- Admin portal redesign (UI-4)

---

## 22. Final UI-3 verdict

**PASS — UI-3 is complete.**

Educator revision and approval workflows verified on disposable fixture; Alpha/Beta safety preserved; no workflow/loader/RPC changes.
