# IncluHub Education Management Dashboard

IncluHub is a role-based creative education workflow application for Admin,
Educator, and Student portals. Server actions and Supabase RLS enforce every
protected workflow.

## Stack

- Next.js 16, React 19, TypeScript
- Tailwind CSS and shadcn-style UI components
- Supabase Postgres, Auth, RLS, Storage, and RPC workflows

## Quick start

### 1. Clone and install

```bash
git clone <repo-url>
cd incluhub-dashboard
npm install
```

### 2. Environment

Copy `.env.example` to `.env.local` and set:

| Variable | Required |
|----------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only — never expose to the browser |
| `NEXT_PUBLIC_APP_URL` | Yes (e.g. `http://localhost:3000`) |
| `EXPECTED_SUPABASE_PROJECT_REF` | Required for seed/reset scripts |

Never commit `.env.local`.

### 3. Choose a branch

| Branch | Use for |
|--------|---------|
| `master` | Current supported application, including migrations `001`–`022` |
| `codex/local-setup-ci` | Local CI/CD and browser-test setup awaiting review |
| `experiment/skillset-rebuild` | Experimental work; not the production baseline |

```bash
git checkout master
```

### 4. Apply database schema

Apply SQL migrations in order from `supabase/migrations/` in the Supabase SQL
editor (or your migration pipeline):

- Apply `001` → `022` to a new empty environment.
- For an existing environment, reconcile the Supabase migration ledger before
  running `supabase db push`; do not blindly replay migrations.

See [supabase/README.md](supabase/README.md) and [docs/README.md](docs/README.md).
For detailed workflows see [docs/runbooks/LOCAL_DEVELOPMENT.md](docs/runbooks/LOCAL_DEVELOPMENT.md).

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Admin creates all users;
there is no public signup.

### 6. Optional test data (non-production only)

Destructive scripts require explicit flags. See script headers and
[docs/PROJECT_RULES.md](docs/PROJECT_RULES.md).

```bash
npm run test:reset -- --confirm-reset
```

## Verify changes

```bash
npm exec tsc -- --noEmit --incremental false
npm run lint
npm run build
npm run test:deployment-env
npm run test:release-authz
```

Database checks (Supabase SQL editor):

- Package E1: `supabase/scripts/verify/verify_package_e1.sql`, `supabase/scripts/verify/verify_package_e1_rpc.sql`
- Stage 3 (local-dev): `supabase/scripts/verify/verify_stage3_tables.sql`, `supabase/scripts/verify/verify_stage3_qr_workflow.sql`
- Dev scripts index: [scripts/README.md](scripts/README.md)

## Documentation map

| Topic | Location |
|-------|----------|
| Doc index | [docs/README.md](docs/README.md) |
| New developer setup | [docs/runbooks/NEW_DEVELOPER_SETUP.md](docs/runbooks/NEW_DEVELOPER_SETUP.md) |
| Local development | [docs/runbooks/LOCAL_DEVELOPMENT.md](docs/runbooks/LOCAL_DEVELOPMENT.md) |
| Browser testing | [docs/runbooks/BROWSER_TESTING.md](docs/runbooks/BROWSER_TESTING.md) |
| CI/CD setup | [docs/runbooks/CI_CD.md](docs/runbooks/CI_CD.md) |
| Dev scripts | [scripts/README.md](scripts/README.md) |
| Database / migrations | [supabase/README.md](supabase/README.md) |
| MVP rules | [docs/PROJECT_RULES.md](docs/PROJECT_RULES.md) |
| Build progress | [docs/IMPLEMENTATION_PROGRESS.md](docs/IMPLEMENTATION_PROGRESS.md) |
| Release readiness | [docs/releases/PACKAGE_F_RELEASE_READINESS.md](docs/releases/PACKAGE_F_RELEASE_READINESS.md) |
| AI agent instructions | [AGENTS.md](AGENTS.md) |

## Current status

Package F and the founder workflows are on `master`, including portfolio and
studio flows, in-app notifications, Stage 3 QR check-in, Admin broadcast
updates, Brand Works, and Stage 5 ecosystem review messaging. See the current
production-readiness report before deploying.
