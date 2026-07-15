# IncluHub Brand Requirements

**Date:** 2026-07-14 (logo intake updated 2026-07-15)
**Status:** Direction and palette **approved**. UI-1A token foundation implemented. Logo assets **ingested** into `public/brand/` — layout integration still deferred to **UI-1B**.
**Evidence base:** PO approval + `src/app/globals.css`, `components.json`, `src/app/layout.tsx`, `public/brand/`.

---

## 1. Brand purpose

IncluHub is a **post-academic creative education workflow platform** connecting students, educators, admins, and external members through sequential team stages (onboarding → team assignment → BMS → portfolio production → brand project → ecosystem unlock).

The visual system must communicate:

- **Professional trust** (institutional admin workflows)
- **Creative energy** (photography, makeup, hairstyling portfolios)
- **Clarity under complexity** (multi-role, multi-stage, review chains)

---

## 2. Approved decisions (product owner)

| Decision | Status | Value |
|---|---|---|
| Visual direction | **Approved** | **B — Modern Education SaaS** |
| Primary brand color | **Approved** | Burgundy `#6B1F2A` |
| Primary hover | **Approved** | `#571923` |
| Primary soft | **Approved** | `#F5E9EC` |
| Page background | **Approved** | `#F8F6F5` |
| Card background | **Approved** | `#FFFFFF` |
| Muted surface | **Approved** | `#F1EDEC` |
| Primary text | **Approved** | `#241F20` |
| Muted text | **Approved** | `#71686A` |
| Border | **Approved** | `#E3DCDD` |
| Success | **Approved** | `#2F6B4F` |
| Warning | **Approved** | `#9A6700` |
| Danger | **Approved** | `#B42318` |
| Information | **Approved** | `#315E91` |
| Font family (UI) | **Approved** | Geist Sans |
| Font family (technical) | **Approved** | Geist Mono |
| Role accents | **Approved** | Shared brand burgundy for all roles |
| Dark mode | **Deferred** | Preserve `.dark` CSS structure only; no switch |
| Card radius | **Approved** | 10px (`0.625rem`) |
| Logo assets | **Ingested — UI ready for UI-1B** | Transparent SVG canonical + PNG fallback in `public/brand/` |
| Favicon | **Deferred** | Next.js default remains |
| Separate mark SVG | **Deferred / not required** | Canonical SVG is already mark-only |

---

## 3. Logo and brand asset status

### 3.1 Intake verdict (2026-07-15)

**Logo assets ingested. Transparent SVG selected as canonical. Ready for UI-1B layout integration.**

Artwork was **byte-copied** only — not cropped, recolored, traced, regenerated, or overwritten in intake.

### 3.2 Repository asset paths

| Asset | Path | Role |
|---|---|---|
| Canonical UI logo | `public/brand/incluhub-logo.svg` | Prefer in app UI |
| Fallback | `public/brand/incluhub-logo.png` | 1024×1024 PNG with alpha |
| Brand folder notes | `public/brand/README.md` | Intake rules for implementers |

### 3.3 Transparency and vector inspection (verified)

| Check | Result |
|---|---|
| SVG transparency | **Transparent** — corner alpha `0` when rendered; no full-bleed black `<rect>` |
| PNG transparency | **Transparent** — corners alpha `0`; has alpha channel |
| Composite on `#F8F6F5` | Page color preserved at edges (no black square plate) |
| SVG vector status | **True vector** — ~2119 `<path>` elements; no base64/`<image>` raster embed |
| Black-square on light UI | **Does not apply** to these files — **approved for light backgrounds** |
| Artwork modified on intake | **No** |

### 3.4 Preferred asset order — current status

| Preference | Status |
|---|---|
| 1. SVG with transparent background | **Present** — `public/brand/incluhub-logo.svg` (**canonical**) |
| 2. High-resolution transparent PNG | **Present** — `public/brand/incluhub-logo.png` (**fallback**) |
| 3. Separate icon/mark asset | **Deferred** — canonical SVG is mark-only; no second file required for UI-1B |
| 4. Favicon asset | **Deferred** — Next.js `src/app/favicon.ico` remains |

### 3.5 Historical note (pre-intake audit)

Earlier 92×92 chat attachments were **not** production-ready and were **not** copied into the repo. Superseded by the 2026-07-15 PNG/SVG intake above.

### 3.6 Usage rules (apply in UI-1B)

| Rule | Requirement |
|---|---|
| **Canonical path** | `/brand/incluhub-logo.svg` (from `public/brand/incluhub-logo.svg`) |
| **Fallback path** | `/brand/incluhub-logo.png` |
| **Preserve aspect ratio** | Always — `object-contain` / SVG `preserveAspectRatio` |
| **No stretch** | Never force non-uniform width/height |
| **Minimum clear space** | ≥ **¼ of the mark height** on all sides |
| **Minimum display size** | Prefer **28–32 CSS px** tall in sidebar; absolute floor **20 CSS px**; avoid tiny sizes (detail-heavy mark) |
| **Light-background usage** | **Approved** for current transparent SVG/PNG on `#F8F6F5` / `#FFFFFF` / `#F1EDEC` |
| **Opaque black-plate logos** | **NOT APPROVED FOR LIGHT UI USE** — archive only; keep text wordmark until transparent asset exists |
| **Dark-background usage** | Deferred with dark mode; do not invert without PO approval |
| **Sidebar (UI-1B)** | Mark + “IncluHub” text; role label secondary |
| **Mobile header (UI-1B)** | Compact mark + optional wordmark |
| **Favicon** | Deferred |
| **Recolor** | No recolor without product-owner approval |

### 3.7 Current product behavior (until UI-1B)

- Sidebar still uses text wordmark **“IncluHub”** (components **not** changed in this intake)
- Assets exist in repo for UI-1B; **do not** base64-embed logos in components
- Favicon remains Next.js default

---

## 4. Visual directions (reference)

### Direction A — Premium Creative Institution — not selected

Editorial, gallery-like; warmer creative institution cues. Deferred as primary direction.

### Direction B — Modern Education SaaS — **APPROVED**

| Aspect | Decision |
|---|---|
| **Visual mood** | Clean, approachable, productized |
| **Color approach** | Burgundy primary + warm neutrals + semantic status palette |
| **Typography** | Geist Sans (UI) + Geist Mono (technical) |
| **Component style** | Token-driven shadcn; consistent cards, sidebar, dense-but-readable tables |
| **Suitability** | Operational clarity across Student / Educator / Admin portals |

### Direction C — Minimal Professional Operating System — not selected

Near-monochrome utility OS. Not selected; current zinc scaffold is superseded by Direction B tokens.

---

## 4. Brand constraints (non-negotiable)

1. **Status text must remain driven by `workflow_status`** — tokens style, never rename labels.
2. **Status colors are semantic** — success / warning / danger / info are **not** replaced with burgundy.
3. **Shared role accent** — all portals use the same primary brand color; role labels provide separation.
4. **Accessibility:** WCAG 2.1 AA contrast minimum for text and interactive elements.
5. **Mobile:** Student booking and review flows must remain usable at 375px width (UI-1B+).

---

## 5. Logo and naming usage (current)

See **§3 Logo and brand asset status**.

- Assets on disk: `public/brand/incluhub-logo.svg` (canonical), `public/brand/incluhub-logo.png` (fallback)
- Live UI: text wordmark **“IncluHub”** until UI-1B integrates the SVG
- Favicon: Next.js default (deferred)

---

## 6. Implementation status

| Package | Status |
|---|---|
| UI-0 audit docs | Complete |
| **UI-1A — tokens + typography** | **Implemented** (`globals.css`) |
| Logo asset intake | **Complete** — transparent SVG + PNG in `public/brand/` |
| UI-1B — navigation / mobile shell (+ logo layout) | Not started — **unblocked for logo** |
| UI-2–UI-5 | Not started |

---

## 7. Remaining open items

1. UI-1B: integrate `incluhub-logo.svg` into sidebar / login / mobile header (preserve aspect ratio; no stretch)
2. Favicon set (deferred)
3. Dark mode (deferred)
4. Optional photography / illustration guidelines for portfolio empty states (UI-2+)
