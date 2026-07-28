# Production readiness — current evidence

**Date:** 2026-07-28
**Branch:** `codex/local-setup-ci`
**Decision:** Local development ready; staging and production not yet proven.

This report supersedes older point-in-time readiness audits when they conflict
with the current worktree.

## Verified now

- `npm run typecheck` passes.
- `npm run lint` passes with three non-failing third-party parser notices.
- `npm run build` passes on Next.js 16.2.12 and generates 38 routes.
- `npm audit --omit=dev --audit-level=high` reports zero runtime
  vulnerabilities.
- The local application responds successfully.
- The configured Supabase project is reachable.
- Thirty-eight Playwright checks pass for:
  - the IncluHub landing and branded login experience;
  - forgot-password navigation;
  - unauthenticated redirects across all 35 current Admin, Student, Educator,
    and External protected route variants;
  - mobile login layout without horizontal overflow.
- CI, guarded Supabase migration deployment, guarded Vercel deployment, and
  Dependabot configurations exist in the current worktree.

## Connected database snapshot

The configured project currently contains:

| Record | Count |
|---|---:|
| Profiles | 12 |
| Institutes | 7 |
| Programs | 1 |
| Students | 6 |
| Educators | 3 |
| External members | 0 |
| Teams | 3 |
| Portfolio outputs | 3 |
| Portfolio submissions | 0 |
| Portfolio reviews | 0 |
| Studio bookings | 0 |
| Notifications | 0 |

These counts prove connectivity and baseline data only. They do not prove a
complete Stage 0–5 workflow.

## Not yet verified

- All existing profile accounts reject the currently configured
  `TEST_ACCOUNT_PASSWORD`.
- Authenticated Playwright tests for Admin, Student, and Educator therefore
  skip until dedicated non-production credentials are configured.
- No current browser evidence proves the complete booking → check-in →
  submission → Educator review → Admin review → revision → Stage 4 → Stage 5
  journey.
- The Supabase remote migration ledger has not been reconciled with local
  migrations `001`–`022`.
- No Vercel project link or deployed preview is present locally.
- GitHub workflows are not active until the current changes are committed and
  pushed.

## Product gaps and decisions

- The original Stage 4 project/external-member workflow in
  `docs/PROJECT_RULES.md` and the newer Brand Works workflow need one explicit
  product decision and one authoritative specification.
- The External Member portal is intentionally non-functional.
- Admin Project Approvals and Activity Logs remain incomplete surfaces.
- A real final ecosystem destination must replace or explicitly approve the
  placeholder configuration.

## Production blockers

1. Rotate the service-role credential that was shared during setup.
2. Create separate staging and production Supabase projects.
3. Reconcile migration history and prove `supabase db push --dry-run`.
4. Create dedicated Admin, Student, and Educator staging test accounts.
5. Run the authenticated browser suite and add full workflow tests.
6. Commit, push, and require Application CI on `master`.
7. Link Vercel, configure Preview/Production variables, and deploy a preview.
8. Complete preview smoke testing across all roles and responsive breakpoints.
9. Establish database backup/restore and deployment rollback procedures.
10. Add error monitoring and complete the student-data privacy review.

## Next release gate

The next gate is **READY_FOR_STAGING_PREVIEW**. It requires:

- a dedicated staging database;
- verified migration history;
- working dedicated role credentials;
- all authenticated role-boundary tests passing;
- one complete workflow fixture;
- a successful Vercel preview deployment.
