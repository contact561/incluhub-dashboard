# CI/CD runbook

This repository has three GitHub Actions workflows:

- `Application CI` validates every pull request and every push to `master`.
- `Deploy Supabase migrations` performs a reviewed, serialized database deployment.
- `Deploy application to Vercel` creates a manual preview or production deployment.

## Application CI

The application gate uses the lockfile and runs:

```bash
npm ci
npm audit --omit=dev --audit-level=high
npm run typecheck
npm run lint
npm run build
```

Make `Application CI / Type-check, lint, and build` a required status check in
the GitHub branch protection rules for `master`.

The CI build uses non-secret placeholder Supabase values. Tests that use the
service-role key or mutate fixture data are intentionally excluded from normal
pull requests.

## Supabase environments

Create separate Supabase projects for `staging` and `production`. Never point
the staging environment at the production project.

Create matching GitHub Environments named `staging` and `production`. Add these
encrypted secrets to each environment:

| Secret | Value |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | Supabase personal access token used by CI |
| `SUPABASE_DB_PASSWORD` | Database password for that environment |
| `SUPABASE_PROJECT_ID` | Project reference for that environment |

Require reviewers on the `production` GitHub Environment.

### Existing database warning

This repository's existing database was changed through the Supabase SQL
editor, so its migration ledger may not match the files in
`supabase/migrations`. Before the first automated deployment:

1. Link the CLI to the target project.
2. Run `supabase migration list`.
3. Reconcile already-applied versions with `supabase migration repair`.
4. Run `supabase db push --dry-run` and review the output.

Do not run the deployment workflow until the dry run lists only genuinely
pending migrations.

The files in `supabase/policies` are legacy reference assets. New schema and RLS
changes must be written together in a timestamped file created with:

```bash
supabase migration new descriptive_change_name
```

Do not make future schema changes directly in the remote SQL editor or Table
Editor. Apply them through migrations so the ledger stays trustworthy.

## Vercel environments

Create or link a Vercel project and configure its Preview and Production
environment variables. The service-role key must only be a server-side
variable.

Create GitHub Environments named `preview` and `production`, then add:

| Secret | Value |
|---|---|
| `VERCEL_TOKEN` | Vercel access token |
| `VERCEL_ORG_ID` | Vercel team or account ID |
| `VERCEL_PROJECT_ID` | Linked Vercel project ID |

Require reviewers on the `production` GitHub Environment. Run the Vercel
workflow manually until the first preview and production releases have been
verified. After that, Vercel's Git integration can provide automatic pull
request previews and production releases from `master`.

## Release order

For a release containing database changes:

1. Merge only after Application CI passes.
2. Deploy and verify the database migration in `staging`.
3. Deploy and test the Vercel preview against staging.
4. Approve and deploy the production database migration.
5. Approve and deploy the production application.

For UI-only changes, skip the database steps.
