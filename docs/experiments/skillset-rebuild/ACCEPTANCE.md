# Acceptance criteria — Skillset Rebuild

## Phase 0 (docs) — current

- [x] Branch `experiment/skillset-rebuild` created
- [x] PRD, USER_FLOWS, SCHEMA, ADRs 001–006, SKILL_MAP present
- [ ] Founder/you review and confirm locked defaults (or override)
- [ ] Dedicated Supabase project identified for experiment

**Exit:** Explicit “Phase 0 approved — start Phase 1”

## Phase 1 — Auth

- [x] Google student login button + OAuth callback continue path (code)
- [x] Onboarding page (institute + category)
- [x] Student cannot open educator/admin (proxy role isolation + pending gate)
- [x] Educator/admin password login retained
- [ ] Google provider enabled in Supabase project (manual — see SETUP.md)
- [ ] Migration 025 applied on experiment DB (manual)

## Phase 2 — Institutes / educators

- [x] Educator dashboard institute roster UI + RPC
- [ ] End-to-end verify after migration 025

## Phase 2b — Stage engine

- [x] `stage_definitions` table + seed in migration 025
- [x] Adaptive timeline on student dashboard
- [ ] Realtime subscriptions (not yet)
- [ ] Progress keyed to definition IDs for BMS/mood/studio modules (not yet)

## Phase 3 — Teams + BMS

- [ ] Assign/deassign 3-person team enforced
- [ ] BMS completion advances progress + notifies

## Phase 4 — Mood board

- [x] Submit + dual approval (educator + admin) — code + migration 026
- [ ] Institute educator notified; other institute not (manual e2e)

## Phase 5 — Studio

- [x] Online book once; second blocked without permit — code + migration 027
- [x] Admin grant rebook allows second book — UI + RPC
- [x] OTP display + verify unlocks submit — Admin OTP + student Enter OTP
- [x] Admin sees booking/reiteration clearly — schedule + grant rebook
- [ ] Apply migration 027 in SQL editor (manual)

## Phase 6 — Broadcasts

- [x] Admin Updates compose UI at `/admin/notifications`
- [x] Bell refreshes via Realtime on `notification_recipients`
- [ ] Manual e2e: broadcast reaches chosen audience

## Phase 7–8 — Harden / PR

- [ ] tsc, lint, build, e2e happy path green
- [ ] Experiment PR opened with summary + screenshots
