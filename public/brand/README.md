# IncluHub brand assets

Intake date: 2026-07-15
Status: Assets ingested. **Desktop sidebar integration complete (UI-1B1).** Mobile header / drawer pending UI-1B2. Favicon deferred.

---

## Files in this folder

| File | Role | Size | Notes |
|---|---|---|---|
| `incluhub-logo.svg` | **Canonical UI asset** | ~857 KB | Vector trace (2119 `<path>` elements). Transparent canvas. |
| `incluhub-logo.png` | **Fallback asset** | ~1.5 MB | 1024×1024, 32-bit with alpha. Transparent canvas. |

---

## Canonical asset

**`public/brand/incluhub-logo.svg`**

- Prefer this for sidebar, login, and mobile header when UI-1B integrates branding.
- True vector paths (not a base64-embedded raster).
- Root: `viewBox="0 0 1024 1024"` · `preserveAspectRatio="xMidYMid meet"`.

## Fallback asset

**`public/brand/incluhub-logo.png`**

- Use only when SVG cannot be used (email clients, tooling without SVG, etc.).
- Do not prefer PNG over SVG in the Next.js app.

---

## Transparency status

**Verified: both SVG and PNG have a genuinely transparent background.**

Inspection (2026-07-15):

| Check | PNG | SVG (rendered) |
|---|---|---|
| Corner pixels alpha | `0` (transparent) | `0` (transparent) |
| Full-bleed black `<rect>` | N/A | **None** |
| Composite over page `#F8F6F5` | corners stay page color | corners stay page color |

Therefore:

- **Approved for light UI backgrounds** (`#F8F6F5`, `#FFFFFF`, `#F1EDEC`) once UI-1B integrates.
- The earlier “black-square on warm background” risk does **not** apply to these ingested files.
- Chat/preview UIs may still *appear* black behind the mark; that is a viewer composite, not an opaque logo plate.

---

## SVG vector status

| Property | Result |
|---|---|
| Embedded raster / base64 `<image>` | **No** |
| Path-based vector | **Yes** (~2119 paths) |
| QuillBot-origin SVG | Yes (filename provenance) |
| Artwork modified on intake | **No** — byte-copied only |

---

## Black-background limitation

- Source artwork is a gray/silver network mark optimized for contrast on dark or transparent fields.
- **Do not** place a version that retains an opaque black plate on the warm light application background.
- Current ingested SVG/PNG: **no opaque black plate** — limitation does not block light-UI use of *these* files.
- If a future asset reintroduces an opaque black square, mark it **NOT APPROVED FOR LIGHT UI USE** and keep text wordmark until a transparent production asset is delivered.

---

## Display rules (for UI-1B implementers)

1. **Preserve aspect ratio** — always. Use `object-contain` / SVG `preserveAspectRatio="xMidYMid meet"`. Never distort.
2. **No stretch** — do not force non-uniform `width`/`height` that changes aspect ratio.
3. Prefer CSS width like `h-8 w-auto` or `h-10 w-auto` with contained fit.
4. Minimum practical display for this detailed mark: about **28–32 CSS px** tall in sidebar; avoid sub-20px for readability.
5. Do not recolor via CSS filters without product-owner approval.
6. Do not embed base64 logo data in components — reference `/brand/incluhub-logo.svg`.

---

## Favicon

**Deferred.**
Browser tab continues to use the Next.js default (`src/app/favicon.ico`) until a dedicated favicon package is approved.

---

## Transparent production asset required (policy)

When a logo candidate has an opaque black (or any solid) background plate:

1. Archive it under `public/brand/` only if needed for history.
2. Label **NOT APPROVED FOR LIGHT UI USE**.
3. Do **not** integrate into sidebar, login, or mobile header.
4. Keep text “IncluHub” wordmark until a **transparent** production SVG/PNG is delivered.

Current intake **satisfies** the transparent production requirement for SVG + PNG.

---

## Integration status

| Item | Status |
|---|---|
| Assets copied to repo | Done |
| Layout / sidebar / login integration | **Not started** (UI-1B) |
| Favicon | Deferred |
| Docs | See `docs/design/BRAND_REQUIREMENTS.md` |
