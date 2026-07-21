# IncluHub Project Handoff

Last updated: 2026-07-16

## 1. Project

IncluHub Education Management System is a role-based workflow platform for

creative education programmes.

Technology:

- Next.js with TypeScript

- Tailwind CSS

- shadcn/ui

- Supabase Postgres

- Supabase Auth

- Supabase Storage

- Vercel

Roles:

- Admin

- Educator

- Student

- External Member

## 2. Current project phase

Current phase:

Packages E1, E2, and F are implemented locally on
`chore/package-f-release-readiness`. Package F passed local application,
authorization, RLS, responsive browser, TypeScript, lint, and production build
checks. See `docs/releases/PACKAGE_F_RELEASE_READINESS.md` for the deployment gates.
Both Package E1 SQL verification scripts passed in the connected test Supabase
before Package G began.

The UI redesign programme is complete.

Completed:

- UI-1 Foundation

- UI-2 Student portal

- UI-3 Educator portal

- UI-4 Admin portal

- UI-5 final cross-role responsive and accessibility QA

Stage 3 portfolio workflow is complete and verified.

Stage 4 Brand Works application code, migration `013`, admin controls,
read-only student/educator visibility, and rollback-safe verification SQL are
implemented locally. Migration `013` has been applied to the connected test
Supabase project; no production project has been modified.

TEST TEAM ALPHA is currently at Stage 4 and TEST TEAM BETA is at Stage 5 for
the Ecosystem Welcome access checks.

Next package:

1. Package G — configure Vercel, deploy a preview, smoke-test all roles, then
   perform the approved submission/production deployment.

2. Replace the labelled placeholder ecosystem URL when the final destination is
   supplied, or explicitly approve the placeholder for submission.

## 3. Source-of-truth documents

Read these before implementation:

1. [AGENTS.md](http://AGENTS.md)

2. docs/PROJECT_[RULES.md](http://RULES.md)

3. docs/PROJECT_[HANDOFF.md](http://HANDOFF.md)

4. docs/PACKAGE_E_IMPLEMENTATION_[PLAN.md](http://PLAN.md)

5. docs/Product_[Master.md](http://Master.md)

6. docs/User_[Flows.md](http://Flows.md)

7. docs/Screen_[Structure.md](http://Structure.md)

8. docs/Database_[Plan.md](http://Plan.md)

9. docs/Architecture_[Plan.md](http://Plan.md)

10. docs/design/UI_IMPLEMENTATION_[PLAN.md](http://PLAN.md)

The latest approved Stage 4 and Stage 5 requirements in

docs/PACKAGE_E_IMPLEMENTATION_[PLAN.md](http://PLAN.md) supersede older project workflow ideas.

## 4. Final Stage 4 requirement

Stage 4 is named:

Brand Works

Stage 4 follows the Admin-controlled operational pattern used by Stage 2 BMS.

Workflow:

1. Team completes Stage 3.

2. Team enters Stage 4.

3. Admin schedules Brand Works.

4. Admin enters:

   - Brand Works date

   - optional remarks

5. Student sees the schedule as read-only.

6. Educator sees the schedule for assigned teams as read-only.

7. Admin may reschedule before completion.

8. Admin marks Brand Works completed after the scheduled date is reached.

9. Completion atomically moves the team and active Students to Stage 5.

There is no:

- Student Stage 4 submission

- Educator Stage 4 approval

- Admin Stage 4 approval queue

- revision or resubmission

- PDF upload

- project submission workflow

- External Member Stage 4 workflow

Recommended fields on team_stage_progress:

- brand_works_date

- brand_works_remarks

- brand_works_scheduled_at

- brand_works_scheduled_by

- brand_works_completed_at

- brand_works_completed_by

Recommended Admin-only RPCs:

- schedule_brand_works

- complete_brand_works

All Stage 4 writes must be RPC-only.

The complete_brand_works RPC must atomically:

1. verify Admin role

2. lock the team and stage-progress records

3. verify Stage 3 is complete

4. verify the team is active

5. verify the team is currently at Stage 4

6. verify Brand Works has been scheduled

7. reject completion when the scheduled date is in the future

8. mark Stage 4 complete

9. mark Stage 5 progress complete/unlocked

10. update team current_stage to 5

11. update active team Students to current_stage 5

12. record completion actor and timestamp

13. prevent duplicate completion

## 5. Final Stage 5 requirement

Stage 5 is:

IncluHub Ecosystem Welcome

After Brand Works completion:

1. Team and active Students reach Stage 5.

2. Student logs into IncluHub.

3. Student accesses:

   /student/ecosystem

4. Student sees a UI-focused welcome screen.

5. The page displays:

   - approved ecosystem application logo

   - programme-completion label

   - welcome title

   - short onboarding description

   - Enter the Ecosystem button

6. The button opens the configured external application URL in a new tab.

Approved welcome copy:

Eyebrow:

Programme Complete

Title:

Welcome to the IncluHub Ecosystem

Description:

You have successfully completed the IncluHub programme.

Your ecosystem access is now active.

CTA:

Enter the Ecosystem

Recommended configuration:

- NEXT_PUBLIC_ECOSYSTEM_APP_URL

- NEXT_PUBLIC_ECOSYSTEM_APP_NAME

- public/brand/incluhub-logo.svg

The external application password must not be stored in IncluHub.

Students below Stage 5 must not access the ecosystem page.

There is no separate Stage 5 approval or unlock button.

Click activity is not tracked in the MVP.

## 6. Superseded requirements

Do not implement these older Stage 4 ideas:

- Student project submission

- Educator Stage 4 approval

- Admin Stage 4 approval queue

- revision and resubmission

- PDF upload

- External Member collaboration

- project submission history

- project approval workflow

- multiple projects per team

Existing projects-related tables remain dormant unless a future requirement

explicitly activates them.

Project Approvals remains a future placeholder route and should be hidden from

the Admin MVP navigation.

## 7. Security rules

- Admin-only Stage 4 writes must use controlled RPCs.

- Never weaken RLS.

- Never expose one institute's private information to another institute.

- Student may access only their own team and stage data.

- Educator may access only assigned teams and Students.

- External Member may access only explicitly assigned information.

- Never use a service-role key in browser code.

- Never commit secrets.

- Use forward-only migrations.

- Do not modify historical migrations already applied.

## 8. Development rules

Before editing:

1. Read the source-of-truth documents.

2. Inspect the existing implementation.

3. Identify data, role, workflow and permission implications.

4. State the exact files expected to change.

5. Work only within the requested package.

After implementation run:

- git diff --check

- npm run lint

- npx tsc --noEmit

- npm test --if-present

- npm run build

Git rules:

- Do not work directly on master.

- Use one branch per package.

- Do not use git add .

- Do not modify unrelated untracked files.

- Do not commit or push unless explicitly requested.

- Review the complete diff before staging.

- Never commit credentials.

## 9. Immediate next task

The next implementation package is:

E1 — Stage 4 Brand Works

E1 must include:

- forward-only migration

- Brand Works fields on team_stage_progress

- Admin-only schedule_brand_works RPC

- Admin-only complete_brand_works RPC

- atomic transition from Stage 4 to Stage 5

- Admin scheduling and completion UI

- Student read-only Brand Works status

- Educator read-only Brand Works status

- Stage Board and timeline integration

- role and permission verification

- responsive UI

- documentation

- technical checks

Do not implement the Stage 5 ecosystem welcome page until E1 is complete and

verified.
