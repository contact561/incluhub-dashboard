# Phase 4: Database Planning

## IncluHub Education Management Dashboard

---

## 1. Current Phase

**Phase 4 — Database Planning**

This phase defines the database structure before development.

We are not writing final SQL yet.
We are first deciding:

1. Tables
2. Columns
3. Relationships
4. Permission rules
5. Approval logic
6. Stage unlock logic
7. Supabase RLS planning

---

## 2. Database Goal

The database must support this core workflow:

```text
Admin creates users
↓
Students are linked to institute and category
↓
Admin creates teams
↓
Team moves through stages
↓
Students submit portfolio work
↓
Educators approve only relevant portfolio/project work
↓
Admin gives final approval
↓
Next stage unlocks
```

---

## 3. Important Database Principle

Do not depend only on frontend logic.

The database must protect:

* Student data
* Educator access
* External member access
* Institute separation
* Stage locking
* Approval rules

Every important table should include:

| Column     | Purpose                           |
| ---------- | --------------------------------- |
| id         | Unique record ID                  |
| created_at | Record creation time              |
| updated_at | Last update time                  |
| created_by | User who created the record       |
| status     | active, inactive, completed, etc. |

Where needed:

| Column       | Purpose                                |
| ------------ | -------------------------------------- |
| institute_id | Keeps academy/institute data separated |
| program_id   | Connects record to program             |
| team_id      | Connects record to student team        |
| user_id      | Connects record to login user          |

---

## 4. Recommended Database Tables

| No. | Table Name              | Purpose                                     |
| --: | ----------------------- | ------------------------------------------- |
|   1 | profiles                | Stores role and basic user profile          |
|   2 | institutes              | Stores academy/institute details            |
|   3 | programs                | Stores post-academic programs               |
|   4 | students                | Stores student-specific details             |
|   5 | educators               | Stores educator-specific details            |
|   6 | external_members        | Stores models/directors/other collaborators |
|   7 | teams                   | Stores creative student teams               |
|   8 | team_members            | Connects students to teams                  |
|   9 | team_educators          | Connects educators to teams                 |
|  10 | stages                  | Master list of stages                       |
|  11 | team_stage_progress     | Tracks team progress through stages         |
|  12 | portfolio_outputs       | Stores the 3 portfolio outputs per team     |
|  13 | portfolio_participants  | Tracks leader and assistant roles           |
|  14 | portfolio_approvals     | Stores educator/admin portfolio approval    |
|  15 | projects                | Stores Stage 4 brand/creative project       |
|  16 | project_assignments     | Connects external members to projects       |
|  17 | project_approvals       | Stores educator/admin project approval      |
|  18 | notifications           | Stores notification messages                |
|  19 | notification_recipients | Tracks who received/read notification       |
|  20 | activity_logs           | Stores important system history             |

---

## 5. Enum Values

### user_role

```text
admin
student
educator
external_member
```

### student_category

```text
makeup_artist
photographer
hairstylist
```

### educator_type

```text
makeup_educator
photography_educator
hairstyling_educator
```

### external_member_type

```text
model
creative_director
photographer
brand_mentor
shoot_mentor
other
```

### stage_status

```text
locked
not_started
in_progress
pending_approval
completed
rejected
revision_required
```

### approval_status

```text
pending
approved
rejected
revision_required
```

### payment_status

```text
pending
confirmed
waived
not_required
```

This is only a manual admin record. No payment gateway in MVP.

---

## 6. Table-by-Table Plan

### 6.1 profiles

**Purpose:** Stores login user profile and role. Supabase Auth handles email/password. This table stores product-specific user data.

| Column     | Type      | Notes                                  |
| ---------- | --------- | -------------------------------------- |
| id         | uuid      | Same as auth user id                   |
| full_name  | text      | User name                              |
| email      | text      | User email                             |
| phone      | text      | Optional                               |
| role       | user_role | admin/student/educator/external_member |
| status     | text      | active/inactive/suspended              |
| created_by | uuid      | Admin who created user                 |
| created_at | timestamp | Auto                                   |
| updated_at | timestamp | Auto                                   |

**Important Rule:** User role comes only from this table. Users cannot choose their own role.

---

### 6.2 institutes

**Purpose:** Stores academy/institute records. Even though Institute Admin is not included in MVP, this table is needed because students and educators belong to institutes.

| Column                 | Type      | Notes             |
| ---------------------- | --------- | ----------------- |
| id                     | uuid      | Primary key       |
| name                   | text      | Institute name    |
| address                | text      | Institute address |
| phone                  | text      | Optional          |
| email                  | text      | Optional          |
| website_or_social      | text      | Optional          |
| authorized_person_name | text      | Optional          |
| status                 | text      | active/inactive   |
| created_by             | uuid      | Admin             |
| created_at             | timestamp | Auto              |
| updated_at             | timestamp | Auto              |

---

### 6.3 programs

**Purpose:** Stores the Program / Batch a team belongs to. A program can include multiple institutes via `program_institutes`.

| Column       | Type      | Notes                                      |
| ------------ | --------- | ------------------------------------------ |
| id           | uuid      | Primary key                                |
| institute_id | uuid      | Deprecated legacy column; nullable         |
| name         | text      | Program / Batch name                       |
| description  | text      | Optional                                   |
| start_date   | date      | Optional                                   |
| end_date     | date      | Optional                                   |
| status       | text      | active/completed/paused                    |
| created_by   | uuid      | Admin                                      |
| created_at   | timestamp | Auto                                       |
| updated_at   | timestamp | Auto                                       |

**Related tables:**

* `program_institutes` — which institutes participate in the Program / Batch
* `program_enrollments` — which students are enrolled in the Program / Batch

---

### 6.4 students

**Purpose:** Stores student-specific information.

| Column               | Type             | Notes                               |
| -------------------- | ---------------- | ----------------------------------- |
| id                   | uuid             | Primary key                         |
| user_id              | uuid             | Links to profiles.id                |
| institute_id         | uuid             | Student institute                   |
| student_category     | student_category | makeup_artist/photographer/hairstylist |
| payment_status       | payment_status   | Manual admin record                 |
| joining_date         | date             | Optional                            |
| course_start_date    | date             | Optional                            |
| course_end_date      | date             | Optional                            |
| current_team_id      | uuid             | Optional                            |
| current_stage_number | integer          | 0 to 5                              |
| status               | text             | active/inactive/suspended/completed |
| created_by           | uuid             | Admin                               |
| created_at           | timestamp        | Auto                                |
| updated_at           | timestamp        | Auto                                |

**Rule:** A student can be in only one active team at a time in MVP.

---

### 6.5 educators

**Purpose:** Stores educator-specific information.

| Column        | Type          | Notes                               |
| ------------- | ------------- | ----------------------------------- |
| id            | uuid          | Primary key                         |
| user_id       | uuid          | Links to profiles.id                |
| institute_id  | uuid          | Educator institute                  |
| educator_type | educator_type | makeup/photography/hairstyling      |
| status        | text          | active/inactive                     |
| created_by    | uuid          | Admin                               |
| created_at    | timestamp     | Auto                                |
| updated_at    | timestamp     | Auto                                |

**Rule:** Educator can only see assigned students/teams. Educator can approve only Stage 3 portfolio work related to their category and Stage 4 project completion for assigned teams.

---

### 6.6 external_members

**Purpose:** Stores models, creative directors, photographers, brand mentors, and other external collaborators.

| Column               | Type                 | Notes                |
| -------------------- | -------------------- | -------------------- |
| id                   | uuid                 | Primary key          |
| user_id              | uuid                 | Links to profiles.id |
| external_member_type | external_member_type | model/director/etc.  |
| bio                  | text                 | Optional             |
| status               | text                 | active/inactive      |
| created_by           | uuid                 | Admin                |
| created_at           | timestamp            | Auto                 |
| updated_at           | timestamp            | Auto                 |

---

### 6.7 teams

**Purpose:** Stores creative teams. Each team has 1 Makeup Artist, 1 Photographer, and 1 Hairstylist. Students may come from different institutes. The team is scoped to one Program / Batch.

| Column               | Type         | Notes                                      |
| -------------------- | ------------ | ------------------------------------------ |
| id                   | uuid         | Primary key                                |
| institute_id         | uuid         | Deprecated legacy column; nullable         |
| program_id           | uuid         | Linked Program / Batch (source of truth)   |
| team_name            | text         | Example: Team A                            |
| current_stage_number | integer      | 0 to 5                                     |
| stage_status         | stage_status | Current stage status                       |
| status               | text         | active/completed/paused                    |
| created_by           | uuid         | Admin                                      |
| created_at           | timestamp    | Auto                                       |
| updated_at           | timestamp    | Auto                                       |

**Rule:** Only Admin can create/edit teams. Team membership is not restricted to one institute.

---

### 6.8 team_members

**Purpose:** Connects students to teams.

| Column           | Type             | Notes                      |
| ---------------- | ---------------- | -------------------------- |
| id               | uuid             | Primary key                |
| team_id          | uuid             | Linked team                |
| student_id       | uuid             | Linked student             |
| student_category | student_category | Copied for easy filtering  |
| member_status    | text             | active/removed             |
| joined_at        | timestamp        | Auto                       |
| created_by       | uuid             | Admin                      |
| created_at       | timestamp        | Auto                       |
| updated_at       | timestamp        | Auto                       |

**Important Constraint:** For each active team — only one active makeup_artist, one active photographer, one active hairstylist.

---

### 6.9 team_educators

**Purpose:** Maps each team student to their matching educator from the same institute.

| Column        | Type          | Notes                              |
| ------------- | ------------- | ---------------------------------- |
| id            | uuid          | Primary key                        |
| team_id       | uuid          | Linked team                        |
| student_id    | uuid          | Linked student on the team         |
| educator_id   | uuid          | Linked educator                    |
| educator_type | educator_type | Category                           |
| status        | text          | active/inactive                    |
| created_by    | uuid          | Admin                              |
| created_at    | timestamp     | Auto                               |
| updated_at    | timestamp     | Auto                               |

**Rule:** Educator receives team assignment confirmation after Stage 1. No educator approval needed in Stage 1. Educator institute must match the mapped student’s institute.

---

### 6.10 stages

**Purpose:** Master table for fixed stage names.

#### MVP Stage Records

| Stage Number | Stage Name                     |
| -----------: | ------------------------------ |
|            0 | Onboarding                     |
|            1 | Team Assignment                |
|            2 | BMS Session                    |
|            3 | Portfolio Submission           |
|            4 | Brand / Creative Project       |
|            5 | Ecosystem / Application Unlock |

| Column                     | Type    | Notes           |
| -------------------------- | ------- | --------------- |
| id                         | uuid    | Primary key     |
| stage_number               | integer | 0 to 5          |
| name                       | text    | Stage name      |
| description                | text    | Optional        |
| requires_admin_approval    | boolean | Yes/no          |
| requires_educator_approval | boolean | Yes/no          |
| status                     | text    | active/inactive |

---

### 6.11 team_stage_progress

**Purpose:** Tracks each team's progress through each stage.

| Column                | Type            | Notes                        |
| --------------------- | --------------- | ---------------------------- |
| id                    | uuid            | Primary key                  |
| team_id               | uuid            | Linked team                  |
| stage_id              | uuid            | Linked stage                 |
| stage_number          | integer         | 0 to 5                       |
| status                | stage_status    | locked/in_progress/completed |
| started_at            | timestamp       | Optional                     |
| completed_at          | timestamp       | Optional                     |
| admin_approval_status | approval_status | Needed for stage completion  |
| admin_approved_by     | uuid            | Admin user                   |
| admin_approved_at     | timestamp       | Optional                     |
| admin_remarks         | text            | Optional                     |
| created_by            | uuid            | Admin                        |
| created_at            | timestamp       | Auto                         |
| updated_at            | timestamp       | Auto                         |

**Important Rule:** Stage 3 and Stage 4 need extra approval tables because they are more complex.

---

## 7. Portfolio Database Structure

Stage 3 is not a simple submission. Each team must create 3 portfolio outputs — makeup, photography, and hairstyling. Each student acts once as leader and twice as assistant.

### 7.1 portfolio_outputs

**Purpose:** Stores the main portfolio records. One team creates 3 records.

| Portfolio Type | Leader        |
| -------------- | ------------- |
| makeup         | Makeup Artist |
| photography    | Photographer  |
| hairstyling    | Hairstylist   |

| Column            | Type             | Notes                                       |
| ----------------- | ---------------- | ------------------------------------------- |
| id                | uuid             | Primary key                                 |
| team_id           | uuid             | Linked team                                 |
| portfolio_type    | student_category | makeup/photography/hairstyling              |
| leader_student_id | uuid             | Student leading this portfolio              |
| portfolio_title   | text             | Required                                    |
| portfolio_link    | text             | Required                                    |
| notes             | text             | Optional                                    |
| status            | approval_status  | pending/approved/rejected/revision_required |
| submitted_at      | timestamp        | Optional                                    |
| created_by        | uuid             | Student/Admin                               |
| created_at        | timestamp        | Auto                                        |
| updated_at        | timestamp        | Auto                                        |

---

### 7.2 portfolio_participants

**Purpose:** Tracks leader and assistant roles for each portfolio.

| Column              | Type      | Notes            |
| ------------------- | --------- | ---------------- |
| id                  | uuid      | Primary key      |
| portfolio_output_id | uuid      | Linked portfolio |
| student_id          | uuid      | Linked student   |
| participation_role  | text      | leader/assistant |
| created_at          | timestamp | Auto             |

**Example — Photography Portfolio:**

| Student       | Role      |
| ------------- | --------- |
| Photographer  | leader    |
| Makeup Artist | assistant |
| Hairstylist   | assistant |

---

### 7.3 portfolio_approvals

**Purpose:** Stores approval from educator and admin. Each portfolio needs relevant educator approval and admin approval.

| Column              | Type            | Notes                                       |
| ------------------- | --------------- | ------------------------------------------- |
| id                  | uuid            | Primary key                                 |
| portfolio_output_id | uuid            | Linked portfolio                            |
| approver_user_id    | uuid            | Educator/Admin profile id                   |
| approver_role       | text            | educator/admin                              |
| approval_status     | approval_status | pending/approved/rejected/revision_required |
| remarks             | text            | Optional                                    |
| approved_at         | timestamp       | Optional                                    |
| created_at          | timestamp       | Auto                                        |
| updated_at          | timestamp       | Auto                                        |

**Approval Matching Rule:**

| Portfolio Type        | Educator Who Can Approve |
| --------------------- | ------------------------ |
| Makeup Portfolio      | Makeup Educator          |
| Photography Portfolio | Photography Educator     |
| Hairstyling Portfolio | Hairstyling Educator     |

**Stage 3 Unlock Rule:**

```text
All 3 portfolio_outputs are approved
+
Each portfolio has relevant educator approval
+
Each portfolio has admin approval
```

---

## 8. Project Database Structure

### 8.1 projects

**Purpose:** Stores Stage 4 project details.

| Column       | Type         | Notes                                                               |
| ------------ | ------------ | ------------------------------------------------------------------- |
| id           | uuid         | Primary key                                                         |
| team_id      | uuid         | Linked team                                                         |
| project_name | text         | Required                                                            |
| project_type | text         | brand_shoot/portfolio_shoot/creative_project/practice_project/other |
| project_date | date         | Optional                                                            |
| location     | text         | Optional                                                            |
| instructions | text         | Optional                                                            |
| status       | stage_status | in_progress/pending_approval/completed                              |
| created_by   | uuid         | Admin                                                               |
| created_at   | timestamp    | Auto                                                                |
| updated_at   | timestamp    | Auto                                                                |

---

### 8.2 project_assignments

**Purpose:** Connects external members to projects.

| Column             | Type      | Notes                      |
| ------------------ | --------- | -------------------------- |
| id                 | uuid      | Primary key                |
| project_id         | uuid      | Linked project             |
| external_member_id | uuid      | Model/director/etc.        |
| assignment_role    | text      | model/director/mentor/etc. |
| status             | text      | active/inactive/completed  |
| created_by         | uuid      | Admin                      |
| created_at         | timestamp | Auto                       |
| updated_at         | timestamp | Auto                       |

**Rule:** External member can view only assigned project/team.

---

### 8.3 project_approvals

**Purpose:** Stores Stage 4 approval from educator and admin.

| Column           | Type            | Notes                                       |
| ---------------- | --------------- | ------------------------------------------- |
| id               | uuid            | Primary key                                 |
| project_id       | uuid            | Linked project                              |
| approver_user_id | uuid            | Educator/Admin                              |
| approver_role    | text            | educator/admin                              |
| approval_status  | approval_status | pending/approved/rejected/revision_required |
| remarks          | text            | Optional                                    |
| approved_at      | timestamp       | Optional                                    |
| created_at       | timestamp       | Auto                                        |
| updated_at       | timestamp       | Auto                                        |

**Stage 4 Unlock Rule:**

```text
Project completed
+
Educator approval completed
+
Admin approval completed
```

---

## 9. Notification Database Structure

### 9.1 notifications

**Purpose:** Stores notification messages created by Admin.

| Column        | Type      | Notes                                                               |
| ------------- | --------- | ------------------------------------------------------------------- |
| id            | uuid      | Primary key                                                         |
| title         | text      | Required                                                            |
| message       | text      | Required                                                            |
| audience_type | text      | all_students/all_educators/all_external/specific_team/specific_user |
| priority      | text      | normal/high                                                         |
| created_by    | uuid      | Admin                                                               |
| created_at    | timestamp | Auto                                                                |
| updated_at    | timestamp | Auto                                                                |

---

### 9.2 notification_recipients

**Purpose:** Tracks who received and read a notification.

| Column            | Type      | Notes               |
| ----------------- | --------- | ------------------- |
| id                | uuid      | Primary key         |
| notification_id   | uuid      | Linked notification |
| recipient_user_id | uuid      | User profile        |
| read_status       | boolean   | true/false          |
| read_at           | timestamp | Optional            |
| created_at        | timestamp | Auto                |

**Rule:** Users can only see notifications where they are a recipient.

---

## 10. Activity Logs

### 10.1 activity_logs

**Purpose:** Tracks important system actions.

| Column        | Type      | Notes                     |
| ------------- | --------- | ------------------------- |
| id            | uuid      | Primary key               |
| actor_user_id | uuid      | User who performed action |
| action_type   | text      | Example: team_created     |
| entity_type   | text      | team/student/project/etc. |
| entity_id     | uuid      | Related record            |
| description   | text      | Human-readable log        |
| metadata      | jsonb     | Optional extra data       |
| created_at    | timestamp | Auto                      |

### Actions to Log

| Action                      |
| --------------------------- |
| User created                |
| User invited                |
| Student created             |
| Team created                |
| Stage completed             |
| Portfolio submitted         |
| Educator approved portfolio |
| Admin approved portfolio    |
| Project assigned            |
| Project approved            |
| Notification sent           |
| Account deactivated         |

---

## 11. Main Relationships

### User Relationship

```text
auth.users
↓
profiles
↓
students / educators / external_members
```

### Student-Team Relationship

```text
students
↓
team_members
↓
teams
```

### Team-Educator Relationship

```text
educators
↓
team_educators
↓
teams
```

### Team-Stage Relationship

```text
teams
↓
team_stage_progress
↓
stages
```

### Portfolio Relationship

```text
teams
↓
portfolio_outputs
↓
portfolio_participants
↓
portfolio_approvals
```

### Project Relationship

```text
teams
↓
projects
↓
project_assignments → external_members

projects
↓
project_approvals
```

---

## 12. Role-Based Database Access Rules

### Admin

* Read all records
* Create all users
* Create teams
* Assign educators
* Assign external members
* Approve portfolios
* Approve projects
* Move stages
* Send notifications
* View activity logs

### Student

* Read own profile
* Read own student record
* Read own team
* Read own current stage
* Read own portfolio records
* Submit/update own portfolio before approval
* Read own notifications

Student cannot read unrelated teams, approve anything, move stages, or view activity logs.

### Educator

* Read own profile
* Read assigned teams
* Read assigned students
* Read relevant portfolio outputs
* Approve/reject relevant portfolio outputs
* Approve/reject assigned project completion
* Read own notifications

Educator cannot create users, create teams, assign members, approve unrelated category portfolios, send global notifications, or view unrelated data.

### External Member

* Read own profile
* Read assigned project
* Read assigned team basic details
* Read project instructions
* Read own notifications

External member cannot view unrelated projects, approve stages, edit teams, or view activity logs.

---

## 13. Supabase RLS Planning

| Table                   | RLS Rule                                                                                     |
| ----------------------- | -------------------------------------------------------------------------------------------- |
| profiles                | User can read own profile; Admin can read all                                                |
| students                | Student can read own record; educator can read assigned students; admin can read all         |
| educators               | Educator can read own record; admin can read all                                             |
| external_members        | External member can read own record; admin can read all                                      |
| teams                   | Admin can read all; student/educator/external can read only assigned teams                   |
| team_members            | Users can read rows connected to their assigned team                                         |
| team_educators          | Educator can read own assigned teams; admin can manage                                       |
| portfolio_outputs       | Student can read own team portfolio; educator can read relevant category; admin can read all |
| portfolio_approvals     | Educator can create/update own approval; admin can create/update admin approval              |
| projects                | Assigned team members, educators, external members, and admin can read                       |
| project_approvals       | Educator/admin approval only                                                                 |
| notifications           | Admin creates; users read only assigned notifications                                        |
| activity_logs           | Admin only                                                                                   |

---

## 14. Stage Unlock Logic

### Stage 0 → Stage 1

Unlocked by Admin after student onboarding.

### Stage 1 → Stage 2

Unlocked by Admin after team is created. Educators only receive notification.

### Stage 2 → Stage 3

Unlocked by Admin after BMS session is marked completed.

### Stage 3 → Stage 4

Unlocked only if:

```text
Makeup portfolio = educator approved + admin approved
Photography portfolio = educator approved + admin approved
Hairstyling portfolio = educator approved + admin approved
```

### Stage 4 → Stage 5

Unlocked only if:

```text
Project = educator approved + admin approved
```

---

## 15. MVP Database Build Order

1. profiles
2. institutes
3. programs
4. students
5. educators
6. external_members
7. teams
8. team_members
9. team_educators
10. stages
11. team_stage_progress
12. portfolio_outputs
13. portfolio_participants
14. portfolio_approvals
15. projects
16. project_assignments
17. project_approvals
18. notifications
19. notification_recipients
20. activity_logs

---

## 16. What Not to Build in Database Yet

| Table                | Reason                    |
| -------------------- | ------------------------- |
| payments             | No payment gateway in MVP |
| invoices             | Future                    |
| whatsapp_messages    | Future automation         |
| ai_reviews           | Future AI                 |
| certificates         | Future                    |
| placements           | Future                    |
| marketplace_listings | Future                    |
| advanced_analytics   | Future                    |
| crm_leads            | Future                    |

Only keep `payment_status` as a manual field inside `students`.

---

## 17. Final Phase 4 Output

The database is planned around the real workflow:

```text
Users
↓
Students / Educators / External Members
↓
Teams
↓
Stages
↓
Portfolio Outputs
↓
Dual Approval
↓
Projects
↓
Final Unlock
```

The most important database tables are:

1. teams
2. team_stage_progress
3. portfolio_outputs
4. portfolio_approvals
5. projects
6. project_approvals

These tables control the real product workflow.

---

## 18. Next Phase

**Phase 5: Architecture Planning**

Will define:

1. Next.js app structure
2. Supabase Auth flow
3. Role-based route protection
4. Server-side permission checks
5. Folder structure
6. API/server action planning
7. Security architecture
8. Cursor development sequence
