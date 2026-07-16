# IncluHub Role Screen Inventory — UI-0

**Date:** 2026-07-14
**Scope:** Existing implemented routes only — no new features
**Legend:**

- **Redesign now:** Include in UI-2/3/4 after UI-1 foundation
- **Defer:** Functional; polish later or blocked by paused scope
- **Visual priority:** H / M / L

---

## ADMIN

### `/admin/dashboard`

| Field | Detail |
|---|---|
| **Purpose** | Admin landing; surface pending portfolio approvals count |
| **Primary action** | Navigate to Portfolio Approvals |
| **Secondary actions** | None surfaced |
| **Key information** | Pending approval count |
| **UX problems** | Sparse; no system overview; inline h1 not RecordPageHeader; single metric vs educator’s four |
| **Mobile concerns** | Sidebar width; metric card stacks OK |
| **Visual priority** | M |
| **Redesign** | **Now** (UI-4) — after metric card component exists |

---

### `/admin/users` (+ `/admin/users/create`)

| Field | Detail |
|---|---|
| **Purpose** | List and create system users |
| **Primary action** | Create user |
| **Secondary actions** | View/edit records (if linked) |
| **Key information** | Email, role, status |
| **UX problems** | QueryErrorState title wrong (“users” always); table-heavy |
| **Mobile concerns** | Table horizontal scroll |
| **Visual priority** | M |
| **Redesign** | **Now** (UI-4) — DataTable + error state fix |

---

### `/admin/students`

| Field | Detail |
|---|---|
| **Purpose** | Browse students |
| **Primary action** | View student records |
| **Secondary actions** | Filter/search (if present) |
| **Key information** | Name, category, institute, status |
| **UX problems** | Same list pattern as educators; status badge may not match all enums |
| **Mobile concerns** | Table overflow |
| **Visual priority** | M |
| **Redesign** | **Defer** — list polish batch |

---

### `/admin/educators`

| Field | Detail |
|---|---|
| **Purpose** | Browse educators |
| **Primary action** | View educator records |
| **Secondary actions** | — |
| **Key information** | Name, institute, assignment context |
| **UX problems** | Identical visual pattern to students list |
| **Mobile concerns** | Table overflow |
| **Visual priority** | L |
| **Redesign** | **Defer** |

---

### `/admin/external-members`

| Field | Detail |
|---|---|
| **Purpose** | Manage external members |
| **Primary action** | View records |
| **Secondary actions** | — |
| **Key information** | Member identity, status |
| **UX problems** | Same CRUD list scaffold |
| **Mobile concerns** | Table overflow |
| **Visual priority** | L |
| **Redesign** | **Defer** |

---

### `/admin/institutes` (+ `/admin/institutes/create`)

| Field | Detail |
|---|---|
| **Purpose** | Institute CRUD |
| **Primary action** | Create institute |
| **Secondary actions** | View list |
| **Key information** | Institute name, metadata |
| **UX problems** | Standard admin form/list — unremarkable |
| **Mobile concerns** | Forms OK; tables weak |
| **Visual priority** | L |
| **Redesign** | **Defer** |

---

### `/admin/programs` (+ `/admin/programs/create`, `/admin/programs/[id]`)

| Field | Detail |
|---|---|
| **Purpose** | Program management |
| **Primary action** | Create / view program |
| **Secondary actions** | Edit program detail |
| **Key information** | Program name, institute link |
| **UX problems** | Detail page hierarchy varies |
| **Mobile concerns** | Moderate |
| **Visual priority** | L |
| **Redesign** | **Defer** |

---

### `/admin/teams` (+ `/admin/teams/create`, `/admin/teams/[id]`)

| Field | Detail |
|---|---|
| **Purpose** | Team management and detail |
| **Primary action** | Create team / view team detail |
| **Secondary actions** | Member management on detail |
| **Key information** | Team name, members, stage |
| **UX problems** | Detail page dense |
| **Mobile concerns** | Member lists and tables |
| **Visual priority** | M |
| **Redesign** | **Defer** — functional priority |

---

### `/admin/stages` (Stage board)

| Field | Detail |
|---|---|
| **Purpose** | Visualize teams across workflow stages |
| **Primary action** | Scan stage columns |
| **Secondary actions** | Open team links |
| **Key information** | Team placement by stage |
| **UX problems** | Dense columns; no mobile strategy; color-only stage cues possible |
| **Mobile concerns** | **High** — horizontal scroll required |
| **Visual priority** | H |
| **Redesign** | **Now** (UI-4) — responsive column collapse |

---

### `/admin/studio-schedule`

| Field | Detail |
|---|---|
| **Purpose** | Studio booking calendar / occupancy |
| **Primary action** | View schedule |
| **Secondary actions** | Slot management (if admin actions present) |
| **Key information** | Date, slots, bookings |
| **UX problems** | Calendar UX unverified for touch; may share studio component styles |
| **Mobile concerns** | **High** |
| **Visual priority** | H |
| **Redesign** | **Now** (UI-4) — with student booking alignment |

---

### `/admin/portfolio-approvals` (+ `/admin/portfolio-approvals/[portfolio-id]`)

| Field | Detail |
|---|---|
| **Purpose** | Admin final approval queue and detail |
| **Primary action** | Approve / reject portfolio |
| **Secondary actions** | View submission history |
| **Key information** | workflow_status, team, submission versions |
| **UX problems** | Visually similar to educator review; history component duplicated |
| **Mobile concerns** | Long detail page scroll |
| **Visual priority** | H |
| **Redesign** | **Now** (UI-4) — shared ReviewCard / Timeline |

---

### `/admin/project-approvals` ⚠ PLACEHOLDER

| Field | Detail |
|---|---|
| **Purpose** | Stage 5 placeholder (Package E paused) |
| **Primary action** | None |
| **Secondary actions** | — |
| **Key information** | Placeholder message |
| **UX problems** | Visible in nav without “coming later” badge |
| **Mobile concerns** | N/A |
| **Visual priority** | L |
| **Redesign** | **Defer** — **Nav: show “Coming later” or disabled** |

---

### `/admin/notifications` ⚠ PLACEHOLDER

| Field | Detail |
|---|---|
| **Purpose** | Notifications placeholder (paused) |
| **Primary action** | None |
| **UX problems** | Nav link implies feature exists |
| **Redesign** | **Defer** — **Nav: disabled or coming later** |

---

### `/admin/activity-logs` ⚠ PLACEHOLDER

| Field | Detail |
|---|---|
| **Purpose** | Activity log placeholder (paused) |
| **Primary action** | None |
| **UX problems** | Same as above |
| **Redesign** | **Defer** — **Nav: disabled or coming later** |

---

## STUDENT

### `/student/dashboard`

| Field | Detail |
|---|---|
| **Purpose** | Student home; stage progress and portfolio CTAs |
| **Primary action** | Continue current stage / open portfolio |
| **Secondary actions** | My Team, My Stage links |
| **Key information** | Current stage, team, portfolio status, revision CTA |
| **UX problems** | Multiple card styles; duplicate CTAs to portfolio; Stage3 panels visually heavy |
| **Mobile concerns** | Sidebar; stacked cards OK |
| **Visual priority** | H |
| **Redesign** | **Now** (UI-2) |

---

### `/student/my-team`

| Field | Detail |
|---|---|
| **Purpose** | View assigned team and members |
| **Primary action** | View team roster |
| **Secondary actions** | — |
| **Key information** | Team name, members, disciplines |
| **UX problems** | Uses RecordPageHeader (good); member cards basic |
| **Mobile concerns** | Moderate |
| **Visual priority** | M |
| **Redesign** | **Now** (UI-2) — ProfileSummary cards |

---

### `/student/my-stage`

| Field | Detail |
|---|---|
| **Purpose** | Current stage requirements and status |
| **Primary action** | Understand stage gate / next step |
| **Secondary actions** | Link to portfolio if Stage 3 |
| **Key information** | Stage number, requirements, lock state |
| **UX problems** | Stage card styling overlaps dashboard panels |
| **Mobile concerns** | Moderate |
| **Visual priority** | M |
| **Redesign** | **Now** (UI-2) — StepProgress component |

---

### `/student/portfolio` (submission, booking, revision, version history)

| Field | Detail |
|---|---|
| **Purpose** | End-to-end Stage 3 portfolio workflow |
| **Primary action** | Submit / book studio / resubmit (context-dependent) |
| **Secondary actions** | View version history; cancel booking |
| **Key information** | workflow_status, files, booking slot, educator feedback |
| **UX problems** | **Highest complexity page** — redundant sections, mixed amber/blue/green panels, no step progress, booking grid dense |
| **Mobile concerns** | **Critical** — booking grid, forms, history |
| **Visual priority** | **H** |
| **Redesign** | **Now** (UI-2) — PortfolioStatusPanel, unified layout |

**Sub-states on same route:**

| Sub-state | Primary action | Redesign |
|---|---|---|
| Draft | Submit portfolio | Now |
| Submitted / in review | Wait; view status | Now |
| Revision requested | Resubmit | Now (D4 implemented; visual polish needed) |
| Booking required | Book studio slot | Now |
| Approved | View read-only | Defer polish |

---

## EDUCATOR

### `/educator/dashboard`

| Field | Detail |
|---|---|
| **Purpose** | Educator home; review queue summary |
| **Primary action** | Open Portfolio Reviews |
| **Secondary actions** | My Teams, My Students |
| **Key information** | Pending review count, team count, student count |
| **UX problems** | Best dashboard structure today; still raw zinc styling |
| **Mobile concerns** | Metric grid should stack at sm |
| **Visual priority** | M |
| **Redesign** | **Now** (UI-3) — token + metric cards |

---

### `/educator/my-teams`

| Field | Detail |
|---|---|
| **Purpose** | List educator’s teams |
| **Primary action** | View team |
| **Secondary actions** | — |
| **Key information** | Team name, stage, member count |
| **UX problems** | Standard list |
| **Mobile concerns** | Table |
| **Visual priority** | M |
| **Redesign** | **Defer** |

---

### `/educator/my-students`

| Field | Detail |
|---|---|
| **Purpose** | List students across teams |
| **Primary action** | View student |
| **Secondary actions** | — |
| **Key information** | Student name, team, category |
| **UX problems** | Standard list |
| **Mobile concerns** | Table |
| **Visual priority** | M |
| **Redesign** | **Defer** |

---

### `/educator/portfolio-reviews` (+ `/educator/portfolio-reviews/[portfolio-id]`)

| Field | Detail |
|---|---|
| **Purpose** | Review queue and detail |
| **Primary action** | Submit review (approve / request revision / reject) |
| **Secondary actions** | View review history |
| **Key information** | Submission files, workflow_status, prior feedback |
| **UX problems** | Detail page long; ReviewHistory separate from admin/student history components |
| **Mobile concerns** | Long scroll; file preview |
| **Visual priority** | H |
| **Redesign** | **Now** (UI-3) — ReviewCard, ActionPanel, Timeline |

---

## EXTERNAL MEMBER

### `/external/dashboard` ✓ IMPLEMENTED

| Field | Detail |
|---|---|
| **Purpose** | External member landing placeholder |
| **Primary action** | None substantive |
| **Secondary actions** | — |
| **Key information** | Welcome / role context |
| **UX problems** | Minimal content; nav promises more |
| **Mobile concerns** | Sidebar |
| **Visual priority** | L |
| **Redesign** | **Defer** (Package E paused) |

---

### `/external/assigned-team` ❌ NO PAGE

| Field | Detail |
|---|---|
| **Purpose** | Nav label only — route missing |
| **Recommendation** | **Hide from nav** or show disabled “Coming later” until implemented |

---

### `/external/project-details` ❌ NO PAGE

| Field | Detail |
|---|---|
| **Purpose** | Nav label only — route missing |
| **Recommendation** | **Hide from nav** or disabled |

---

### `/external/notifications` ❌ NO PAGE

| Field | Detail |
|---|---|
| **Purpose** | Nav label only — route missing |
| **Recommendation** | **Hide from nav** or disabled |

---

## AUTH (reference only — out of UI-2–4 scope but noted)

| Route | Purpose | Redesign |
|---|---|---|
| `/login` | Authentication | Defer — already cleanest screen |
| `/forgot-password` | Password reset | Defer |
| `/` | Redirect | N/A |

---

## Summary matrix

| Portal | Screens | Redesign now | Defer | Nav fixes needed |
|---|---|---|---|---|
| Admin | 14 nav items | 5 | 9 | 3 placeholders |
| Student | 4 | 4 | 0 | 0 |
| Educator | 4 | 2 | 2 | 0 |
| External | 4 nav items | 0 | 1 | 3 broken routes |

---

## Visual priority order (cross-role)

1. **Student portfolio** — highest user friction and mobile risk
2. **Admin portfolio approvals + Educator review detail** — shared review patterns
3. **App shell + navigation (UI-1)** — prerequisite
4. **Admin stage board + studio schedule** — operational density
5. **Dashboards** — metric consistency
6. **CRUD list pages** — batch polish
7. **External + placeholders** — hide until scope resumes
