# Setup notes — Skillset rebuild (Phase 1+)

## Shared database note

Git branches do **not** isolate Supabase. Migrations 025–027 change the **shared**
project schema. They are designed to be mostly additive so `master` app code keeps
working. Migration 027 does replace `book_studio_slot` / `mark_studio_no_show` and
auto-grants a rebook permit on no-show so master’s rebook-after-no-show path still
works.

## Apply migrations

In Supabase SQL editor for project `opfmkonwonjzqiqgeeki`, run in order if not yet applied:

1. `supabase/migrations/025_skillset_rebuild_foundations.sql` (done if onboarding/roster works)
2. `supabase/migrations/026_mood_board_submissions.sql` (done if mood board works)
3. **`supabase/migrations/027_studio_otp_and_rebook_permits.sql`** ← apply next (OTP + rebook)

Also apply `023` and `024` if not already on that project.

## Enable Google Auth

1. Supabase → Authentication → Providers → Google → enable  
2. Add Google Cloud OAuth client; set redirect URL to:  
   `https://<project-ref>.supabase.co/auth/v1/callback`  
3. Ensure `NEXT_PUBLIC_APP_URL` in `.env.local` matches the app (e.g. `http://localhost:3000`)  
4. Add redirect allow-list: `http://localhost:3000/auth/callback`

## Smoke checklist

1. Admin/educator email login still works  
2. Continue with Google → `/student/onboarding` → pick institute/category → dashboard  
3. Student cannot open `/educator/dashboard`  
4. Educator dashboard shows **Your institute students** (after migration 025)  
5. Student dashboard shows **Program timeline** from `stage_definitions`  
6. Admin studio schedule: Display OTP + Grant rebook after no-show (after migration 027)  
7. Student portfolio: Enter OTP check-in path works
