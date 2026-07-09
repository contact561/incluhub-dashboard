# Phase 5: Architecture Planning

## IncluHub Education Management Dashboard

---

## 1. Current Phase

**Phase 5 — Architecture Planning**

Phase 1 defined the product.
Phase 2 defined user flows.
Phase 3 defined screens.
Phase 4 defined database structure.
Phase 5 defines how the application should be technically structured.

---

## 2. Architecture Goal

The architecture must support this core workflow:

```text
Admin creates users
↓
Users log in through one login page
↓
System checks database role
↓
User is redirected to correct dashboard
↓
Admin creates teams
↓
Students move through locked stages
↓
Portfolio/project approvals happen
↓
Stage unlock happens securely
```

The system must never allow:

* Student accessing educator dashboard
* Educator accessing admin dashboard
* External member seeing unrelated teams
* Student seeing another team's data
* Stage unlock without required approvals
* Frontend-only permission protection

---

## 3. Recommended Tech Stack

| Layer          | Technology                              |
| -------------- | --------------------------------------- |
| Frontend       | Next.js with TypeScript                 |
| UI             | Tailwind CSS + shadcn/ui                |
| Backend Logic  | Next.js Server Actions / Route Handlers |
| Database       | Supabase Postgres                       |
| Authentication | Supabase Auth                           |
| Authorization  | Supabase RLS + server-side role checks  |
| File Storage   | Supabase Storage                        |
| Hosting        | Vercel                                  |
| Development    | Cursor Pro                              |
| Documentation  | ChatGPT Project                         |

---

## 4. High-Level System Architecture

```text
User Browser
↓
Next.js Frontend
↓
Role-Protected Routes
↓
Server Actions / Route Handlers
↓
Supabase Auth + Supabase Postgres
↓
RLS Policies
↓
Database Tables
```

The frontend should not decide permissions alone.

Every sensitive action must be checked in:

1. Route protection
2. Server action permission logic
3. Supabase RLS policy

---

## 5. Application Route Structure

### Public Routes

```text
/login
/forgot-password
/auth/callback
```

MVP does not include:

```text
/signup
/register
```

No public signup.

---

### Admin Routes

```text
/admin/dashboard
/admin/users
/admin/users/create
/admin/students
/admin/students/[id]
/admin/educators
/admin/external-members
/admin/teams
/admin/teams/create
/admin/teams/[id]
/admin/stages
/admin/portfolio-approvals
/admin/project-approvals
/admin/notifications
/admin/activity-logs
```

---

### Student Routes

```text
/student/dashboard
/student/my-team
/student/my-stage
/student/portfolio
/student/notifications
```

---

### Educator Routes

```text
/educator/dashboard
/educator/my-students
/educator/my-teams
/educator/portfolio-approvals
/educator/project-approvals
/educator/notifications
```

---

### External Member Routes

```text
/external/dashboard
/external/assigned-team
/external/project-details
/external/notifications
```

---

## 6. Folder Structure

```text
src/
  app/
    login/
    forgot-password/

    admin/
      dashboard/
      users/
      students/
      educators/
      external-members/
      teams/
      stages/
      portfolio-approvals/
      project-approvals/
      notifications/
      activity-logs/

    student/
      dashboard/
      my-team/
      my-stage/
      portfolio/
      notifications/

    educator/
      dashboard/
      my-students/
      my-teams/
      portfolio-approvals/
      project-approvals/
      notifications/

    external/
      dashboard/
      assigned-team/
      project-details/
      notifications/

  components/
    ui/
    layout/
    dashboard/
    forms/
    tables/
    cards/
    status/
    notifications/

  lib/
    supabase/
    auth/
    permissions/
    validations/
    constants/
    utils/

  actions/
    users/
    students/
    educators/
    external-members/
    teams/
    stages/
    portfolios/
    projects/
    notifications/

  types/
    database.ts
    roles.ts
    stages.ts
    approvals.ts

  middleware.ts
```

---

## 7. Authentication Architecture

### 7.1 Login Rule

There is one login page for all users.

```text
User enters email and password
↓
Supabase Auth verifies login
↓
System fetches profile from profiles table
↓
System reads role
↓
User is redirected to correct dashboard
```

### 7.2 Role Redirect Logic

| Role            | Redirect            |
| --------------- | ------------------- |
| admin           | /admin/dashboard    |
| student         | /student/dashboard  |
| educator        | /educator/dashboard |
| external_member | /external/dashboard |

### 7.3 Account Creation Rule

Only Admin can create accounts.

```text
Admin creates user
↓
Admin selects role
↓
Admin enters email
↓
System creates Supabase Auth user
↓
System creates profile row
↓
System creates student/educator/external record if needed
↓
Invite/password setup sent
```

MVP does not allow public signup.

---

## 8. Authorization Architecture

Authorization happens in three layers.

### Layer 1: Route Protection

```text
/student/dashboard
```

Only users with role `student` can enter.

If educator tries to open it:

```text
Redirect to /educator/dashboard
or show unauthorized page
```

### Layer 2: Server Action Protection

Every server action must check role.

```text
createTeam()       → Admin only
approvePortfolio() → Admin or matching educator only
```

### Layer 3: Supabase RLS Protection

Database blocks unauthorized reads/writes even if frontend logic fails.

A student should only read:

* own profile
* own student record
* own team
* own portfolio records
* own notifications

---

## 9. Permission Helper Functions

### Required Helpers

```text
getCurrentUser()
getCurrentProfile()
requireRole(role)
requireAdmin()
requireStudent()
requireEducator()
requireExternalMember()
canViewTeam(userId, teamId)
canApprovePortfolio(userId, portfolioId)
canApproveProject(userId, projectId)
canMoveStage(userId, teamId)
```

### Example — canApprovePortfolio

```text
Check user role
↓
If admin → allow admin approval
↓
If educator:
   Check educator type
   Check portfolio type matches educator type
   Check educator is assigned to team
↓
Allow only if all conditions match
```

Photography educator can approve only:

```text
portfolio_type = photography
```

They cannot approve makeup or hairstyling portfolios.

---

## 10. Stage Unlock Architecture

Stage movement never happens from frontend alone.

Use a controlled server action:

```text
attemptStageUnlock(teamId)
```

### Stage 0 → Stage 1

```text
Admin confirms student onboarding
```

### Stage 1 → Stage 2

```text
Team exists
+ Team has 1 makeup_artist
+ Team has 1 photographer
+ Team has 1 hairstylist
+ Admin confirms team assignment
```

### Stage 2 → Stage 3

```text
BMS marked completed by Admin
```

### Stage 3 → Stage 4

```text
Makeup portfolio approved by Makeup Educator + Admin
+ Photography portfolio approved by Photography Educator + Admin
+ Hairstyling portfolio approved by Hairstyling Educator + Admin
```

### Stage 4 → Stage 5

```text
Project completed
+ Educator approval completed
+ Admin approval completed
```

---

## 11. Portfolio Architecture

Stage 3 is the most complex part. For each team the system creates 3 portfolio outputs.

| Portfolio             | Leader        | Assistants                   | Educator Approval    |
| --------------------- | ------------- | ---------------------------- | -------------------- |
| Makeup Portfolio      | Makeup Artist | Photographer + Hairstylist   | Makeup Educator      |
| Photography Portfolio | Photographer  | Makeup Artist + Hairstylist  | Photography Educator |
| Hairstyling Portfolio | Hairstylist   | Makeup Artist + Photographer | Hairstyling Educator |

### Portfolio Data Flow

```text
Team enters Stage 3
↓
System creates 3 portfolio output records
↓
Students submit portfolio links/files
↓
Relevant educator reviews
↓
Admin reviews
↓
All approvals complete
↓
Stage 4 unlocks
```

---

## 12. Project Architecture

Stage 4 handles brand/creative project exposure.

### Project Flow

```text
Admin creates project
↓
Admin assigns external member
↓
Students see project details
↓
External member sees assigned team
↓
Project is completed
↓
Educator approves
↓
Admin approves
↓
Stage 5 unlocks
```

---

## 13. Notification Architecture

Notifications are stored in two tables: `notifications` and `notification_recipients`.

### Flow

```text
Admin creates notification
↓
System creates notification record
↓
System creates recipient rows
↓
Users see notification in bell
↓
User reads notification
↓
read_status = true
```

---

## 14. File Upload Architecture

Portfolio submission supports:

1. Portfolio link (required)
2. Optional file upload

Use Supabase Storage only for uploaded files.

### Storage Buckets

```text
portfolio-files
project-files
profile-images
```

### File Access Rules

| File Type      | Access                                                            |
| -------------- | ----------------------------------------------------------------- |
| Portfolio file | Student's team, assigned educator, admin                          |
| Project file   | Assigned team, assigned educator, assigned external member, admin |
| Profile image  | Own profile + admin                                               |

---

## 15. Backend Logic Choice

Use **Server Actions** for form-based dashboard actions:

* Create user
* Create team
* Submit portfolio
* Approve portfolio
* Create project
* Approve project
* Send notification

Use **Route Handlers** only when needed for:

* Auth callback
* Webhook (future)
* File handling if needed
* External API (future)

---

## 16. Layout Architecture

Use separate layouts for each role.

```text
app/admin/layout.tsx
app/student/layout.tsx
app/educator/layout.tsx
app/external/layout.tsx
```

Each layout should:

1. Check login
2. Check role
3. Render correct sidebar
4. Block unauthorized access

---

## 17. UI Component Architecture

### Common Components

```text
DashboardCard
DataTable
StatusBadge
StageBadge
ApprovalBadge
EmptyState
ConfirmDialog
NotificationBell
UserAvatar
PageHeader
FormSection
```

### Feature Components

```text
TeamCard
StageProgress
PortfolioSubmissionCard
PortfolioApprovalCard
ProjectAssignmentCard
ProjectApprovalCard
UserRoleBadge
```

---

## 18. State Management

For MVP, do not add complex state management.

Use:

* Server-side data fetching
* Server Actions
* React local state for forms/modals
* URL search params for filters

Avoid for MVP:

* Redux
* Zustand
* Complex global stores

---

## 19. Security Architecture

| Rule                                         | Reason                             |
| -------------------------------------------- | ---------------------------------- |
| No public signup                             | Prevent random account creation    |
| Role comes from database                     | Prevent role spoofing              |
| Server actions check permissions             | Prevent frontend bypass            |
| RLS enabled on sensitive tables              | Database-level security            |
| Students read only own/team data             | Protect student privacy            |
| Educators read only assigned teams           | Prevent cross-institute visibility |
| External members read only assigned projects | Protect internal data              |
| Activity logs for major actions              | Traceability                       |

---

## 20. Error Handling Architecture

Every action should return:

```text
success
error
message
fieldErrors
```

| Situation                  | Message                                                          |
| -------------------------- | ---------------------------------------------------------------- |
| Unauthorized access        | You do not have permission to perform this action.               |
| Locked stage               | This stage is locked until previous requirements are completed.  |
| Missing portfolio approval | All portfolio approvals must be completed before moving forward. |
| Invalid role               | This account does not have access to this dashboard.             |
| No account found           | Invalid login or contact IncluHub Admin.                         |

---

## 21. Activity Logging Architecture

### Log These Actions

```text
user_created
student_created
educator_created
external_member_created
team_created
team_stage_updated
portfolio_submitted
portfolio_educator_approved
portfolio_admin_approved
project_created
external_member_assigned
project_educator_approved
project_admin_approved
notification_sent
account_deactivated
```

---

## 22. Deployment Architecture

### Environments

| Environment | Purpose                   |
| ----------- | ------------------------- |
| Local       | Development               |
| Staging     | Testing before real users |
| Production  | Real institute usage      |

### Environment Variables

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_PROJECT_ID
APP_URL
```

`SUPABASE_SERVICE_ROLE_KEY` must never be exposed to the browser.

---

## 23. MVP Development Sequence

### Step 1: Project Setup

* Next.js + TypeScript
* Tailwind + shadcn/ui
* Supabase client setup

### Step 2: Auth Foundation

* Login page
* Forgot password
* Auth callback
* Role-based redirect
* Protected layouts

### Step 3: Admin User Management

* Create user
* Assign role
* Create profile
* Create student/educator/external record

### Step 4: Core Records

* Institutes
* Programs
* Students
* Educators
* External members

### Step 5: Team Management

* Create team
* Add 3 students
* Assign educators
* Notify educators/students

### Step 6: Stage Management

* Stage board
* Team detail
* Stage status
* Stage unlock logic

### Step 7: Portfolio System

* 3 portfolio outputs
* Leader/assistant logic
* Student submission
* Educator approval
* Admin approval
* Stage 4 unlock

### Step 8: Project System

* Create project
* Assign external member
* Project view
* Educator approval
* Admin approval
* Stage 5 unlock

### Step 9: Notifications

* Admin broadcast
* Notification bell
* Read/unread status

### Step 10: Activity Logs

* Log major actions
* Admin activity log screen

---

## 24. What Not to Add in Architecture Yet

* WhatsApp automation
* AI review
* Payment gateway
* Certificate generation
* Public signup
* Marketplace routes
* Mobile app APIs
* Advanced analytics engine
* Complex CRM module

---

## 25. Final Architecture Summary

```text
Next.js App Router
↓
Role-based layouts
↓
Server Actions for secure mutations
↓
Supabase Auth for login
↓
profiles table for role control
↓
Supabase Postgres for workflow data
↓
RLS for database protection
↓
Activity logs for traceability
```

The most important architecture rule:

**Never trust only the frontend. Every important action must be checked on the server and protected in the database.**

---

## 26. Next Phase

**Phase 6: Cursor Development Prompting**

In Phase 6, safe Cursor prompts will be created module by module.

Do not ask Cursor to build the full app at once.

Start with:

1. Project setup prompt
2. Supabase setup prompt
3. Auth + role redirect prompt
4. Admin user management prompt
5. Team management prompt
6. Stage logic prompt
