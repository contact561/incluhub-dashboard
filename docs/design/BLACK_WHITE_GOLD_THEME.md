# IncluHub black, white, and gold theme

**Branch:** `codex/black-white-gold-ui`
**Status:** Product-owner requested visual exploration
**Scope:** Shared visual tokens and application chrome only

## Direction

- White is the dominant colour for page and card surfaces.
- Black is used for primary text, numbers, navigation, and primary actions.
- Gold is an aesthetic accent for focus, selected navigation, borders,
  highlights, and decorative treatments.
- Workflow status colours remain semantic so success, warning, information,
  and error states remain accessible and distinguishable.
- The canonical IncluHub logo artwork is not recoloured.

## Palette

| Purpose | Value |
|---|---|
| Primary text and action | `#111111` |
| Primary action hover | `#2B2B2B` |
| Page surface | `#FAFAF8` |
| Card surface | `#FFFFFF` |
| Muted surface | `#F5F4EF` |
| Gold accent | `#C6A15B` |
| Accessible dark gold | `#765A16` |
| Gold soft surface | `#FBF7EB` |
| Default border | `#E8E5DC` |
| Strong gold-neutral border | `#C8B77A` |

## Implementation rule

Components consume semantic variables from `src/app/globals.css`. Avoid adding
page-specific hardcoded black, white, or gold values when an existing token can
express the same purpose.
