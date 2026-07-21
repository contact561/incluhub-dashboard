# New developer setup checklist

Minimal steps to clone the repo and run the dashboard locally. Estimated time:
30–60 minutes (mostly Supabase setup).

## Prerequisites

- [ ] Node.js 20+ and npm 10+ (`node -v`, `npm -v`)
- [ ] Git
- [ ] A Supabase account and a **non-production** project (staging or personal)
- [ ] Supabase project ref, URL, anon key, and service role key

## Checklist

### 1. Clone the repository

```bash
git clone <repo-url>
cd incluhub-dashboard
```

### 2. Checkout the correct branch

```bash
git checkout feat/local-dev    # current active development
# OR
git checkout master            # Package F baseline only
```

### 3. Install dependencies

```bash
npm install
```

### 4. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `NEXT_PUBLIC_APP_URL=http://localhost:3000`
- [ ] `EXPECTED_SUPABASE_PROJECT_REF` (same ref as your Supabase project)

Do **not** commit `.env.local`.

### 5. Apply database migrations

In the Supabase SQL editor, run each file in `supabase/migrations/` in order:

| Branch | Apply |
|--------|-------|
| `master` | `001` through `013` |
| `feat/local-dev` | `001` through `022` |

- [ ] All migrations applied without errors
- [ ] Policies from `supabase/policies/` applied for your migration set

Details: [../../supabase/README.md](../../supabase/README.md)

### 6. Create an admin user

Ask an existing team member for admin credentials **or** run (non-production only):

```bash
node supabase/scripts/seed/create-admin-user.mjs --confirm-create-admin
```

- [ ] You can log in as admin at `http://localhost:3000/login`

### 7. Start the development server

```bash
npm run dev
```

- [ ] App loads at [http://localhost:3000](http://localhost:3000)
- [ ] Login redirects to the correct role dashboard

### 8. Run verification

```bash
npm exec tsc -- --noEmit --incremental false
npm run lint
npm run build
```

- [ ] Typecheck, lint, and build pass

SQL (Supabase editor):

- [ ] `supabase/scripts/verify/verify_package_e1.sql` passes
- [ ] On `feat/local-dev`: `verify_stage3_tables.sql` and `verify_stage3_qr_workflow.sql` pass

### 9. Optional — seed test data

Only on a disposable database. Set `ALLOW_DESTRUCTIVE_TEST_RESET=true` in
`.env.local`.

```bash
npm run test:reset -- --confirm-reset
```

Or seed Program 1 accounts without teams:

```bash
node scripts/seed/seed-program1-accounts.mjs --confirm-seed
```

- [ ] Test accounts created (if needed)

### 10. Read the project rules

- [ ] [../PROJECT_RULES.md](../PROJECT_RULES.md) — MVP scope and constraints
- [ ] [../Product_Master.md](../Product_Master.md) — product overview
- [ ] [LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md) — ongoing dev workflows

## You are ready when

- App runs locally with no console errors on login
- Admin can access `/admin/dashboard`
- Migrations match your branch track
- You understand this project uses **admin-created users only** (no public signup)

## Get help

| Question | Doc |
|----------|-----|
| What is built? | [../IMPLEMENTATION_PROGRESS.md](../IMPLEMENTATION_PROGRESS.md) |
| Routes and features | [../audits/ROUTE_REGISTRY.md](../audits/ROUTE_REGISTRY.md), [../audits/FEATURE_REGISTRY.md](../audits/FEATURE_REGISTRY.md) |
| Script commands | [../../scripts/README.md](../../scripts/README.md) |
| AI coding rules | [../../AGENTS.md](../../AGENTS.md) |
