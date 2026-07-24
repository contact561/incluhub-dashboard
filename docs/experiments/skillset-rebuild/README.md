# Skillset Rebuild Experiment

Branch: `experiment/skillset-rebuild`

This folder is the Phase 0 product package for a greenfield rebuild of IncluHub using Cursor skills, with an extensible real-time stage engine.

## Status

| Item | Status |
|------|--------|
| Branch created | Done |
| PRD + ADRs | Draft — review before Phase 1 coding |
| App scaffold | Not started (blocked on Phase 0 sign-off) |

## Documents

| File | Purpose |
|------|---------|
| [PRD.md](./PRD.md) | Product requirements (build-now scope) |
| [USER_FLOWS.md](./USER_FLOWS.md) | Auth, institute, stage, studio flows |
| [SCHEMA.md](./SCHEMA.md) | Target data model |
| [SKILL_MAP.md](./SKILL_MAP.md) | Phase → Cursor skills |
| [SETUP.md](./SETUP.md) | Google Auth + migration 025 apply steps |
| [ADR-001-stack.md](./ADR-001-stack.md) | Stack choice |
| [ADR-002-auth-google-students.md](./ADR-002-auth-google-students.md) | Student Google auth |
| [ADR-003-institute-scoped-educators.md](./ADR-003-institute-scoped-educators.md) | Educator visibility |
| [ADR-004-stages-moodboard-studio.md](./ADR-004-stages-moodboard-studio.md) | Build-now stages |
| [ADR-005-studio-otp-and-one-booking.md](./ADR-005-studio-otp-and-one-booking.md) | Studio OTP + rebook |
| [ADR-006-extensible-stage-engine-and-realtime.md](./ADR-006-extensible-stage-engine-and-realtime.md) | Extensibility + realtime |

## Locked defaults (open points)

If founder later overrides, update ADRs:

1. Mood board approval: **admin + institute educator** (both)
2. OTP delivery: **Admin displays OTP at studio**; student enters in app
3. Fashion designer: **roster/onboarding only**; not in 3-person studio team
4. Educator auth: **email/password** (Admin-provisioned)

## WIP note

Local studio/notification WIP on `master` was stashed as:

`WIP before experiment/skillset-rebuild (studio/notification fixes)`

Restore on `master` with `git stash list` / `git stash pop` when needed — do not mix into this experiment unless intentionally ported.
