# Package E — Stage 4 & Stage 5 Implementation Plan

**Date:** 2026-07-16
**Status:** Requirement lock revised — **Brand Works + Ecosystem Welcome** (final simplified model)
**Prerequisite:** UI-1 through UI-5 complete; Stage 3 workflow verified; TEST TEAM ALPHA and TEST TEAM BETA at Stage 4
**Scope of this document:** Planning and requirement lock only. No application code, migrations, or RLS changes were made in this revision.

---

## 1. Executive change summary

**Package E is simplified.** Stage 4 is no longer an interactive Brand/Creative project with submissions, dual approval, External Members, or revision loops.

| Area | Previous E0 plan | Final model |
|---|---|---|
| Stage 4 name | Brand / Creative Project | **Brand Works** |
| Operational pattern | Portfolio-style submit → educator → admin | **Admin-controlled, same pattern as Stage 2 BMS** |
| Student role | Submit / resubmit | **Read-only scheduled date** |
| Educator role | Approve / request revision | **Read-only scheduled date for assigned teams** |
| Admin role | Create project, assign external, approve queue | **Schedule Brand Works → mark complete** |
| Stage 5 unlock | After dual project approval | **Atomic side-effect of Admin completing Brand Works** |
| Stage 5 product | Final completion messaging only | **Ecosystem welcome page + external app CTA** |

**Readiness verdict: GO for documentation-locked E1** — fewer moving parts than the superseded project workflow; reuse Stage 2 BMS RPC, form, team-detail, and stage-progress patterns.

**Do not begin implementation until remaining decisions in §17 are confirmed** (date validation rules, schedule editability, ecosystem asset URLs).

---

## 2. Superseded previous project workflow

> **SUPERSEDED.** The interactive Stage 4 project/submission/review model documented in the original E0 audit is **cancelled** for MVP Package E.

The following requirements are **SUPERSEDED** and must **not** be implemented for Package E:

| Superseded item | Reason |
|---|---|
| Stage 4 project creation UI | Replaced by Brand Works schedule on `team_stage_progress` |
| Team project assignment via `projects` | Not used |
| External Member assignment / read-only project portal for Stage 4 | Out of Stage 4 scope |
| Student project workspace / submission | No student submission |
| Educator Stage 4 review queue / detail | No educator approval |
| Admin Stage 4 approval queue / detail | No approval queue |
| Revision / resubmission / `revision_return_to` | Not applicable |
| PDF / file / portfolio-style link submission | Not applicable |
| `project_submissions` / `project_reviews` tables | Not required |
| Project workflow RPCs (`submit_project`, `review_project_*`, etc.) | Not required |
| Reuse of `portfolio_workflow_status` on `projects` | Not required |
| FEATURE_REGISTRY items AA–AE as previously scoped (project creation, external assignment, project views, educator/admin project approvals) | Replaced by Brand Works features |

**Still true from prior audit (unchanged facts):**

- `projects`, `project_assignments`, `project_approvals` tables **exist unused** — leave dormant for MVP; do not build Package E on them.
- Stage 3 → Stage 4 transition via `review_portfolio_as_admin` **remains** the entry into Stage 4.
- `/admin/project-approvals` placeholder and External portal stubs remain **out of Package E scope** (keep “Coming later” / hidden as today, or leave unchanged).
- Notifications, marketplace, certificates, payments, WhatsApp, AI grading remain **out of MVP**.

---

## 3. Stage 4 feature definition

### Brand Works (Stage 4)

1. **Feature name:** Brand Works (Admin-scheduled Stage 4 completion)
2. **Purpose:** Admin schedules and records Brand Works for a Stage 4 team, then marks completion to unlock Stage 5.
3. **User roles involved:** Admin (write); Student and Educator (read-only date visibility).
4. **Step-by-step user flow:** See §4.
5. **Screens required:** See §5.
6. **Data required:** See §6 — columns on `team_stage_progress` for Stage 4.
7. **Permission rules:** Admin-only RPCs for all writes; Student/Educator SELECT via existing stage/team RLS.
8. **Success state:** See §8.
9. **Error state:** See §8.
10. **MVP or future version:** **MVP (E1 + E2)**

There is **no**:

- Student submission
- Educator approval
- Admin approval queue
- Revision or resubmission
- PDF upload
- External Member workflow
- Project-submission workflow

---

## 4. Stage 4 user flow

```text
Team completes Stage 3
→ Team and active Students enter Stage 4
→ Admin opens team detail (Stage 4)
→ Admin schedules Brand Works:
     - Brand Works date (required)
     - optional remarks
→ Student sees scheduled date (read-only) on Stage / dashboard
→ Educator sees scheduled date (read-only) for assigned teams
→ After Brand Works occurs, Admin marks Brand Works complete
→ complete_brand_works RPC atomically:
     - marks Stage 4 complete
     - unlocks Stage 5
     - sets team + active Students current_stage_number = 5
→ Student can open Ecosystem Welcome (/student/ecosystem)
```

**Comparison to Stage 2 BMS flow:**

| Step | Stage 2 BMS (today) | Stage 4 Brand Works (final) |
|---|---|---|
| Entry | Stage 1 complete → Stage 2 | Stage 3 complete → Stage 4 |
| Admin records date | Date entered on **complete** form | Date entered on **schedule** first |
| Remarks | Optional on complete | Optional on schedule (and optionally retained at complete) |
| Student visibility | Stage journey shows BMS completion after done | Shows **scheduled date** before complete; completed after |
| Unlock next stage | Single RPC `complete_bms_session` unlocks Stage 3 | `complete_brand_works` unlocks Stage 5 |
| Split schedule vs complete | Combined in one RPC | **Split:** `schedule_brand_works` then `complete_brand_works` |

---

## 5. Stage 4 screens

Prefer extending existing routes; do not invent approval queues.

### Admin

| Screen | Route | Notes |
|---|---|---|
| Schedule Brand Works | **Extend** `/admin/teams/[id]` | Form: date + optional remarks → `schedule_brand_works` |
| Complete Brand Works | **Extend** `/admin/teams/[id]` | Shown when scheduled and not yet completed → `complete_brand_works` |
| Stage Board | **Extend** `/admin/stages` | Stage 4 teams; optional scheduled/completed indicator |
| Project Approvals placeholder | `/admin/project-approvals` | **Leave as-is** (superseded feature); keep “Coming later” |

### Student

| Screen | Route | Notes |
|---|---|---|
| Stage journey / dashboard | **Extend** `/student/my-stage`, `/student/dashboard` | Read-only Brand Works date + status when Stage 4 |
| Ecosystem (after unlock) | `/student/ecosystem` | Stage 5 — see §10–§12 |

### Educator

| Screen | Route | Notes |
|---|---|---|
| Assigned team visibility | **Extend** existing educator team/student/stage views as needed | Read-only Brand Works date for assigned Stage 4 teams |
| Project review routes | — | **Do not create** (superseded) |

### External Member

| Screen | Notes |
|---|---|
| No Stage 4 External workflow | Leave portal stub unchanged |

---

## 6. Stage 4 data and permissions

### 6.1 Recommended columns on `team_stage_progress`

Add Brand Works fields analogous to existing BMS columns (`bms_session_date`, `bms_remarks`), with explicit schedule/complete audit:

| Column | Type | Purpose |
|---|---|---|
| `brand_works_date` | `date` | Scheduled Brand Works date |
| `brand_works_remarks` | `text` | Optional remarks |
| `brand_works_scheduled_at` | `timestamptz` | When Admin scheduled |
| `brand_works_scheduled_by` | `uuid` → `profiles` | Who scheduled |
| `brand_works_completed_at` | `timestamptz` | When Admin marked complete |
| `brand_works_completed_by` | `uuid` → `profiles` | Who completed |

**Scope:** These fields apply to the **Stage 4** `team_stage_progress` row (same pattern as BMS fields living on the Stage 2 progress row).

**Not used for Package E MVP:** `projects`, `project_assignments`, `project_approvals` (dormant).

### 6.2 Permission matrix (Stage 4)

| Action | Admin | Educator | Student | External |
|---|---|---|---|---|
| Schedule Brand Works | ✓ RPC | ✗ | ✗ | ✗ |
| Edit schedule (if allowed — see §17) | ✓ RPC | ✗ | ✗ | ✗ |
| Complete Brand Works | ✓ RPC | ✗ | ✗ | ✗ |
| View Brand Works date | ✓ | ✓ assigned team | ✓ own team | ✗ |
| View remarks | ✓ | ✓ assigned team (recommended) | ✓ own team (recommended) | ✗ |
| Unlock Stage 5 | ✓ via complete RPC | ✗ | ✗ | ✗ |

Institute / team scoping unchanged: Educator assigned teams only; Student own team only; Admin global.

All Stage 4 **writes** must be **RPC-only** (no direct client UPDATE on `team_stage_progress` Brand Works columns).

---

## 7. Stage 4 RPC and migration recommendation

### 7.1 BMS patterns to reuse

Inspected reference: `complete_bms_session` (migrations `006` / `006a`), `BmsCompletionForm`, `completeBmsSessionAction`, admin team detail Stage 2 section, `getTeamStageDetail` loader.

| Pattern | BMS today | Reuse for Brand Works |
|---|---|---|
| Columns on `team_stage_progress` | `bms_session_date`, `bms_remarks` | Add brand_works_* columns |
| SECURITY DEFINER RPC | `complete_bms_session` | `schedule_brand_works`, `complete_brand_works` |
| Admin gate | `is_admin()` + `get_my_profile_id()` | Same |
| Locking | `SELECT … FOR UPDATE` on `teams` + stage progress rows | Same |
| Prior-stage check | Stage 1 completed before Stage 2 complete | Stage 3 completed before Stage 4 complete |
| Current-stage check | `current_stage_number = 2` | `current_stage_number = 4` |
| Duplicate completion guard | Raise if Stage 2 already `completed` | Same for Stage 4 |
| Atomic unlock next stage | Complete Stage 2 → start Stage 3 + portfolio init | Complete Stage 4 → start Stage 5 (no portfolio init) |
| Grants | REVOKE PUBLIC/anon; GRANT authenticated | Same |
| Server action | `completeBmsSessionAction` + role check | `scheduleBrandWorksAction`, `completeBrandWorksAction` |
| UI form | Date + remarks on `/admin/teams/[id]` | Schedule form + Complete action on same page |
| Error mapping | Known RPC messages → user-facing strings | Same approach |
| Timezone for “today” | Asia/Kolkata in BMS complete | Reuse unless PO decides otherwise (§17) |

**Difference from BMS:** Brand Works **splits schedule and complete** into two RPCs so Students/Educators can see the date before the event. BMS currently records date only at completion time.

### 7.2 Recommended RPCs (Admin-only)

#### `schedule_brand_works(p_team_id uuid, p_brand_works_date date, p_remarks text)`

Must:

1. Verify Admin role
2. Lock team + Stage 4 progress
3. Verify team active and `current_stage_number = 4`
4. Verify Stage 3 progress is `completed`
5. Verify Stage 4 not already completed
6. Set `brand_works_date`, `brand_works_remarks`, `brand_works_scheduled_at`, `brand_works_scheduled_by`
7. Prevent invalid dates per PO rules (§17)
8. Optionally allow reschedule while not completed (§17)

#### `complete_brand_works(p_team_id uuid)`

Must atomically:

1. Verify Admin role
2. Lock team and stage-progress records (`FOR UPDATE`)
3. Verify Stage 3 is complete
4. Verify team is active and currently at Stage 4
5. Verify Brand Works has been scheduled (`brand_works_date` / `brand_works_scheduled_at` present)
6. Mark Stage 4 complete (`status = completed`, `completed_at`, admin approval fields as consistent with BMS)
7. Unlock Stage 5 (Stage 5 progress → `in_progress`, `started_at`)
8. Update team `current_stage_number = 5` (and `stage_status` as BMS does for Stage 3 unlock)
9. Update active team Students to `current_stage_number = 5`
10. Record `brand_works_completed_at` / `brand_works_completed_by`
11. Prevent duplicate completion

Optional parameter: additional completion remarks — only if PO wants (default: reuse scheduled remarks).

### 7.3 Smallest migration recommendation

**Migration `013_brand_works_stage4.sql` (name indicative):**

- `ALTER TABLE team_stage_progress` add the six Brand Works columns
- Create `schedule_brand_works` and `complete_brand_works`
- Comments, REVOKE/GRANT matching BMS
- No new tables
- Do **not** alter `projects` / `project_assignments` / `project_approvals` for MVP

**Policy:** Prefer no new policy file if Brand Works columns inherit existing `team_stage_progress` RLS and all writes are DEFINER RPCs (same as BMS). Add a policy patch only if SELECT of new columns needs tightening (unlikely).

---

## 8. Stage 4 success and error states

### Success

| Action | Success state |
|---|---|
| Schedule | Stage 4 progress shows date + scheduled audit; Student/Educator see date read-only |
| Complete | Stage 4 `completed`; team and active Students at Stage 5; Stage Board moves team to Stage 5; Student ecosystem page becomes accessible |

### Errors (recommended messages)

| Situation | Response |
|---|---|
| Non-admin caller | Permission denied |
| Team not found / inactive | Team not found / not active |
| Team not at Stage 4 | Team is not currently in Stage 4 |
| Stage 3 incomplete | Stage 3 is incomplete |
| Schedule without date | Brand Works date is required |
| Complete without schedule | Brand Works has not been scheduled |
| Already completed | Brand Works was already completed |
| Future date (if BMS-like rule applied) | Brand Works date cannot be in the future *(complete-time or schedule-time — PO §17)* |
| Concurrent double-complete | Duplicate completion prevented by lock + status check |

---

## 9. Stage 5 feature definition

### Ecosystem Welcome (Stage 5)

1. **Feature name:** Ecosystem Welcome
2. **Purpose:** After Brand Works completion, present a UI-focused onboarding experience that introduces the IncluHub ecosystem / partner application.
3. **User roles involved:** Student (primary); Admin verifies unlock via Stage Board / team detail (no separate approval screen).
4. **Step-by-step user flow:** See §10.
5. **Screens required:** See §11.
6. **Data required:** Team/student `current_stage_number >= 5`; public env config for app URL/name/logo.
7. **Permission rules:** Students below Stage 5 must not access the ecosystem page.
8. **Success state:** Student sees welcome content and can open the external application URL.
9. **Error state:** Locked / redirect if stage &lt; 5; missing env URL shows controlled empty/error copy.
10. **MVP or future version:** **MVP (E2)**

There is **no**:

- Separate Stage 5 Admin approval screen
- Marketplace, certificates, payments, WhatsApp, AI grading
- Stored external application passwords

Admin completing Brand Works **automatically** unlocks Stage 5.

---

## 10. Stage 5 Student flow

```text
Admin completes Brand Works
→ Student current_stage_number = 5
→ Student opens /student/ecosystem (nav CTA from dashboard / My Stage)
→ Page shows:
     - ecosystem / app logo
     - welcome title
     - completion / welcome message
     - “Enter the Ecosystem” button
→ Button opens NEXT_PUBLIC_ECOSYSTEM_APP_URL (new tab or same tab — see §17)
→ No password stored in IncluHub
```

Students with `current_stage_number < 5` must be blocked (server-side check in page loader + soft CTA hidden elsewhere).

---

## 11. Stage 5 screens and permissions

| Screen | Route | Role | Access rule |
|---|---|---|---|
| Ecosystem Welcome | `/student/ecosystem` | Student | Only if active Student and `current_stage_number >= 5` |
| Student dashboard CTA | Extend `/student/dashboard` | Student | Show enter-ecosystem CTA when Stage 5 |
| My Stage | Extend `/student/my-stage` | Student | Stage 5 unlocked / completed messaging |
| Admin verification | Extend `/admin/teams/[id]`, `/admin/stages` | Admin | Confirm Stage 5 without separate approval UI |
| Educator | Existing assigned views | Educator | Optional read-only “team at Stage 5”; no ecosystem page required for MVP |

| Action | Admin | Educator | Student | External |
|---|---|---|---|---|
| Unlock Stage 5 | ✓ via `complete_brand_works` | ✗ | ✗ | ✗ |
| View Stage 5 on Stage Board | ✓ | ✗ (or assigned-team only if already exposed) | ✗ | ✗ |
| Open `/student/ecosystem` | ✗ | ✗ | ✓ if stage ≥ 5 | ✗ |
| Enter external app URL | — | — | ✓ button | ✗ |

Add **Ecosystem** (or equivalent) to `STUDENT_NAV_ITEMS` only when Stage ≥ 5 **or** always visible but page gates access — prefer **gate the page server-side**; nav may show for Stage 5 only to reduce clutter.

---

## 12. Stage 5 configuration

MVP configuration (env + public asset):

| Key / path | Purpose |
|---|---|
| `NEXT_PUBLIC_ECOSYSTEM_APP_URL` | Target application / login URL opened by the CTA |
| `NEXT_PUBLIC_ECOSYSTEM_APP_NAME` | Display name in title/copy |
| `public/brand/ecosystem-app-logo.svg` | Logo shown on welcome page |

**Rules:**

- Do **not** store external application passwords in IncluHub.
- Missing URL: show safe empty state; do not invent a default production URL.
- Logo: ship placeholder SVG path; replace with supplied brand asset when available.

---

## 13. Revised E1 scope — Brand Works vertical slice

**Goal:** Admin can schedule and complete Brand Works; Students/Educators see the scheduled date; completion unlocks Stage 5 in the database. Ecosystem welcome UI may be minimal stub or deferred to E2 if split cleanly.

### E1 must include

| # | Deliverable |
|---|---|
| 1 | Migration adding Brand Works columns on `team_stage_progress` |
| 2 | RPC `schedule_brand_works` |
| 3 | RPC `complete_brand_works` (atomic Stage 5 unlock) |
| 4 | Admin UI on `/admin/teams/[id]` — schedule + complete (mirror BMS forms) |
| 5 | Server actions with admin checks + RPC error mapping |
| 6 | Loader updates so Admin/Student/Educator can read Brand Works fields |
| 7 | Student + Educator read-only date display on existing stage/dashboard surfaces |
| 8 | Stage Board Stage 4 → Stage 5 movement after complete |
| 9 | Disposable fixture for Brand Works QA (do **not** mutate Alpha/Beta unless PO allows) |
| 10 | Lint / tsc / build; update progress docs |

### E1 non-goals

- Project submission / approval queues
- External Member Stage 4 workflow
- Polished Ecosystem Welcome page (prefer E2 unless trivial stub)
- Notifications / activity logs

---

## 14. Revised E2 scope — Ecosystem Welcome + final QA

| # | Deliverable |
|---|---|
| 1 | `/student/ecosystem` welcome page (logo, title, message, CTA) |
| 2 | Env config wiring (`NEXT_PUBLIC_ECOSYSTEM_*`) + logo asset |
| 3 | Server-side Stage 5 gate on ecosystem route |
| 4 | Student dashboard / My Stage CTAs |
| 5 | Admin verification polish (Stage Board / team detail Stage 5 state) |
| 6 | Full role permission QA (non-admin cannot schedule/complete; student &lt; 5 blocked) |
| 7 | End-to-end fixture: schedule → complete → Stage 5 → ecosystem page |
| 8 | Fixture cleanup |
| 9 | Documentation updates (`IMPLEMENTATION_PROGRESS`, FEATURE_REGISTRY Brand Works items) |

---

## 15. Local release-readiness plan

1. Apply migration `013` (Brand Works) to local/remote Supabase used for QA.
2. Confirm Alpha/Beta (or disposable fixture) at Stage 4 before Brand Works tests.
3. Admin: schedule Brand Works → verify Student/Educator read-only date.
4. Admin: complete Brand Works → verify Stage 5 on team + students.
5. Student Stage 5: open `/student/ecosystem` with local env URL.
6. Negative tests: educator/student cannot call RPCs; student at Stage 4 cannot open ecosystem.
7. `npm run lint`, `tsc`, `build`.
8. Do not ship project-approval or External Stage 4 features.

---

## 16. Deployment plan

1. Apply Brand Works migration + RPC grants in Supabase (manual checklist; migration ledger may be unlinked).
2. Deploy Next.js app with `NEXT_PUBLIC_ECOSYSTEM_APP_URL` and `NEXT_PUBLIC_ECOSYSTEM_APP_NAME` set per environment.
3. Deploy `public/brand/ecosystem-app-logo.svg`.
4. Smoke-test Admin Brand Works on a non-production fixture team first.
5. Confirm Stage 3→4 path still intact (portfolio admin approval).
6. No dependency on dormant `projects*` tables.
7. Rollback: RPCs are additive; UI can hide Brand Works forms if migration not applied (mirror BMS migration-missing error mapping).

---

## 17. Risks and remaining decisions

### Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Docs/product still describe dual-approval Stage 4 | Medium | This plan is authoritative for Package E; update Product_Master / User_Flows in a later docs pass |
| Dormant `projects*` tables confuse implementers | Medium | Explicit SUPERSEDED section; do not wire UI |
| Split schedule/complete diverges from BMS single RPC | Low | Document difference; reuse locking/admin patterns |
| Completing without real-world Brand Works happening | Process | Admin operational discipline; no automated attendance |
| Ecosystem URL misconfigured | Medium | Empty-state + release checklist |
| Mutating Alpha/Beta during QA | High | Prefer disposable fixture |

### Remaining decisions (Product Owner)

| # | Decision | Recommendation |
|---|---|---|
| R1 | May Admin reschedule Brand Works after schedule, before complete? | **Yes** — overwrite date/remarks via `schedule_brand_works` while Stage 4 not completed |
| R2 | Future-date rules for schedule vs complete? | Schedule: allow future dates; Complete: require scheduled date ≤ today (IST), mirror BMS complete rule |
| R3 | Does complete require a second remarks field? | **No** — reuse scheduled remarks |
| R4 | Ecosystem CTA: same tab vs new tab? | **New tab** (`target="_blank"` + `rel="noopener noreferrer"`) |
| R5 | Exact welcome title/message copy? | PO-supplied; interim placeholder copy OK for E2 |
| R6 | Final ecosystem logo asset timing? | Path reserved; replace SVG when supplied |
| R7 | Hide vs keep `/admin/project-approvals` nav item? | **Keep “Coming later”** — do not build |

### Already confirmed

- Stage 4 = Brand Works Admin schedule + Admin complete
- No student submission, educator approval, approval queue, revision, External Member Stage 4 workflow
- Stage 5 unlock is atomic with `complete_brand_works`
- Stage 5 = Ecosystem Welcome UI + external URL CTA
- No passwords stored for external app
- All Stage 4 writes RPC-only

---

## 18. Exact next implementation step

Copy-paste after PO confirms R1–R7:

```text
Implement Package E1 — Brand Works (Stage 4) for IncluHub.

Follow docs/PACKAGE_E_IMPLEMENTATION_PLAN.md (revised Brand Works model).

Constraints:
- Documentation already locked: Stage 4 is Admin schedule + Admin complete (BMS pattern), NOT project submission/approval.
- Do NOT implement projects, project_assignments, project_approvals workflows, External Member Stage 4, student submission, educator review, or approval queues.
- Add migration for brand_works_* columns on team_stage_progress.
- Implement Admin-only RPCs: schedule_brand_works, complete_brand_works (atomic Stage 5 unlock with FOR UPDATE locking; mirror complete_bms_session checks adapted for Stage 4→5).
- All Stage 4 writes RPC-only.
- Admin UI on /admin/teams/[id] reusing BmsCompletionForm patterns (schedule form + complete action).
- Student and Educator: read-only Brand Works date on existing stage surfaces.
- PO decisions locked: [INSERT R1–R7 ANSWERS].
- Prefer disposable fixture; do not mutate TEST TEAM ALPHA / BETA unless explicitly allowed.
- Ecosystem welcome page may be a minimal stub or deferred to E2 per plan §13–§14.
- Run lint, tsc, build. Do not commit unless asked.
```

---

## Appendix A — Prior audit snapshot (historical)

The original E0 repository audit (2026-07-15) remains useful background:

- Stage 3→4 transition implemented (011/012).
- `projects*` tables unused; RLS read helpers exist.
- `/admin/project-approvals` placeholder; External portal stub.
- No Stage 4 Brand Works columns or RPCs yet.

That audit’s **implementation recommendations for project submission/review are SUPERSEDED** by this revision.

---

## Appendix B — BMS reference files

| File | Role |
|---|---|
| `supabase/migrations/006_stage_bms_foundation.sql` | BMS columns + original RPC |
| `supabase/migrations/006a_fix_complete_bms_session_rpc.sql` | Authoritative `complete_bms_session` |
| `src/actions/stages/completeBmsSession.ts` | Admin server action + error map |
| `src/components/stages/BmsCompletionForm.tsx` | Admin date + remarks form |
| `src/app/admin/teams/[id]/page.tsx` | Hosts BMS form when Stage 2 in progress |
| `src/lib/data/admin/team-stage.ts` | Team stage detail loader |

---

*End of Package E requirement lock (Brand Works + Ecosystem Welcome).*
