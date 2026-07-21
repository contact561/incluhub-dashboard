# Package E1 staging validation

Use a separate, disposable Supabase staging project. Do not run these steps on
production.

## Prerequisites

1. Back up the staging database.
2. Confirm staging has migrations `001` through `012` and policies `002`
   through `006` applied.
3. Confirm the project contains one active enrolled team with three active
   members and at least one active assigned educator.
4. Confirm this returns the Stage 3 to Stage 4 RPC and no Package E1 RPC yet:

```sql
select
  to_regprocedure('public.review_portfolio_as_admin(uuid,uuid,text,text)')
    as migration_012_ready,
  to_regprocedure('public.schedule_brand_works(uuid,date,text)')
    as migration_013_not_yet_applied;
```

`migration_012_ready` must be non-null and
`migration_013_not_yet_applied` must be null before the first run.

## Apply and validate migration 013

1. Open the staging SQL editor.
2. Paste and run the complete file
   `supabase/migrations/013_stage4_brand_works.sql` once.
3. Paste and run `supabase/scripts/verify_package_e1.sql`.
4. Confirm every notice starts with `PASS` and there is no exception.
5. Paste and run `supabase/scripts/verify_package_e1_rpc.sql`.
6. Confirm the Student, Educator, Admin, idempotency, and atomic transition
   notices all report `PASS`.
7. Confirm the final statement is `ROLLBACK`. The selected team's original
   state must be unchanged after this script.

## Application smoke test against staging

1. Copy `.env.example` to `.env.local` locally.
2. Set the staging `NEXT_PUBLIC_SUPABASE_URL` and anon key. Keep the service
   role key server-only.
3. Set `EXPECTED_SUPABASE_PROJECT_REF` to the staging project ref and
   `PRODUCTION_SUPABASE_PROJECT_REF` to the production ref.
4. Leave `ALLOW_DESTRUCTIVE_TEST_RESET=false`; the SQL checks above do not need
   a service-role fixture utility.
5. Run `npm run dev`.
6. As Admin, open a Stage 4 team, schedule a future Brand Works date, then
   reschedule it to today's India date. Verify the Stage Board and timeline.
7. As Student on that team, verify the dashboard and My Stage show the date and
   remarks but expose no write control.
8. As an assigned Educator, verify My Teams shows the same read-only schedule.
9. As an unrelated Student and Educator, verify the team Stage 4 row is not
   visible.
10. As Admin, complete Brand Works and verify in one refresh:
    - Stage 4 is `completed` with completion actor/time;
    - Stage 5 progress is `completed`;
    - the team is at Stage 5 with `stage_status = completed`;
    - all active team students are at Stage 5;
    - a second completion attempt is a no-op;
    - Project Approvals, Notifications, Activity Logs, and the External Member
      stub are not shown in submission navigation.

## Final staging checks

Run the production build, TypeScript, and lint checks against the staging env.
Do not deploy until Package E2 and the release-readiness package are complete.
