# Local development runbook

Day-to-day guide for running the IncluHub dashboard against a Supabase project.
For first-time setup, start with [NEW_DEVELOPER_SETUP.md](NEW_DEVELOPER_SETUP.md).

## Branch and database strategy

| Branch | Purpose | Migrations |
|--------|---------|------------|
| `master` | Package F stable baseline | `001`–`013` |
| `feat/local-dev` | Active founder workflows | `001`–`022` |

**Important:** Git branch does **not** switch databases. Every branch uses whatever
Supabase project is configured in `.env.local`. Schema changes and seed/purge
scripts affect **everyone** sharing that project.

### When to use which branch

- **Package F only** (portfolio, studio booking, brand works): checkout `master`,
  apply migrations through `013`.
- **Notifications, Stage 3 QR, admin broadcasts, Stage 5 review**: checkout
  `feat/local-dev`, apply migrations through `022`.

### Long-term plan

1. Merge `feat/local-dev` → `master` when founder workflows are release-ready.
2. Optionally rename `feat/local-dev` → `feat/founder-workflows` before merge.
3. Delete `chore/package-f-release-readiness` (duplicate of `master`).

## Environment

Copy `.env.example` → `.env.local`. Minimum for the app:

| Variable | Notes |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server/scripts only — never in client bundles |
| `NEXT_PUBLIC_APP_URL` | e.g. `http://localhost:3000` (auth redirects) |

For seed/reset/smoke scripts, also set:

| Variable | Notes |
|----------|-------|
| `EXPECTED_SUPABASE_PROJECT_REF` | Must match your Supabase project ref |
| `ALLOW_DESTRUCTIVE_TEST_RESET` | Set `true` only on disposable dev DBs |
| `TEST_ACCOUNT_PASSWORD` | Shared password for fixture accounts |

Use a **dedicated staging or personal Supabase project** for destructive work.
Never run purge/reset against production.

## Start the app

```bash
npm install          # after pull or branch switch
npm run dev          # http://localhost:3000
```

Login uses admin-created accounts only. There is no public signup and no role
picker on the login screen.

## Apply schema changes

1. Open Supabase SQL editor for your project.
2. Run migrations from `supabase/migrations/` in numeric order.
3. Apply matching policies from `supabase/policies/` when adding new tables/RPCs.

See [../../supabase/README.md](../../supabase/README.md) for the migration map.

### Stage 3 verify (after `014`–`022`)

Run in order:

1. `supabase/scripts/verify/verify_stage3_tables.sql` — all rows should be `PASS`;
   summary `missing_objects` should be `NULL`.
2. `supabase/scripts/verify/verify_stage3_qr_workflow.sql` — should complete
   without `FAIL`.

## Test data workflows

All mutation scripts require explicit CLI flags. See [../../scripts/README.md](../../scripts/README.md).

### Full reset + seed (disposable DB)

```bash
# Preview first (dry run)
npm run test:reset

# Destructive
npm run test:reset -- --confirm-reset
```

### Keep one admin, delete everything else

```bash
node scripts/reset/purge-keep-admin-only.mjs --confirm-purge
node scripts/reset/purge-keep-admin-only.mjs --confirm-purge --keep-email admin@incluhub.test
```

### Seed Program 1 educators/students (no teams)

```bash
node scripts/seed/seed-program1-accounts.mjs --confirm-seed
```

### Stage 3 smoke test

```bash
node scripts/qa/smoke/stage3-smoke-fixture-setup.mjs --confirm-fixture
node scripts/qa/smoke/stage3-workflow-smoke.mjs --confirm-stage3-smoke
```

## Verify before pushing

```bash
npm exec tsc -- --noEmit --incremental false
npm run lint
npm run build
npm run test:release-authz -- --confirm-release-authz
```

Package E1 SQL (Package F baseline):

- `supabase/scripts/verify/verify_package_e1.sql`
- `supabase/scripts/verify/verify_package_e1_rpc.sql` (ends with `ROLLBACK`)

## Common issues

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `ERR_CONNECTION_REFUSED` on localhost | Dev server not running | `npm run dev` |
| Login works but data missing | Wrong Supabase project in `.env.local` | Check URL and project ref |
| RPC "permission denied" | Migration or RLS not applied | Re-run missing migration/policy |
| Stage 3 verify fails on QR RPCs | `015`/`021` not applied, or `pgcrypto` missing | Apply `021`, `022` |
| Script refuses to run | Safety guards | Set `EXPECTED_SUPABASE_PROJECT_REF`, `ALLOW_DESTRUCTIVE_TEST_RESET=true`, and the script's `--confirm-*` flag |
| Code on `master` but DB has `022` | Shared DB ahead of branch | Expected with shared dev DB; use matching branch or isolate project |

## Related docs

- [NEW_DEVELOPER_SETUP.md](NEW_DEVELOPER_SETUP.md) — first-time checklist
- [../PROJECT_RULES.md](../PROJECT_RULES.md) — MVP constraints
- [../IMPLEMENTATION_PROGRESS.md](../IMPLEMENTATION_PROGRESS.md) — feature changelog
- [../README.md](../README.md) — documentation index
