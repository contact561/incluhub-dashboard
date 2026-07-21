# UI-1 Foundation Verification — UI-1D

**Date:** 2026-07-15  
**Scope:** Verify UI-1A / UI-1B / UI-1C foundation; controlled repairs only  
**Status:** Complete — UI-1 foundation **PASS** (ready for UI-2)

---

## 1. Package status

| Slice | Status | Verdict |
|---|---|---|
| **UI-1A** | Done | Brand tokens + typography verified |
| **UI-1B1 / UI-1B2** | Done | Desktop/mobile shell + logo + login branding verified |
| **UI-1C1** | Done | Status primitives + canonical workflow mapping verified |
| **UI-1C2A** | Done | Loading / empty / error verified |
| **UI-1C2B** | Done | PageHeader / SectionHeader / DashboardMetricCard / RecordPageHeader wrapper verified |
| **UI-1D** | **Done** | Verification + 2 controlled foundation repairs |

**UI-1 complete.** Role-page adoption remains UI-2 / UI-3 / UI-4.

---

## 2. Files inspected

### Brand
- `src/app/globals.css`
- `src/app/layout.tsx`
- `public/brand/*` (SVG, PNG, README)
- `docs/design/BRAND_REQUIREMENTS.md`
- `docs/design/DESIGN_TOKEN_PLAN.md`

### Shell and navigation
- `src/components/layout/AppShell.tsx`
- `src/components/layout/RoleLayout.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/components/layout/MobileNavigation.tsx`
- `src/components/layout/PortalNavList.tsx`
- `src/lib/permissions/roles.ts`
- `src/app/login/page.tsx`

### Status and state
- `src/components/status/*`
- `src/lib/status/status-intent.ts`
- `src/lib/portfolio/workflow-status.ts`
- `src/lib/constants/stage-labels.ts` (label source)
- `src/types/database.ts` (`PortfolioWorkflowStatus`)

### Structural
- `src/components/layout/PageHeader.tsx`
- `src/components/layout/SectionHeader.tsx`
- `src/components/layout/DashboardMetricCard.tsx`
- `src/components/tables/RecordPageHeader.tsx`
- `src/components/layout/index.ts`

---

## 3. Brand verification

| Check | Result |
|---|---|
| Primary color `#6B1F2A` / `#6b1f2a` | **Pass** (`--brand-primary`) |
| Geist Sans / Geist Mono resolve | **Pass** (`layout.tsx` sets `--font-geist-*`; `@theme` / `:root` map `--font-sans` / `--font-mono`) |
| Dark mode deferred | **Pass** (`.dark` block preserved; no theme switch) |
| Official transparent SVG used via URL | **Pass** (`/brand/incluhub-logo.svg` in Sidebar, MobileNavigation, login — not inlined) |
| Favicon deferred | **Pass** (documented; default Next favicon remains) |

---

## 4. Shell verification

| Check | Result |
|---|---|
| Desktop sidebar `md:flex` / `hidden` below md | **Pass** |
| Mobile header `md:hidden` | **Pass** |
| Logo aspect ratio (`object-contain`, fixed box) | **Pass** |
| Role label via `portalTitle` / `ROLE_LABELS` | **Pass** |
| Sign-out (`logoutAction`) desktop + mobile drawer | **Pass** (auth action unchanged) |
| Skip link → `#main-content` | **Pass** (`main id="main-content" tabIndex={-1}`) |
| Shell `min-w-0 overflow-x-hidden` | **Pass** |

---

## 5. Desktop / mobile navigation verification

| Check | Result |
|---|---|
| Same `NavItem[]` metadata (PortalNavList) | **Pass** |
| Active route not color-only | **Pass** (soft fill + left border + `aria-current="page"`) |
| Admin placeholders “Coming later” | **Pass** (project-approvals, notifications, activity-logs) |
| External broken links `hidden: true` | **Pass** (assigned-team, project-details, notifications) |
| Route URLs / permissions unchanged | **Pass** (nav visibility only) |

---

## 6. Logo verification

| Check | Result |
|---|---|
| Canonical SVG present | **Pass** (`public/brand/incluhub-logo.svg`) |
| PNG fallback present | **Pass** |
| External `<Image src="/brand/...">` | **Pass** |
| Login branding | **Pass** |

**Doc drift (non-blocking):** `public/brand/README.md` integration table still says UI-1B “Not started” — deferred cleanup; does not affect runtime.

---

## 7. Status-system verification

| Check | Result |
|---|---|
| Canonical statuses (7) | **Pass** — `locked`, `awaiting_booking`, `awaiting_submission`, `pending_educator`, `pending_admin`, `revision_required`, `completed` |
| No invented workflow values in UI-1 | **Pass** |
| `PortfolioWorkflowBadge` labels from `PORTFOLIO_WORKFLOW_STATUS_LABELS` | **Pass** |
| `StatusPanel` semantic intents | **Pass** |
| Generic `StatusBadge` backward-compatible | **Pass** (string statuses + `formatStatusLabel`) |

---

## 8. Shared loading / empty / error verification

| Check | Result |
|---|---|
| `LoadingSkeleton` page/cards/table/list/form | **Pass** |
| `EmptyState` optional action / secondaryAction | **Pass** |
| `QueryErrorState` title + “Something went wrong” fallback | **Pass** |
| Retry manual only | **Pass** |
| No automatic technical stack dump in component | **Pass** (callers may still pass `message={error}` — role-page hygiene deferred) |

---

## 9. Header and metric-card verification

| Check | Result |
|---|---|
| `PageHeader` single `h1` | **Pass** |
| `SectionHeader` `h2` / `h3` only | **Pass** |
| `RecordPageHeader` props compatible wrapper | **Pass** |
| Linked `DashboardMetricCard` focus ring + `aria-label` | **Pass** |
| Usable at 375px (stacking / `min-w-0`) | **Pass** (code-level) |

---

## 10. Accessibility checks

| Check | Result |
|---|---|
| Skip link target | **Pass** |
| Nav `aria-current` + non-color active cue | **Pass** |
| Decorative icons `aria-hidden` on badges / metrics | **Pass** |
| Mobile menu open/close labels | **Pass** |
| `StatusPanel` danger live region | **Pass after repair** (`role="alert"`) |
| `QueryErrorState` `role="alert"` | **Pass** |
| `LoadingSkeleton` `role="status"` + sr-only text | **Pass** |

---

## 11. Responsive checks

| Viewport | Expectation | Result |
|---|---|---|
| ~375px | Mobile header + drawer; no shell overflow | **Pass** — mobile header visible; sidebar `display:none`; drawer open/close; `scrollWidth === clientWidth` |
| ~768px | `md` breakpoint — desktop sidebar appears | **Pass** — aside `display:flex`; mobile header `display:none` |
| ~1280px | Sidebar + desktop header | **Pass** — same as md+ |

### Browser session notes (2026-07-15)

Authenticated as IncluHub Test Admin:

- `/admin/dashboard` — logo SVG, active Dashboard (`aria-current` + left border), Coming later ×3, Sign out, EmptyState, no shell overflow
- `/admin/portfolio-approvals` — RecordPageHeader h1 + EmptyState; page loads
- Mobile drawer — Open/Close labels; Coming later badges; Sign out control present
- Cross-role `/student/dashboard` while admin — redirected to admin dashboard (permissions unchanged)
- Sign out → `/login` — logo `/brand/incluhub-logo.svg`, primary button `rgb(107, 31, 42)` = `#6B1F2A`
- Logged-out `/educator/dashboard` → `/login` (auth gate unchanged)

**Known non-blocking:** Next.js hydration warning occasionally surfaces on Button (shadcn/Base UI) in dev overlay — pre-existing component library noise; not a UI-1 token/shell regression and not introduced by UI-1D repairs.

Role-specific educator/student/external **authenticated** page content not re-logged in this session; shell is shared via `RoleLayout` and was verified on admin.

---

## 12. Defects found

### Blocking / foundation (repaired)
1. **Circular radius theme tokens** in `globals.css` `@theme inline`: `--radius-card: var(--radius-card)` (and control/dialog) — same defect class as pre-UI-1A font circularity.
2. **`StatusPanel` danger a11y:** always used `role="status"`; danger should announce as `role="alert"`.

### Non-blocking / deferred
3. Role pages still use hardcoded zinc titles/cards — UI-2 / UI-3 / UI-4.
4. Duplicate shell `main` padding + page-level `p-6` — UI-2 / UI-3 / UI-4.
5. Dashboards not yet adopting `DashboardMetricCard` / `PageHeader` — UI-2 / UI-3 / UI-4.
6. Stale `public/brand/README.md` integration status row.
7. Pre-existing lint warnings (seed script unused `key`; admin portfolio-approvals unused `Link`; unused `TeamStageDetail` type) — unrelated to UI-1.

---

## 13. Repairs made

| File | Repair |
|---|---|
| `src/app/globals.css` | Set concrete `@theme` `--radius-card` / `--radius-control` / `--radius-dialog` values |
| `src/components/status/StatusPanel.tsx` | `role="alert"` when `variant === "danger"`, else `role="status"` |

No role pages, loaders, actions, routes, or workflow values changed.

---

## 14. Deferred role-page issues (UI-2 / UI-3 / UI-4)

**Student:** dashboard / my-stage / portfolio — zinc `h1`, adopt PageHeader / status / empty-error loading  
**Educator:** dashboard metric cards → `DashboardMetricCard`; review list/detail headers & status panels  
**Admin:** dashboard metric tile; users / stage board / portfolio approvals token adoption  
**External:** dashboard zinc title only (limited scope)

---

## 15. Technical-check results

| Check | Result |
|---|---|
| `git diff --check` | Pass |
| `npm run lint` | 0 errors; 3 pre-existing warnings |
| `npx tsc --noEmit` | Pass |
| `npm run build` | Pass |

---

## 16. Final UI-1 verdict

**PASS — UI-1 foundation is complete and safe.**

Blocking foundation defects found during UI-1D were repaired. Remaining issues are intentional adoption debt on role pages, not foundation blockers.

---

## 17. Readiness decision for UI-2

**UI-2 (Student portal redesign) is safe to start.**

Constraints for UI-2:
- Adopt shared primitives; do not reinvent tokens/status/headers
- Do not change loaders, actions, routes, workflow values, or permissions
- Do not begin Stage 4 / Stage 5 / notifications
