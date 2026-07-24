# User Flows — Skillset Rebuild

## F1 — Student Google onboarding

1. Student opens app → **Continue with Google**
2. Supabase Auth creates session; profile upserted as `role=student`, `status=pending_onboarding`
3. Forced `/student/onboarding`: institute (from Admin list), category, confirm name, phone, terms
4. Write `students` row with `institute_id` + category; set profile `active`
5. Redirect `/student/dashboard` (adaptive timeline; may show “awaiting team”)

**Guards:** Incomplete onboarding cannot access other student routes. Never educator/admin routes.

## F2 — Educator login (institute roster)

1. Admin-created educator signs in with email/password
2. Land `/educator/dashboard`
3. See students where `students.institute_id = educators.institute_id`
4. Counts/filters by category (MUA / hair / photo / fashion_designer if present)
5. Realtime: new onboarding / mood board / relevant studio events refresh list

**Guards:** Cannot query other institutes (RLS). Cannot open `/student/*`.

## F3 — Admin team assign / deassign

1. Admin opens team builder for a program
2. Picks 1 makeup + 1 hair + 1 photo (any institutes)
3. Assign creates `team_members`; deassign removes/reopens spot
4. Affected students’ timelines update (realtime)
5. Institute educators see membership change for *their* students only

## F4 — BMS / inauguration

1. Team at BMS stage definition
2. Admin marks BMS complete
3. Progress advances to mood board definition
4. Students + relevant educators notified

## F5 — Mood board submit + dual approval

1. Student submits mood board (link/files/notes per schema)
2. Institute educators for that student notified
3. Institute educator reviews (approve / revision)
4. Admin reviews (approve / revision)
5. Both approved → unlock portfolio/studio definition  
   Revision → student resubmits

## F6 — Studio book + OTP

1. Leader’s portfolio turn unlocked
2. Leader books one online slot (blocked if prior booking and no permit)
3. Booking appears on Admin studio schedule
4. At studio: Admin displays OTP for that booking
5. Leader enters OTP in app while logged in
6. On success: physically verified; submission unlocks
7. If need second book: Admin grants rebook permit → leader may book again

## F7 — Admin broadcast

1. Admin composes Update → audience all students / all educators / everyone
2. Recipients get inbox + realtime bell update
