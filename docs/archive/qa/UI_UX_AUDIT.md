# IncluHub UI/UX Audit — UI-0

**Date:** 2026-07-14
**Scope:** Brand, visual system, and UX consistency (planning only)
**Product state:** Package D complete; Stage 3 workflows functional; Package E / Stage 4–5 paused
**Evidence:** VERIFIED_LOCAL_CODE inspection of layouts, components, and representative pages

---

## 1. Executive UX verdict

The IncluHub dashboard is **functionally coherent but visually immature**. Core workflows (student portfolio, educator review, admin approval) work, but the interface reads as an **early scaffold**: neutral zinc Tailwind classes dominate, shadcn design tokens are defined in `globals.css` yet largely bypassed, page headers and spacing patterns diverge by role, and mobile layouts are effectively unsupported.

**Overall grade:** C+ for UX structure, D+ for visual consistency, C for accessibility baseline.

**Primary risk:** Continued feature work without UI-1 tokens will compound hardcoded color debt (~60+ files with raw `zinc-*`, `amber-*`, `blue-*`, `green-*`, `red-*`).

**Primary opportunity:** A single token pass + shared shell components (UI-1) can unify three portals before UI-2–UI-4 role polish.

---

## 2. Design system baseline (current)

### 2.1 Colors

| Layer | Current state | Problem |
|---|---|---|
| CSS variables | shadcn oklch tokens in `globals.css` (`--background`, `--primary`, `--destructive`, etc.) | Used mainly by shadcn primitives, not app screens |
| Page background | `bg-zinc-50` hardcoded in `RoleLayout` | Not `--background` |
| Sidebar | `bg-zinc-100`, active `bg-zinc-900 text-white` | Not `--sidebar-*` tokens despite definitions |
| Cards | `bg-white border-zinc-200` | Duplicated ~40+ times |
| Status panels | amber (revision), blue (assistant), green (success), red (errors) | No shared semantic status tokens |
| Login | `bg-zinc-50`, card `shadow-sm` | Only polished isolated screen |

**Hardcoded color hotspots:** `Sidebar.tsx`, `RoleLayout.tsx`, `StatusBadge.tsx`, all `studio/*` portfolio components, `QueryErrorState.tsx`, `EmptyState.tsx`, educator/admin list pages, stage board.

### 2.2 Typography

- **Fonts loaded:** Geist Sans + Geist Mono via `next/font` in `layout.tsx` as `--font-geist-sans`, `--font-geist-mono`.
- **Bug:** `globals.css` sets `--font-sans: var(--font-sans)` (circular) and `@theme` references `--font-sans` — font may fall back to system UI.
- **Scale:** Ad hoc — `text-2xl font-semibold` for page titles, `text-sm` for body, `text-xs` for meta. No documented ramp.
- **Monospace:** Used only where shadcn defaults apply; IDs and codes not consistently styled.

### 2.3 Spacing

- **Layout padding:** `RoleLayout` main area `p-6`; many pages add another `p-6` or `space-y-6` → **double padding** on some routes.
- **Card padding:** Mix of `p-4`, `p-5`, `p-6` without rule.
- **Grid gaps:** `gap-4`, `gap-6` used interchangeably on dashboards.
- **Sidebar width:** Fixed `w-64` (256px) — no collapse.

### 2.4 Border radius

- Global `--radius: 0.625rem` (10px).
- Cards: `rounded-lg` (8px) and `rounded-xl` (12px) both appear.
- Buttons/inputs: shadcn default `rounded-md`.
- Status callouts: `rounded-lg` consistently.

### 2.5 Shadows

- Minimal usage: login card `shadow-sm`, some stage cards `shadow-sm`.
- Most cards: border-only, flat.
- No elevation system.

### 2.6 Page widths

- No max-width container on content — full fluid width inside `flex-1` main.
- Wide tables (users, teams, stage board) stretch edge-to-edge on large monitors.
- Forms (booking, resubmit) reasonably constrained via card width but not tokenized.

---

## 3. Navigation and layout

### 3.1 Shared shell

```
RoleLayout
├── Sidebar (fixed w-64, zinc-100)
│   ├── "IncluHub" + role label
│   └── Nav links from roles.ts
└── Main column
    ├── Header (border-b, Sign out button)
    └── {children} with p-6
```

**Issues:**

- No `AppShell` abstraction — layout logic split across `RoleLayout`, `Sidebar`, per-page wrappers.
- **No mobile navigation** — sidebar always visible; 256px + content unusable below ~768px.
- Header is minimal (sign-out only) — no breadcrumbs, page title, or contextual actions.
- External member nav includes **3 routes that 404** (verified in route registry).

### 3.2 Navigation items by role

| Role | Items | Placeholder / broken |
|---|---|---|
| Admin | 14 | project-approvals, notifications, activity-logs → `PlaceholderPage` |
| Student | 4 | All implemented |
| Educator | 4 | All implemented |
| External | 4 | 3 links → no page (404) |

### 3.3 Header patterns

| Pattern | Used on | Issue |
|---|---|---|
| Inline `<h1>` + subtitle in page | Admin dashboard, some admin pages | Inconsistent with RecordPageHeader |
| `RecordPageHeader` | Educator lists, student team, admin CRUD lists | Good pattern but not universal |
| No page header | Student portfolio (title inside cards) | Weak hierarchy |

---

## 4. Component audit

### 4.1 Dashboards

| Role | Content | Issues |
|---|---|---|
| Admin | Single “Pending portfolio approvals” metric + link | Sparse vs educator; no system overview |
| Student | Stage panels + portfolio CTAs | Dense but visually fragmented (multiple card styles) |
| Educator | 4 metric cards + quick links | Best structured dashboard; still raw zinc |
| External | Placeholder welcome | Minimal |

### 4.2 Cards

- shadcn `Card` used in some places; many custom `div` with `rounded-lg border bg-white p-*`.
- Portfolio workflow cards (`PortfolioCard`, revision, booking) each define own border/background semantics.
- Metric cards on educator dashboard: custom grid, not shared `DashboardMetricCard`.

### 4.3 Tables

- shadcn `Table` on admin/educator list pages.
- Inline status via `StatusBadge` or raw text.
- No shared `DataTable` with loading/empty/error slots.
- Horizontal scroll on mobile not tested — likely breaks.

### 4.4 Forms

- shadcn `Input`, `Label`, `Button`, `Textarea` on booking/resubmit.
- Validation errors: mix of inline red text and server message strings.
- **Good:** Resubmit form preserves fields on validation error (server action pattern).
- **Weak:** No `FormSection` grouping; long portfolio page stacks many forms.

### 4.5 Badges and status

- `StatusBadge`: maps generic strings (`active`, `pending`, etc.) — **does not cover `portfolio_workflow_status` enum**.
- Portfolio status: duplicated switch/map logic in `PortfolioCard`, educator review, admin approval panels.
- Color-only cues in sidebar active state (white on black, no icon change).

### 4.6 Buttons

- shadcn `Button` with variants — generally consistent.
- Primary actions sometimes duplicated (link + button for same destination on student dashboard).
- Destructive actions (cancel booking) use `variant="destructive"` — **no confirmation dialog** in some paths.

### 4.7 Dialogs

- shadcn `Dialog` exists in component library.
- **Underused:** Confirmations rely on inline warnings, not dialog pattern.
- Admin approval actions: inline forms, not modal.

### 4.8 Loading states

- **No `LoadingSkeleton` component.**
- Studio slot grid: text “Checking availability…” only.
- Server pages: no `loading.tsx` skeletons on most routes.
- Risk: slow loads look like empty data.

### 4.9 Empty states

- `EmptyState` component exists — centered icon area, title, description, optional action.
- Used on some list pages; not on all tables.
- Student portfolio: empty vs populated handled inside cards, not EmptyState.

### 4.10 Error states

- `QueryErrorState`: red bordered box; **title hardcoded “Could not load users”** regardless of context.
- Generic error messages — good for security; bad for user guidance (no retry button pattern).

---

## 5. Role-specific UX issues

### 5.1 Student

| Issue | Severity | Evidence |
|---|---|---|
| Portfolio page redundancy (own panel + full list) | Medium | `student/portfolio/page.tsx` |
| Revision/resubmit visually disconnected from main card flow | Medium | Separate amber panels, no step progress |
| Booking UX dense on small screens | High | Slot grid + side panel layout |
| No mobile nav | High | Fixed sidebar |
| Dashboard CTA duplication | Low | Stage panel + portfolio links |
| Version history readable but monospace/date formatting inconsistent | Low | `PortfolioVersionHistory` |

### 5.2 Educator

| Issue | Severity | Evidence |
|---|---|---|
| Review detail page long scroll, no section nav | Medium | `educator/portfolio-reviews/[id]` |
| Review history vs admin submission history — similar UI, different components | Medium | `ReviewHistory` vs `SubmissionVersionHistory` |
| Portfolio review list filters basic | Low | Text search only |
| Good use of RecordPageHeader on list pages | Positive | — |

### 5.3 Admin

| Issue | Severity | Evidence |
|---|---|---|
| Dashboard underwhelming vs operational scope | Medium | Single metric |
| Placeholder nav items visible (3) | Medium | Confusing “coming soon” without badge |
| Stage board visually dense, unclear mobile | High | Kanban-style columns |
| Studio schedule calendar UX unverified for touch | Medium | — |
| User management uses QueryErrorState wrong title | Low | Copy bug |
| Approval workflow functional but visually same as educator review | Low | Expected for MVP |

### 5.4 External member

| Issue | Severity | Evidence |
|---|---|---|
| 3 of 4 nav links broken | Critical | Routes missing |
| Placeholder dashboard only | Expected | Per scope pause |

---

## 6. Shared-component problems

| Component | Status | Recommendation |
|---|---|---|
| `RoleLayout` | Keep, refactor | Extract `AppShell`; fix double padding |
| `Sidebar` | Keep, refactor | Use sidebar tokens; add mobile drawer |
| `RecordPageHeader` | Keep, extend | Standardize all pages |
| `StatusBadge` | Repair | Add workflow_status map |
| `EmptyState` | Keep | Mandate for all lists |
| `QueryErrorState` | Repair | Parameterize title; add retry |
| `PlaceholderPage` | Keep | Add “Coming later” badge in nav |
| `PortfolioCard` + studio panels | Merge patterns | Shared `PortfolioStatusPanel` |
| History components (×3) | Merge | Single `Timeline` / `VersionHistory` |
| shadcn primitives | Keep | Wire to tokens |
| **Missing:** `LoadingSkeleton` | Create | UI-1 |
| **Missing:** `MobileNavigation` | Create | UI-1 |
| **Missing:** `PageHeader` / `SectionHeader` | Create | UI-1 |
| **Missing:** `ConfirmationDialog` | Create | UI-2+ |
| **Missing:** `DashboardMetricCard` | Create | UI-1 |

---

## 7. Accessibility findings

| Check | Status | Notes |
|---|---|---|
| Focus visible on shadcn buttons | Pass | `focus-visible:ring-*` |
| Focus on custom slot buttons | Partial | Studio grid buttons need audit |
| Color-only status | Fail | Sidebar active, some badges |
| Contrast zinc-500 on zinc-50 | Partial | Meta text may fail AA on small sizes |
| Heading hierarchy | Partial | Multiple h1 patterns; some pages skip h1 |
| Form labels | Pass | shadcn Label used |
| Keyboard nav sidebar | Pass | Links are anchors |
| Screen reader live regions | Fail | Loading/status changes not announced |
| Error association | Partial | Errors not always linked via aria-describedby |
| Skip link | Fail | Not present |
| Touch targets (mobile) | Fail | Sidebar consumes width; small slot cells |

---

## 8. Mobile behavior summary

- **Breakpoint usage:** Tailwind responsive classes rarely used in layouts (`md:`, `lg:` sparse).
- **Sidebar:** Always fixed 256px — **critical mobile failure**.
- **Tables:** Likely horizontal overflow without sticky columns.
- **Forms:** Stack adequately but padding excessive.
- **Booking grid:** Needs single-column collapse + sticky action bar.

---

## 9. Duplicated / inconsistent patterns (inventory)

1. Page title: inline h1 vs RecordPageHeader vs none
2. Card wrapper: shadcn Card vs custom div
3. Status colors: StatusBadge vs inline amber/blue/green blocks
4. History lists: 3 separate components
5. Success messages: green bordered div (copy-pasted)
6. Warning messages: amber bordered div (copy-pasted)
7. List page layout: RecordPageHeader + table vs dashboard grid
8. Padding: layout + page double p-6

---

## 10. Pages feeling unfinished or disconnected

| Page | Why |
|---|---|
| Admin dashboard | Single card, no visual hierarchy |
| External dashboard + nav | Broken links, placeholder |
| Admin placeholders (3) | Nav visible, page says placeholder — nav should signal state |
| Student portfolio | Multiple visual languages on one page |
| Educator review detail | Functional but document-like, not review workspace |

---

## 11. What not to change (UI-0 scope boundary)

- Route URLs
- Workflow statuses and labels from backend
- Permissions and role gates
- RPCs, server actions, loaders
- Database
- Stage 4/5 features, notifications

---

## 12. Audit conclusion

IncluHub needs a **token-first unification (UI-1)** before role-specific visual polish. The highest-impact fixes are: mobile shell, semantic status tokens, universal page headers, loading skeletons, and merging portfolio/history UI patterns. Brand direction **B (Modern Education SaaS)** is the best fit for the current codebase and timeline.
