# IncluHub Design Token Plan

**Date:** 2026-07-14
**Status:** **UI-1A implemented** in `src/app/globals.css` — brand tokens, typography scale, radius/elevation foundations, and Tailwind `@theme` mappings.
**Approved direction:** B — Modern Education SaaS · Primary burgundy `#6B1F2A`
**Prerequisite met:** Product owner approved palette (see `BRAND_REQUIREMENTS.md`)

---

## 1. Goals

1. Single source of truth for all visual properties
2. Semantic tokens (not raw palette) in application code
3. shadcn compatibility via CSS variables in `globals.css`
4. Tailwind 4 `@theme` mapping for utility classes
5. **Rule:** No component uses arbitrary repeated hardcoded colors when a semantic token exists

---

## 2. Token architecture

```
brand.*           → Approved burgundy palette
semantic.*        → shadcn bridge (--background, --primary, …)
surface.*         → Page / card / muted / inset
text.*            → Primary / muted / subtle
border.*          → Default / strong
radius.*          → Card / control / dialog (+ shadcn --radius)
elevation.*       → none / sm / md / lg (defined only in UI-1A)
status.*          → success / warning / danger / info (+ soft)
typography.*      → Geist stacks + type scale tokens
```

---

## 3. Brand tokens (approved)

```css
--brand-primary:            #6B1F2A;
--brand-primary-hover:      #571923;
--brand-primary-soft:       #F5E9EC;
--brand-primary-foreground: #FFFFFF;
```

**Role accents:** Shared burgundy for all roles (no per-role brand colors).

**Logo assets (approved; UI-1B integration only):**

| Role | Path |
|---|---|
| Canonical | `public/brand/incluhub-logo.svg` |
| Fallback | `public/brand/incluhub-logo.png` |

UI-1A does **not** place the logo in components. See `public/brand/README.md` and `BRAND_REQUIREMENTS.md` §3.

---

## 4. Surface, text, border tokens (approved)

```css
--surface-page:  #F8F6F5;
--surface-card:  #FFFFFF;
--surface-muted: #F1EDEC;
--surface-inset: #F1EDEC;

--text-primary:  #241F20;
--text-muted:    #71686A;
--text-subtle:   #9A9294;   /* derived lighter muted for tertiary text */

--border-default: #E3DCDD;
--border-strong:  #C9C0C1;  /* derived stronger border */
```

---

## 5. Status tokens (approved + soft surfaces)

Semantic status colors are **not** burgundy.

```css
--status-success:      #2F6B4F;
--status-success-soft: #E9F3EE;
--status-warning:      #9A6700;
--status-warning-soft: #FBF5E6;
--status-danger:       #B42318;
--status-danger-soft:  #FBECEA;
--status-info:         #315E91;
--status-info-soft:    #EAF0F7;
```

Soft surfaces were derived as light tints of the approved status hues for callouts/panels (UI-2+ adoption).

### Portfolio workflow mapping (style only — labels unchanged)

| workflow_status | Semantic |
|---|---|
| `draft` | info |
| `submitted` | info |
| `in_educator_review` | warning |
| `revision_requested` | warning |
| `resubmitted` | info |
| `in_assistant_review` | info |
| `in_admin_review` | warning |
| `approved` | success |
| `rejected` | danger |

---

## 6. shadcn semantic mapping (UI-1A)

| shadcn variable | Maps to |
|---|---|
| `--background` | `--surface-page` |
| `--foreground` | `--text-primary` |
| `--card` | `--surface-card` |
| `--card-foreground` | `--text-primary` |
| `--popover` / `--popover-foreground` | card / text-primary |
| `--primary` | `--brand-primary` |
| `--primary-foreground` | `--brand-primary-foreground` |
| `--secondary` | `--surface-muted` |
| `--secondary-foreground` | `--text-primary` |
| `--muted` | `--surface-muted` |
| `--muted-foreground` | `--text-muted` |
| `--accent` | `--brand-primary-soft` |
| `--accent-foreground` | `--brand-primary` |
| `--destructive` | `--status-danger` |
| `--border` | `--border-default` |
| `--input` | `--border-default` |
| `--ring` | `--brand-primary` |
| `--sidebar-primary` | `--brand-primary` |
| `--sidebar` | `--surface-muted` |

---

## 7. Typography

### Font stacks (UI-1A repair)

**Bug found:** `@theme inline { --font-sans: var(--font-sans); }` was circular. `next/font` correctly exposed `--font-geist-sans` / `--font-geist-mono` on `<html>`, but the theme never referenced them.

**Repair:**

```css
--font-sans: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif;
--font-mono: var(--font-geist-mono), ui-monospace, monospace;
```

Defined in both `:root` and `@theme inline`. `layout.tsx` unchanged (still uses `variable: "--font-geist-sans"` / `"--font-geist-mono"`).

### Type scale (tokens only — not forced onto headings in UI-1A)

| Token | Size | Line height | Weight | Tailwind utility concept |
|---|---|---|---|---|
| display | 32px | 40px | 600 | `text-display` |
| page title | 24px | 32px | 600 | `text-page-title` |
| section title | 20px | 28px | 600 | `text-section-title` |
| body large | 16px | 24px | 400 | `text-body-lg` |
| body | 14px | 20px | 400 | `text-body` |
| label | 14px | 20px | 500 | `text-label` |
| caption | 12px | 16px | 400 | `text-caption` |

Also mirrored as `--type-*-size|line-height|weight` CSS vars in `:root`.

---

## 8. Radius and elevation

```css
--radius:         0.625rem; /* 10px card standard */
--radius-card:    0.625rem; /* 10px */
--radius-control: 0.5rem;   /* 8px */
--radius-dialog:  0.75rem;  /* 12px */

--elevation-none: none;
--elevation-sm:   0 1px 2px 0 rgb(36 31 32 / 0.05);
--elevation-md:   0 4px 6px -1px …;
--elevation-lg:   0 10px 15px -3px …;
```

Exposed via `@theme` as `--radius-card|control|dialog` and `--shadow-none|sm|md|lg`.
**UI-1A does not apply shadows broadly to components.**

---

## 9. Tailwind 4 theme mapping (`@theme inline`)

Conceptual utilities now available:

| Utility | Token |
|---|---|
| `bg-surface-page` | `--surface-page` |
| `bg-surface-card` | `--surface-card` |
| `bg-surface-muted` | `--surface-muted` |
| `bg-surface-inset` | `--surface-inset` |
| `text-text-primary` | `--text-primary` |
| `text-text-muted` | `--text-muted` |
| `text-text-subtle` | `--text-subtle` |
| `border-border-default` | `--border-default` |
| `border-border-strong` | `--border-strong` |
| `bg-brand-primary` / `text-brand-primary` | `--brand-primary` |
| `bg-brand-primary-soft` | `--brand-primary-soft` |
| `bg-brand-primary-hover` | `--brand-primary-hover` |
| `bg-status-success` / `bg-status-success-soft` | status tokens |
| `text-status-warning`, `bg-status-danger-soft`, … | status tokens |
| `bg-primary`, `text-muted-foreground`, … | shadcn bridge |

No second Tailwind config was added.

---

## 10. Base styles (UI-1A)

- `body` → `background: var(--surface-page)`, `color: var(--text-primary)`, Geist Sans
- `code, kbd, samp, pre` → Geist Mono
- `::selection` → soft burgundy background
- Focus ring (`--ring`) → brand burgundy
- Dark mode switch: **not implemented**; `.dark` block preserved

---

## 11. What UI-1A does **not** include

- Navigation / mobile shell (UI-1B)
- Component or page redesigns
- StatusBadge / layout refactors
- Dark-mode feature switch
- Per-role accent colors

---

## 12. Migration priority (remaining after UI-1A)

1. ~~Fix font variable wiring~~ **Done (UI-1A)**
2. ~~Define brand + status tokens + @theme~~ **Done (UI-1A)**
3. UI-1B: AppShell / RoleSidebar / MobileNavigation consume tokens
4. Extend StatusBadge for portfolio workflow statuses
5. Replace portfolio panel amber/blue/green with status tokens
6. Sweep remaining `zinc-*` in components by directory

---

## 13. Validation checklist

### UI-1A (this package)

- [x] Font circular reference repaired
- [x] Approved brand palette in `:root`
- [x] Status tokens separate from brand
- [x] shadcn semantic mapping updated
- [x] Tailwind `@theme` exposes surface/brand/status utilities
- [x] Type scale tokens defined (not forced on headings)
- [x] 10px card radius foundation
- [x] Elevation tokens defined, not broadly applied
- [x] Dark mode deferred; `.dark` preserved
- [x] No component/layout redesigns
- [x] Docs updated (`BRAND_REQUIREMENTS.md`, this file)

### Later packages

- [ ] No `zinc-*` / ad-hoc status colors in `src/components/layout/*`
- [ ] StatusBadge covers all portfolio workflow statuses
- [ ] Contrast QA on status combinations
