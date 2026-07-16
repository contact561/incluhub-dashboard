# IncluHub Education Management Dashboard

IncluHub is a role-based creative education workflow application. The
submission build surfaces implemented Admin, Student, and Educator workflows;
unfinished navigation is hidden.

## Stack

- Next.js 16, React 19, and TypeScript
- Tailwind CSS and shadcn-style UI components
- Supabase Postgres, Auth, RLS, Storage, and RPC workflows

## Local setup

1. Copy `.env.example` to `.env.local` and replace placeholders with values
   for an isolated development or staging Supabase project.
2. Install dependencies with `npm install`.
3. Start locally with `npm run dev`.

Never expose `SUPABASE_SERVICE_ROLE_KEY` to browser code. Fixture utilities
also require a matching `EXPECTED_SUPABASE_PROJECT_REF`,
`ALLOW_DESTRUCTIVE_TEST_RESET=true`, and an explicit confirmation flag.

## Verification

```text
npm exec tsc -- --noEmit --incremental false
npm run lint
npm run build
```

Package E1 database checks are `supabase/scripts/verify_package_e1.sql` and
`supabase/scripts/verify_package_e1_rpc.sql`. The RPC check is transactionally
disposable and ends with `ROLLBACK`.

## Current delivery sequence

Packages E1 Stage 4 Brand Works, E2 Stage 5 Ecosystem Welcome, and Package F
release readiness are implemented locally. The Ecosystem page uses a labelled
placeholder destination until the final URL is supplied. Next: follow
`docs/PACKAGE_F_RELEASE_READINESS.md` for Package G preview and production
deployment gates.
