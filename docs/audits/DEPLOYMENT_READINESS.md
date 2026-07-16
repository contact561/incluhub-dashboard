# Deployment Readiness — Audit 2026-07-14

**Classification: NOT_READY** (for staging, pilot, and production).

The application builds cleanly and core MVP workflows through Package D3 work
against the development Supabase project, but the repository has uncommitted
schema files, no CI, no environment separation, no monitoring, and unresolved
in-flight repairs. Details and evidence below.

---

## 1. Source control

| Item | State | Evidence |
|---|---|---|
| GitHub remote | `https://github.com/preetamnaik3-cpu/incluhub-dashboard.git` | VERIFIED_LOCAL_GIT |
| Branch | `master`, tracks `origin/master`, 0 ahead / 0 behind at HEAD `d87efb5` | VERIFIED_LOCAL_GIT |
| Working tree | **DIRTY** — 10 modified + 9 untracked files | VERIFIED_LOCAL_GIT |
| Uncommitted schema | `supabase/migrations/011…sql`, `012…sql`, `supabase/policies/006…sql`, `verify_package_d*.sql` — the whole Package D1 backend is **not in Git** while (per docs/browser reports) it is applied to the dev database | VERIFIED_LOCAL_GIT |
| Uncommitted app repairs | Stage 3 sync repair (10 modified files + 4 new source files) and D3 eligibility repair | VERIFIED_LOCAL_GIT |
| Branch protection | UNKNOWN — requires GitHub settings access; not queryable locally | UNKNOWN |
| Secrets in Git | None. `.env.local`, `TEST_CREDENTIALS.local.md`, `tmp/test-reset-backups` all ignored (verified with `git check-ignore`); `git ls-files ".env*"` returns nothing | VERIFIED_LOCAL_GIT |

## 2. CI/CD

| Item | State |
|---|---|
| `.github/` workflows | **Absent** (Test-Path returned False) |
| Automated tests | **Absent** — no test framework in `package.json` |
| Lint gate | Would fail: `npm run lint` exits non-zero (2 errors) |

## 3. Build

| Item | State |
|---|---|
| `npm run build` | **PASS** (Next.js 16.2.10, 34 routes) — VERIFIED_BUILD |
| `npx tsc --noEmit` | **PASS** — VERIFIED_BUILD |
| `npm run lint` | **FAIL** — 2 errors (`react-hooks/set-state-in-effect` in `StudioBookingPanel.tsx`, `useStudioAvailability.ts`), 6 warnings |
| Deprecations | `middleware` → `proxy` naming deprecation (Next 16) |

## 4. Hosting / Vercel

| Item | State |
|---|---|
| `.vercel` link | **Absent** — project never linked/deployed |
| `vercel.json` | Absent |
| Hosting decision | DOCUMENTED_PLAN only (Architecture plan mentions Vercel); nothing provisioned |

## 5. Environment variables

Required by code (VERIFIED_LOCAL_CODE):

| Variable | Used by | Exposure |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | all Supabase clients | public (by design) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser/server anon clients | public (by design) |
| `SUPABASE_SERVICE_ROLE_KEY` | `src/lib/supabase/admin.ts` + reset script only | server-only; validated with explicit missing-env error; **never imported by client components** (verified by grep — single reference site) |

No schema-validation library for env (e.g. zod env parsing) — validation is
ad-hoc per client factory (LOW).

## 6. Supabase environments

| Item | State |
|---|---|
| CLI | 2.107.0 installed |
| Link state | **Not linked** — `npx supabase migration list` fails with "Cannot find project ref" |
| Remote migration ledger | **UNKNOWN** — migrations were applied manually via SQL editor per docs; there is no recorded ledger comparison |
| Environment separation | **Single dev project only.** No staging or production Supabase project exists. Test fixtures and real schema share one database |
| Seed isolation | Reset utility guards: dry-run default, `--confirm-reset` flag, backups; but it points at the same single project |

Manual remote verification steps (no secrets in repo):

1. `npx supabase login` (interactive) then `npx supabase link --project-ref <ref>`.
2. `npx supabase migration list` and compare against `supabase/migrations/` filenames.
3. Run `supabase/scripts/audit/001_schema_security_audit.sql` in the SQL editor
   to confirm 011/012/policy-006 objects exist remotely.

## 7. Operations

| Item | State |
|---|---|
| Error monitoring | **None** (no Sentry/equivalent; only `console.error`) |
| Log aggregation | None beyond platform defaults |
| Backups | Only ad-hoc JSON backups from the reset utility (dev fixture); no production backup policy |
| Rollback strategy | None documented; migrations have no down scripts |
| Production data migration | Not designed (no production environment exists) |
| Legal/privacy | Not assessed anywhere in repo (no privacy policy, no consent flows) — students are the data subjects, so this is mandatory before pilot |

## 8. Gate checklist

### Before READY_FOR_STAGING

1. Commit migrations 011, 012, policy 006, verify scripts (D1 backend).
2. Commit the Stage 3 sync repair and D3 eligibility repair (after browser
   verification).
3. Fix the 2 lint errors or explicitly accept them with config.
4. Create a separate staging Supabase project and apply all migrations from
   Git (not from the SQL editor ad hoc); link the CLI so the ledger is
   trustworthy.
5. Add minimal CI (tsc + lint + build on push).
6. Provision hosting (Vercel) with staging env vars; keep
   `SUPABASE_SERVICE_ROLE_KEY` out of any preview/client scope.

### Before READY_FOR_PILOT

7. Complete D4 (student resubmission) and verify the full three-portfolio
   sequence including Stage 3 → 4 transition.
8. Decide external-member scope: remove the three dead `/external/*` nav
   links or implement the routes.
9. Error monitoring + basic alerting.
10. Privacy/legal review (student data).

### Before READY_FOR_PRODUCTION

11. Production Supabase project + migration process + backup/rollback policy.
12. Branch protection + review workflow.
13. Package E or explicit MVP descope decision for Stage 4/5.
14. Load/RLS verification with the audit scripts against production schema.
