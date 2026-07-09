# IncluHub Education Management Dashboard — Project Rules

## Product Goal

Build an MVP dashboard for IncluHub to manage creative institute students through a structured post-academic support program.

The system should help IncluHub Admin manage:

- Students
- Educators
- External members
- Teams
- Stage progress
- Portfolio submissions
- Brand/project exposure
- Final ecosystem/application unlock

This is not a normal school ERP.  
This is a stage-based program workflow dashboard.

---

## Tech Stack

- Frontend: Next.js with TypeScript
- UI: Tailwind CSS + shadcn/ui
- Backend: Next.js Server Actions / Route Handlers
- Database: Supabase Postgres
- Auth: Supabase Auth
- Storage: Supabase Storage only if needed
- Hosting: Vercel

---

## MVP Roles

The MVP has only these roles:

1. admin
2. student
3. educator
4. external_member

Do not add Institute Admin in MVP.

---

## Authentication Rules

- No public signup
- No role selection during login
- No Google login in MVP
- Only Admin can create accounts
- User role must come from the `profiles` table
- After login, redirect user based on database role

Role redirects:

- admin → `/admin/dashboard`
- student → `/student/dashboard`
- educator → `/educator/dashboard`
- external_member → `/external/dashboard`

---

## Student Categories

Every student must belong to one category:

- makeup_artist
- photographer
- hairstylist

Admin selects this while creating the student account.

---

## Educator Types

Educators belong to one type:

- makeup_educator
- photography_educator
- hairstyling_educator

Educator can only approve work related to their category and assigned teams.

---

## External Member Types

External members can be:

- model
- creative_director
- photographer
- brand_mentor
- shoot_mentor
- other

External members can only see assigned project/team details.

---

## Team Rule

Each team should contain:

- 1 makeup_artist student
- 1 photographer student
- 1 hairstylist student

A student can be in only one active team at a time in MVP.

---

## Stage Flow

MVP stages:

0. Onboarding
1. Team Assignment
2. BMS Session
3. Portfolio Submission
4. Brand / Creative Project
5. Ecosystem / Application Unlock

---

## Stage Approval Rules

Stage 0: Admin only  
Stage 1: Admin only  
Stage 2: Admin only  
Stage 3: Admin + relevant educator approval  
Stage 4: Admin + educator approval  
Stage 5: Unlock only after Stage 4 approvals

Educators do not approve Stage 1.  
They only receive confirmation that their student joined a team.

---

## Portfolio Rule

In Stage 3, each team creates 3 portfolio outputs:

1. Makeup portfolio
2. Photography portfolio
3. Hairstyling portfolio

Each student contributes to 3 portfolios:

- 1 as leader
- 2 as assistant

Approval rule:

- Makeup portfolio → Makeup educator + Admin
- Photography portfolio → Photography educator + Admin
- Hairstyling portfolio → Hairstyling educator + Admin

Stage 4 unlocks only after all 3 portfolios are approved by both required approvers.

---

## Project Rule

In Stage 4:

- Admin creates project
- Admin assigns external member
- Students view project details
- External member views assigned team/project only
- Educator approves project completion
- Admin gives final approval

Stage 5 unlocks only after educator + admin approval.

---

## Permission Rules

Admin can:

- Create users
- Create teams
- Assign educators
- Assign external members
- Move stages
- Approve portfolios
- Approve projects
- Send notifications
- View activity logs

Student can:

- View own profile
- View own team
- View current stage
- Submit own portfolio leader work
- View notifications

Educator can:

- View assigned students
- View assigned teams
- Approve assigned category portfolio work
- Approve assigned project completion
- View notifications

External member can:

- View assigned project
- View assigned team basics
- View notifications

---

## Security Rules

- Never trust frontend-only protection
- Check permissions in server actions
- Use Supabase RLS for sensitive tables
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to browser
- Students must not see unrelated teams
- Educators must not see unrelated teams
- External members must not see unrelated projects
- Stage unlock must happen only through controlled server logic

---

## Do Not Build in MVP

Do not build:

- Payment gateway
- WhatsApp automation
- AI grading
- CRM
- Marketplace
- Mobile app
- Certificate automation
- Advanced analytics
- Public signup
- Complex external dashboard

Only keep `payment_status` as a manual admin field.
