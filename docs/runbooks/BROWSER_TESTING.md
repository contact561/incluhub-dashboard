# Browser testing runbook

Playwright provides repeatable browser checks for public authentication,
all current protected-route redirects, responsive login UI, and authenticated
role boundaries. The public suite currently contains 40 runnable checks,
including 35 protected route variants.

## Install the browser once

```powershell
npm.cmd exec playwright install chromium
```

## Public and unauthenticated checks

These checks are safe against any configured Supabase environment because they
do not sign in or mutate application data:

```powershell
npm.cmd run test:e2e:public
```

## Authenticated role checks

Use dedicated active accounts in a non-production Supabase project. Add these
only to `.env.local` or the relevant GitHub Environment:

```text
E2E_ADMIN_EMAIL=
E2E_STUDENT_EMAIL=
E2E_EDUCATOR_EMAIL=
E2E_ACCOUNT_PASSWORD=
E2E_FIXTURE_PROJECT_REF=
ALLOW_E2E_ACCOUNT_SETUP=true
```

To create or refresh the three reserved accounts in a guarded non-production
project:

```powershell
npm.cmd run test:e2e:accounts:setup -- --confirm-e2e-accounts
```

This affects only:

- `e2e.admin@incluhub.test`
- `e2e.student@incluhub.test`
- `e2e.educator@incluhub.test`

It does not reset the database or change existing users. Remove the reserved
accounts with:

```powershell
npm.cmd run test:e2e:accounts:cleanup -- --confirm-e2e-account-cleanup
```

Then run:

```powershell
npm.cmd run test:e2e
```

The role tests verify that Admin, Student, and Educator accounts reach their
own dashboards and are redirected away from another role's routes. Tests skip
with a clear reason when dedicated credentials are absent.

## Preview deployment

To test an already-deployed Vercel preview instead of starting the local
Next.js server:

```powershell
$env:PLAYWRIGHT_BASE_URL="https://your-preview.example"
npm.cmd run test:e2e
```

Do not use fixture reset scripts against staging or production as part of
ordinary browser tests.

Account setup requires all existing fixture guards, a separate exact
`E2E_FIXTURE_PROJECT_REF`, the `ALLOW_E2E_ACCOUNT_SETUP=true` opt-in, and a
dedicated password of at least 16 characters. Do not reuse a human account
password.
