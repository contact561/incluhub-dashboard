# Route and Navigation Registry — Audit 2026-07-14

Audit-only document. No routes were modified.

Evidence base: `src/app` file inventory, `npm run build` route table
(VERIFIED_BUILD), source inspection of pages, loaders, actions, and
`src/lib/permissions/roles.ts` navigation config (VERIFIED_LOCAL_CODE).

Legend:

- **Impl**: `real` (production logic), `placeholder` (static "coming soon"
  shell), `stub` (heading only, no data)
- **Guard**: how the route enforces role access. Global enforcement is the
  middleware/proxy (`src/middleware.ts`) plus per-layout role checks.
- Browser column reflects previously reported browser sessions
  (VERIFIED_BROWSER_REPORTED), not new testing performed in this audit.

---

## 1. Public routes

| URL | File | Impl | Loader | Action | Notes |
|---|---|---|---|---|---|
| `/` | `src/app/page.tsx` | real | session check | — | Redirects to role dashboard or `/login` |
| `/login` | `src/app/login/page.tsx` | real | — | `src/actions/auth/login.ts` | Role-based redirect after login |
| `/forgot-password` | `src/app/forgot-password/page.tsx` | real | — | `src/actions/auth/forgotPassword.ts` | Static prerendered |

## 2. Admin routes (`/admin/*`)

All admin routes sit under the admin layout with role guard `admin`.

| URL | File | Impl | Loader | Action | Empty state | Error state |
|---|---|---|---|---|---|---|
| `/admin/dashboard` | `admin/dashboard/page.tsx` | real | admin dashboard loaders + `getAdminPortfolioApprovalQueue` | — | yes | logged loader errors |
| `/admin/users` | `admin/users/page.tsx` | real | admin users loader | — | yes | yes |
| `/admin/users/create` | `admin/users/create/page.tsx` | real | — | `createUser` (service-role, server-only) | n/a | form errors |
| `/admin/institutes` | `admin/institutes/page.tsx` | real | institutes loader | — | yes | yes |
| `/admin/institutes/create` | `admin/institutes/create/page.tsx` | real | — | `createInstitute` | n/a | form errors |
| `/admin/programs` | `admin/programs/page.tsx` | real | programs loader | — | yes | yes |
| `/admin/programs/create` | `admin/programs/create/page.tsx` | real | — | `createProgram` (RPC `create_program_with_institutes`) | n/a | form errors |
| `/admin/programs/[id]` | `admin/programs/[id]/page.tsx` | real | program detail loader | `enrollStudents` | yes | notFound |
| `/admin/students` | `admin/students/page.tsx` | real | `src/lib/data/admin/students.ts` | — | yes | yes |
| `/admin/educators` | `admin/educators/page.tsx` | real | educators loader | — | yes | yes |
| `/admin/external-members` | `admin/external-members/page.tsx` | real | external members loader | — | yes | yes |
| `/admin/teams` | `admin/teams/page.tsx` | real | teams loader | — | yes | yes |
| `/admin/teams/create` | `admin/teams/create/page.tsx` | real | eligible students/educators loaders | `createTeam` (RPC `create_balanced_team`) | yes | form errors |
| `/admin/teams/[id]` | `admin/teams/[id]/page.tsx` | real | team detail loader | — | yes | notFound |
| `/admin/stages` | `admin/stages/page.tsx` | real | stage board loaders | `startTeamStageJourney`, `completeBmsSession` (RPCs) | yes | yes |
| `/admin/studio-schedule` | `admin/studio-schedule/page.tsx` | real | studio schedule loader | — | yes | yes |
| `/admin/portfolio-approvals` | `admin/portfolio-approvals/page.tsx` | real (D3) | `getAdminPortfolioApprovalQueue` | — | yes | logged |
| `/admin/portfolio-approvals/[portfolio-id]` | `admin/portfolio-approvals/[portfolio-id]/page.tsx` | real (D3) | `getAdminPortfolioApprovalDetail` | `reviewPortfolioAsAdmin` (RPC `review_portfolio_as_admin`) | already-reviewed state | notFound |
| `/admin/project-approvals` | `admin/project-approvals/page.tsx` | **placeholder** | — | — | n/a | n/a |
| `/admin/notifications` | `admin/notifications/page.tsx` | **placeholder** | — | — | n/a | n/a |
| `/admin/activity-logs` | `admin/activity-logs/page.tsx` | **placeholder** | — | — | n/a | n/a |

## 3. Student routes (`/student/*`)

| URL | File | Impl | Loader | Action | Notes |
|---|---|---|---|---|---|
| `/student/dashboard` | `student/dashboard/page.tsx` | real (**modified, uncommitted**) | `src/lib/data/student/dashboard.ts` (untracked, uncommitted) | — | Stage 3 sync repair in working tree |
| `/student/my-team` | `student/my-team/page.tsx` | real | student team loader | — | |
| `/student/my-stage` | `student/my-stage/page.tsx` | real | student stage loader + `TeamStageTimeline` (modified, uncommitted) | — | |
| `/student/portfolio` | `student/portfolio/page.tsx` | real (**modified, uncommitted**) | `src/lib/data/student/portfolio.ts` (modified, uncommitted) | `bookStudioSlot`, `submitPortfolio` (RPC-backed) | Booking + submission entry point |

## 4. Educator routes (`/educator/*`)

| URL | File | Impl | Loader | Action | Notes |
|---|---|---|---|---|---|
| `/educator/dashboard` | `educator/dashboard/page.tsx` | real (D2) | `src/lib/data/educator/dashboard.ts` | — | Stepwise RLS-safe queries |
| `/educator/my-teams` | `educator/my-teams/page.tsx` | real (D2) | `src/lib/data/educator/teams.ts` | — | |
| `/educator/my-students` | `educator/my-students/page.tsx` | real (D2) | `src/lib/data/educator/students.ts` | — | |
| `/educator/portfolio-reviews` | `educator/portfolio-reviews/page.tsx` | real (D2) | `src/lib/data/educator/portfolio-reviews.ts` | — | Queue matches `team_educators.student_id = leader_student_id` |
| `/educator/portfolio-reviews/[portfolio-id]` | `educator/portfolio-reviews/[portfolio-id]/page.tsx` | real (D2) | review detail loader | `reviewPortfolioAsEducator` (RPC) | |

## 5. External routes (`/external/*`)

| URL | File | Impl | Notes |
|---|---|---|---|
| `/external/dashboard` | `external/dashboard/page.tsx` | **stub** | Heading + comment "Dashboard content — added in a later prompt"; no data |
| `/external/assigned-team` | **no file** | — | **404 — linked from navigation** |
| `/external/project-details` | **no file** | — | **404 — linked from navigation** |
| `/external/notifications` | **no file** | — | **404 — linked from navigation** |

## 6. Navigation findings

Navigation source: `src/lib/permissions/roles.ts` (`ADMIN_NAV_ITEMS`,
`STUDENT_NAV_ITEMS`, `EDUCATOR_NAV_ITEMS`, `EXTERNAL_NAV_ITEMS`).

### 6.1 Dead navigation (links that 404) — VERIFIED_LOCAL_CODE

| Nav item | href | Severity |
|---|---|---|
| External → Assigned Team | `/external/assigned-team` | HIGH for external users (route file does not exist) |
| External → Project Details | `/external/project-details` | HIGH for external users |
| External → Notifications | `/external/notifications` | HIGH for external users |

No admin, student, or educator nav link 404s: every admin nav href has a page
file (three are placeholders that render, not 404).

### 6.2 Placeholder screens reachable from navigation

- `/admin/project-approvals` — Package E shell ("Project Approvals" nav link)
- `/admin/notifications` — Notifications shell
- `/admin/activity-logs` — Activity Logs shell
- `/external/dashboard` — stub content only

### 6.3 Implemented routes missing from navigation

None found. All implemented pages are reachable from their role navigation or
from parent list pages (create/detail routes).

### 6.4 Duplicates / inconsistent names

- No duplicate screens found.
- Route param naming is inconsistent: `/admin/teams/[id]` and
  `/admin/programs/[id]` use `[id]`, while portfolio routes use
  `[portfolio-id]`. Cosmetic only (INFO).

### 6.5 Role leakage

- `src/middleware.ts` matches `/admin/:path*`, `/student/:path*`,
  `/educator/:path*`, `/external/:path*` and each layout enforces
  `canAccessRoleRoute` (strict equality of role). No cross-role nav items
  found. VERIFIED_LOCAL_CODE (not re-verified in browser during this audit).

### 6.6 Mock data check

No route renders hardcoded/mock records. All non-placeholder routes read from
Supabase via loaders. Placeholders render static explanatory text only.

## 7. Build route table (VERIFIED_BUILD 2026-07-14)

`npm run build` succeeded; 34 app routes compiled. `/forgot-password` is
static; all other role routes are dynamic (`ƒ`). Middleware compiled with the
Next.js 16 deprecation notice that `middleware` naming will become `proxy`.
