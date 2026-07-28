# IncluHub Dashboard — Project Rules

## Product and MVP

IncluHub is a stage-based education and creative-workflow dashboard. The MVP
manages students, educators, teams, stages, moodboards, studio bookings,
portfolios, brand work, notifications, and final ecosystem access.

Do not add payments, WhatsApp automation, AI features, CRM, a marketplace, a
mobile app, certificate automation, advanced analytics, or public signup.

## Technology

- Next.js and TypeScript
- Tailwind CSS and shadcn/ui
- Next.js Server Actions / Route Handlers
- Supabase Postgres and Supabase Auth
- Vercel hosting

## Authentication and security

- There is no public signup and no role selector on login.
- Admin creates every user.
- Roles come only from the `profiles` table.
- Protected actions must be checked server-side and protected by RLS.
- `SUPABASE_SERVICE_ROLE_KEY` must never reach browser code.
- Login redirects: Admin `/admin/dashboard`, Student `/student/dashboard`,
  Educator `/educator/dashboard`, External Member `/external/dashboard`.

## Roles

- **Admin:** creates users and teams, controls stages, reviews moodboards and
  portfolios, generates studio OTPs, grants ecosystem access, and sends
  notifications.
- **Student:** sees their team and stage, submits leader moodboards and
  portfolios, books eligible shoots, enters studio OTPs, and reads comments.
- **Educator:** monitors only assigned teams and students and adds advisory
  comments. Educators never approve, reject, or request revision.
- **External member:** sees only assigned project and team information.

Students use one category: `makeup_artist`, `photographer`, or `hairstylist`.
Educators use the corresponding educator type.

## Team rule

An active team has exactly one student from each student category. A team
belongs to one Program / Batch; each student retains their institute and
matching educator. A student belongs to only one active team in the MVP.

## Stage flow and approvals

0. Onboarding — Admin only
1. Team Assignment — Admin only
2. BMS Session — Admin only
3. Portfolio Submission — Admin only
4. Brand / Creative Project — Admin only
5. Ecosystem / Application Access — Admin grants access after Stage 4

Educators receive updates, monitor progress, and comment. Their comments never
change or block workflow state.

## Stage 3 portfolio flow

Each team completes three sequential portfolio outputs:

1. Photography
2. Makeup
3. Hairstyling

For every output, one student is leader and the other two are assistants. The
required order is:

1. Leader submits a moodboard.
2. Admin approves it or requests revision.
3. After moodboard approval, assistants share availability and the leader books
   one live studio slot.
4. At the booked time, Admin generates a six-digit OTP valid for five minutes.
5. The booked student enters the OTP, which unlocks portfolio upload.
6. The leader uploads the portfolio.
7. Student sees: “Your moodboard and portfolio are under review. Please wait
   for an update from the IncluHub Manager by email or phone regarding
   selection for a brand or the ecosystem.”
8. Educators may comment; Admin alone approves or requests revision.

The next portfolio unlocks only after Admin approves the current one. Stage 4
unlocks after Admin approves all three.

## Studio booking entitlement

- The three Stage 3 portfolios provide three team bookings.
- After Admin grants Stage 5 ecosystem access, each student receives exactly
  two individual personal-shoot credits.
- A three-student team therefore receives nine shoots overall: three team
  shoots plus six individual shoots.
- Personal credits cannot be transferred between students.
- All studio attendance uses Admin-generated OTP, not QR.

## Stage 4 and Stage 5

Admin controls Brand Works completion. Educators can monitor and comment but do
not approve it. Stage 5 access is an Admin selection decision and does not
guarantee placement, paid work, an internship, or a brand opportunity.

## Implementation discipline

- Complete only the currently requested module.
- Preserve server-side authorization for every mutation.
- Keep destructive test resets explicitly gated.
- Schema changes must be additive migrations committed with the application
  changes that use them.
