# Package F — Release Readiness

**Date:** 2026-07-16
**Branch:** `chore/package-f-release-readiness`
**Decision:** GO for a Vercel preview; production remains gated.

## Release outcome

The IncluHub submission build is application-ready for a preview deployment.
The production deployment must wait for the Vercel environment configuration,
version-control handoff, preview smoke test, and Product Owner decision on the
placeholder ecosystem destination.

The Product Owner confirmed that both `verify_package_e1.sql` and the
transactional `verify_package_e1_rpc.sql` completed successfully in the
connected test Supabase SQL editor on 2026-07-16.

## Checks completed

- No tracked hard-coded credentials or Supabase keys were found.
- `.env.local`, local test credentials, build output, and temporary files are
  excluded from Git.
- The Supabase service-role client is imported only by server actions and is
  never exposed through a `NEXT_PUBLIC_` variable.
- Fixture mutation utilities require an explicit confirmation flag, an exact
  expected project ref, a non-production target, and the destructive-test
  opt-in.
- Project Approvals, unfinished Admin navigation, and External Member portal
  navigation remain hidden from the submission UI.
- The External Member dashboard stub is non-discoverable and returns not found.
- Admin, Educator, and Student route prefixes are protected by the server-side
  proxy and role layouts.
- Stage 4 Students cannot access `/student/ecosystem`; Stage 5 Students can.
- Stage 5 navigation is conditional and the external CTA uses a labelled,
  environment-configured placeholder in a new tab.
- Admin Brand Works controls are Admin-only; Student and Educator surfaces are
  read-only.
- Stage 3→4 and audited Stage 4→5 persisted states are consistent, including
  all three active Students on each test team.

## Live authorization verification

`npm run test:release-authz -- --confirm-release-authz` passed against the
configured non-production Supabase project:

- anonymous, Student, and Educator Brand Works RPC calls were denied;
- direct Student mutation of `team_stage_progress` was denied;
- Student RLS returned only the active team;
- Educator RLS returned only assigned teams;
- Admin completion retry was idempotent;
- all checks preserved the original workflow state.

The schedule-retry check skipped because Team Alpha intentionally has no
schedule. Team Beta's persisted audit fields prove that scheduling and
completion previously ran. Before production, run the transactional
`supabase/scripts/verify_package_e1_rpc.sql` check to replay scheduling,
rescheduling, completion, permission, and idempotency paths with `ROLLBACK`.

## Browser verification

- Admin submission navigation contains no superseded or unfinished items.
- Admin Stage Board shows Stage 4 Brand Works and Stage 5 IncluHub Ecosystem
  Welcome.
- Admin team detail shows scheduling controls for Team Alpha.
- Educator My Teams shows assigned Alpha/Beta teams without mutation controls.
- Educator and Student attempts to open Admin routes redirect to their own
  dashboards.
- Team Alpha redirects from Ecosystem to the locked Stage 4 explanation.
- Team Beta opens the Stage 5 welcome with conditional navigation, labelled
  placeholder, and no browser console errors.
- The Stage 5 page has no horizontal overflow at mobile or desktop widths and
  the primary CTA retains a 48px touch target.

## Technical verification

- `npm exec tsc -- --noEmit --incremental false` — PASS
- `npm run lint` — PASS (three non-failing `jsx-ast-utils` parser advisories)
- `npm test --if-present` — PASS (no default test script is configured)
- `npm run build` — PASS, 35 routes generated
- Next.js middleware deprecation warning — resolved by `src/proxy.ts`

## Package G gates

Before preview deployment:

1. Review and commit the complete E1, E2, and F diff; then push the branch.
2. Configure Vercel with:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only)
   - `NEXT_PUBLIC_APP_URL` (the Vercel preview/production origin)
   - `NEXT_PUBLIC_ECOSYSTEM_APP_URL`
   - `NEXT_PUBLIC_ECOSYSTEM_APP_NAME`
   - `NEXT_PUBLIC_ECOSYSTEM_APP_LOGO=/brand/incluhub-logo.svg`
3. Do not configure fixture passwords or destructive reset flags in Vercel.
4. Deploy a Vercel preview and repeat Admin, Educator, Stage 4 Student, and
   Stage 5 Student smoke checks.

Before production deployment:

1. Approve the preview smoke test.
2. Supply the real ecosystem URL, or explicitly approve shipping the labelled
   placeholder for submission.
3. Confirm production environment values and database migration `013`.
4. Deploy and run a final non-destructive production smoke test.
