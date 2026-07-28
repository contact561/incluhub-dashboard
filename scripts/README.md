# Development scripts

Node utilities for local testing, seeding, and QA. **Not used at runtime** by the
Next.js app. All destructive scripts require explicit confirmation flags and
`EXPECTED_SUPABASE_PROJECT_REF` plus `ALLOW_DESTRUCTIVE_TEST_RESET=true`.

## Layout

| Folder | Purpose |
|--------|---------|
| `authz/` | Authorization smoke checks (`npm run test:release-authz`) |
| `fixtures/` | Disposable QA teams for UI portal verification |
| `qa/smoke/` | End-to-end workflow smoke tests (e.g. Stage 3 QR) |
| `reset/` | Database purge utilities (keep admin only) |
| `seed/` | Reset + seed test environment (`npm run test:reset`) |

## Common commands

```bash
# Dry-run reset preview (safe)
npm run test:reset

# Destructive reset + seed (non-production only)
npm run test:reset -- --confirm-reset

# Replace every user with a newly named, unassigned Stage 0 account
npm run test:reset -- --confirm-reset --fresh-accounts --new-identities

# Full Stage 0–5 lifecycle and booking-allocation audit
node scripts/qa/smoke/full-stage-lifecycle-smoke.mjs

# Package F authz check
npm run test:release-authz

# Seed Program 1 educators/students (no teams)
node scripts/seed/seed-program1-accounts.mjs --confirm-seed

# Purge all data except one admin
node scripts/reset/purge-keep-admin-only.mjs --confirm-purge

# Stage 3 smoke (after fixture setup)
node scripts/qa/smoke/stage3-smoke-fixture-setup.mjs --confirm-fixture
node scripts/qa/smoke/stage3-workflow-smoke.mjs --confirm-stage3-smoke

# Create dedicated Playwright role accounts (non-production only)
npm run test:e2e:accounts:setup -- --confirm-e2e-accounts
```

## Fixture scripts (UI QA)

| Portal | Setup | Cleanup |
|--------|-------|---------|
| Student (UI-2) | `scripts/fixtures/ui2-qa-fixture-setup.mjs` | `scripts/fixtures/ui2-qa-fixture-cleanup.mjs` |
| Educator (UI-3) | `scripts/fixtures/ui3-qa-fixture-setup.mjs` | `scripts/fixtures/ui3-qa-fixture-cleanup.mjs` |
| Admin (UI-4) | `scripts/fixtures/ui4-qa-fixture-setup.mjs` | `scripts/fixtures/ui4-qa-fixture-cleanup.mjs` |

See `fixtures/fixture-safety.mjs` for environment guards shared by all mutation scripts.

## Database SQL utilities

Supabase SQL scripts live under `../supabase/scripts/`:

- `verify/` — package and Stage 3 verification
- `audit/` — read-only schema and workflow audits
- `reset/` — test data audit and destructive reset SQL
- `seed/` — admin and stage test user creation
