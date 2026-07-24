# ADR-004: Build-now stages (mood board before studio)

## Status

Accepted for build-now; Stage 4/5 deferred

## Context

Founder flow: team → BMS → mood board → portfolio/studio. Mood board is the Stage 3 submission gate before studio booking.

## Decision

Seed stage definitions:

1. `team_building` (`team_formation`)
2. `bms_inauguration` (`attendance_session`)
3. `mood_board` (`submission`)
4. `portfolio_studio` (`studio_booking` / linked submission)

**Mood board approval:** both **institute educator** and **admin** must approve (dual gate). Revision loops supported.

Portfolio/studio unlocks only after mood board fully approved.

Fashion designer students may exist on rosters but are not placed in the 3-person studio team in build-now.

## Consequences

- Differs from current `master` (portfolio-first Stage 3)
- Dual approval matches prior dual-approval philosophy
- Stage 4/5 content waits on founder briefing but registry can reserve sort_order gaps
