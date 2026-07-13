# Phase 3: Screen Structure and UX Planning

## IncluHub Education Management Dashboard

---

## 1. Current Phase

**Phase 3 — UX and Screen Planning**

Phase 1 defined the product.
Phase 2 defined the user flows.
Phase 3 defines the actual screens needed for the MVP.

---

## 2. UX Goal

The dashboard should make it easy for IncluHub Admin to answer these daily questions:

1. Which students are active?
2. Which team is in which stage?
3. Which portfolios are pending?
4. Which educator approval is pending?
5. Which admin approval is pending?
6. Which external member is assigned to which team?
7. Which students are ready for final unlock?

---

## 3. MVP Navigation Structure

### Admin Sidebar

| Menu Item           | Purpose                        |
| ------------------- | ------------------------------ |
| Dashboard           | Overall summary                |
| Users               | Create and manage users        |
| Students            | View student records           |
| Educators           | View educator records          |
| External Members    | Manage models/directors/others |
| Teams               | Create and manage teams        |
| Stages              | Track team progress            |
| Portfolio Approvals | Review Stage 3 submissions     |
| Project Approvals   | Review Stage 4 completion      |
| Notifications       | Send announcements             |
| Activity Logs       | View system history            |
| Settings            | Basic profile/settings only    |

---

### Student Sidebar

| Menu Item     | Purpose                     |
| ------------- | --------------------------- |
| Dashboard     | Current status summary      |
| My Team       | View assigned team          |
| My Stage      | View current unlocked stage |
| Portfolio     | Submit portfolio links      |
| Notifications | View updates                |

---

### Educator Sidebar

| Menu Item           | Purpose                           |
| ------------------- | --------------------------------- |
| Dashboard           | Assigned student/team summary     |
| My Students         | View assigned students            |
| My Teams            | View assigned teams               |
| Portfolio Approvals | Approve/reject portfolio work     |
| Project Approvals   | Approve/reject project completion |
| Notifications       | View updates                      |

---

### External Member Sidebar

| Menu Item       | Purpose                        |
| --------------- | ------------------------------ |
| Dashboard       | Assigned project summary       |
| Assigned Team   | View team details              |
| Project Details | View shoot/project information |
| Notifications   | View updates                   |

---

## 4. Admin Screens

### 4.1 Admin Dashboard

**Purpose:** Give IncluHub Admin a quick view of the full program.

#### Cards Required

| Card                        | Shows                        |
| --------------------------- | ---------------------------- |
| Total Students              | Count of all active students |
| Active Teams                | Count of current teams       |
| Stage 1 Teams               | Teams in team assignment     |
| Stage 2 Teams               | Teams in BMS stage           |
| Stage 3 Teams               | Teams in portfolio stage     |
| Stage 4 Teams               | Teams in project stage       |
| Stage 5 Teams               | Teams unlocked               |
| Pending Portfolio Approvals | Items needing review         |
| Pending Project Approvals   | Items needing review         |

#### Main Sections

1. Teams by stage
2. Pending approvals
3. Recent submissions
4. Recent activity logs

---

### 4.2 User Management Screen

**Purpose:** Create and manage login accounts.

#### Table Columns

| Column       |
| ------------ |
| Name         |
| Email        |
| Role         |
| Status       |
| Created Date |
| Last Login   |
| Actions      |

#### Actions

* Create user
* Edit user
* Deactivate user
* Resend invite

---

### 4.3 Create User Screen

**Purpose:** Admin creates accounts manually.

#### Fields

| Field             | Required                  |
| ----------------- | ------------------------- |
| Full Name         | Yes                       |
| Email             | Yes                       |
| Phone             | Optional                  |
| Role              | Yes                       |
| Student Category  | Required only for student |
| Assigned Educator | Optional                  |
| Status            | Yes                       |

#### Role Options

* Admin
* Student
* Educator
* External Member

#### Student Category Options

* Makeup Artist
* Photographer
* Hairstylist

---

### 4.4 Student List Screen

**Purpose:** View all students.

#### Filters

* Category
* Status
* Current stage
* Assigned team
* Assigned educator

#### Table Columns

| Column            |
| ----------------- |
| Student Name      |
| Category          |
| Team              |
| Current Stage     |
| Assigned Educator |
| Status            |
| Actions           |

---

### 4.5 Student Profile Screen

**Purpose:** View full student details.

#### Sections

1. Basic details
2. Student category
3. Assigned team
4. Current stage
5. Portfolio submissions
6. Approval history
7. Notifications history
8. Activity history

---

### 4.6 Educator List Screen

**Purpose:** Manage educator records.

#### Table Columns

| Column            |
| ----------------- |
| Educator Name     |
| Educator Type     |
| Assigned Students |
| Assigned Teams    |
| Status            |
| Actions           |

#### Educator Types

* Makeup Educator
* Photography Educator
* Hairstyling Educator

---

### 4.7 External Member List Screen

**Purpose:** Manage models, directors, photographers, brand mentors, and shoot mentors.

#### Table Columns

| Column           |
| ---------------- |
| Name             |
| External Role    |
| Assigned Team    |
| Assigned Project |
| Status           |
| Actions          |

#### External Role Options

* Model
* Creative Director
* Photographer
* Brand Mentor
* Shoot Mentor
* Other

---

### 4.8 Team List Screen

**Purpose:** View and manage all student teams.

#### Filters

* Stage
* Status
* Program
* Educator
* External member assigned / not assigned

#### Table Columns

| Column             |
| ------------------ |
| Team Name          |
| Makeup Artist      |
| Photographer       |
| Hairstylist        |
| Current Stage      |
| Assigned Educators |
| External Member    |
| Status             |
| Actions            |

---

### 4.9 Create Team Screen

**Purpose:** Create one balanced student team.

#### Fields

| Field                 | Required |
| --------------------- | -------- |
| Team Name             | Yes      |
| Program / Batch       | Yes      |
| Makeup Artist Student | Yes      |
| Photographer Student  | Yes      |
| Hairstylist Student   | Yes      |
| Makeup Educator       | Yes (must match makeup student institute) |
| Photography Educator  | Yes (must match photographer institute) |
| Hairstyling Educator  | Yes (must match hairstylist institute) |

Students may come from different institutes if they are enrolled in the selected Program / Batch.

**Success State:** Team is created and all related students/educators receive notification.

---

### 4.10 Team Detail Screen

**Purpose:** This is the most important screen in the product.

#### Sections

1. Team summary
2. Student members
3. Assigned educators
4. Current stage
5. Portfolio records
6. Project details
7. External member assignment
8. Approval status
9. Activity logs

#### Stage Progress Display

```text
Stage 0: Onboarding — Completed
Stage 1: Team Assignment — Completed
Stage 2: BMS Session — Current
Stage 3: Portfolio Submission — Locked
Stage 4: Brand / Creative Project — Locked
Stage 5: Ecosystem Unlock — Locked
```

The Team Detail Screen connects:

* Students
* Educators
* External members
* Stage progress
* Portfolio approvals
* Project approvals
* Final unlock status

---

## 5. Stage Screens

### 5.1 Stage Board Screen

**Purpose:** Kanban-style view of teams by stage.

#### Columns

| Column                   |
| ------------------------ |
| Stage 0: Onboarding      |
| Stage 1: Team Assignment |
| Stage 2: BMS Session     |
| Stage 3: Portfolio       |
| Stage 4: Project         |
| Stage 5: Unlocked        |

#### Team Card Shows

* Team name
* Student names
* Current stage
* Pending approval count
* Last updated date

---

### 5.2 Stage Detail Screen

**Purpose:** View and manage one team's stage.

#### Fields

| Field               |
| ------------------- |
| Team name           |
| Current stage       |
| Stage status        |
| Required tasks      |
| Student submissions |
| Educator approval   |
| Admin approval      |
| Remarks             |
| Next stage button   |

**Important Rule:** The Next Stage button stays disabled until all requirements are completed.

---

## 6. Portfolio Screens

### 6.1 Portfolio Submission Screen — Student

**Purpose:** Student submits portfolio work for Stage 3.

#### Student View

Each student sees:

1. Portfolio where they are leader
2. Two portfolios where they are assistant
3. Submission status
4. Approval status

#### Fields

| Field           | Required |
| --------------- | -------- |
| Portfolio Title | Yes      |
| Portfolio Type  | Yes      |
| Portfolio Link  | Yes      |
| Notes           | Optional |
| Supporting File | Optional |

---

### 6.2 Portfolio Approval Screen — Educator

**Purpose:** Educator approves portfolio work related to their category only.

Example: Photography educator only sees photography portfolio approvals.

#### Table Columns

| Column         |
| -------------- |
| Team           |
| Student Leader |
| Portfolio Type |
| Portfolio Link |
| Submitted Date |
| Status         |
| Action         |

#### Actions

* Approve
* Reject
* Request revision
* Add remarks

---

### 6.3 Portfolio Approval Screen — Admin

**Purpose:** IncluHub Admin gives final approval.

#### Admin Can See

* Makeup portfolio
* Photography portfolio
* Hairstyling portfolio
* Educator approval status
* Admin approval status

#### Unlock Rule

Stage 4 unlocks only when:

```text
Makeup portfolio approved by Makeup Educator + Admin
Photography portfolio approved by Photography Educator + Admin
Hairstyling portfolio approved by Hairstyling Educator + Admin
```

---

## 7. Project Screens

### 7.1 Project Assignment Screen — Admin

**Purpose:** Assign external member to team in Stage 4.

#### Fields

| Field           | Required |
| --------------- | -------- |
| Team            | Yes      |
| Project Name    | Yes      |
| Project Type    | Yes      |
| External Member | Yes      |
| Project Date    | Optional |
| Location        | Optional |
| Instructions    | Optional |

#### Project Type Options

* Brand shoot
* Portfolio shoot
* Creative project
* Practice project
* Other

---

### 7.2 Project Details Screen — Student

**Purpose:** Student views assigned project.

#### Shows

* Project name
* Team members
* External member
* Date/time
* Location
* Instructions
* Current status

---

### 7.3 Project Details Screen — External Member

**Purpose:** External member views only their assigned project/team.

#### Shows

* Assigned team
* Student names and roles
* Project name
* Date/time
* Location
* Instructions

---

### 7.4 Project Approval Screen — Educator

**Purpose:** Educator approves Stage 4 completion for assigned students/team.

#### Actions

* Approve
* Reject
* Request revision
* Add remarks

---

### 7.5 Project Approval Screen — Admin

**Purpose:** Admin gives final approval to unlock Stage 5.

#### Unlock Rule

Stage 5 unlocks only after:

```text
Educator approval completed
+
IncluHub Admin approval completed
```

---

## 8. Notification Screens

### 8.1 Notification Create Screen — Admin

**Purpose:** Admin sends updates.

#### Fields

| Field               | Required    |
| ------------------- | ----------- |
| Title               | Yes         |
| Message             | Yes         |
| Audience            | Yes         |
| Team/User selection | Conditional |
| Priority            | Optional    |

#### Audience Options

* All students
* All educators
* All external members
* Specific team
* Specific student
* Specific educator
* Specific external member

---

### 8.2 Notification Bell — All Users

**Purpose:** Users receive updates.

#### Shows

* Notification title
* Message preview
* Date/time
* Read/unread status

---

## 9. Activity Log Screen

**Purpose:** Track important system actions.

### Logs Required

| Action                      |
| --------------------------- |
| User created                |
| User invited                |
| Team created                |
| Stage updated               |
| Portfolio submitted         |
| Educator approved portfolio |
| Admin approved portfolio    |
| External member assigned    |
| Project approved            |
| Stage unlocked              |
| Notification sent           |

---

## 10. UX Rules

### 10.1 Role-Based Navigation

Users only see menu items they are allowed to use.

Student does not see:

* User Management
* Team Creation
* Admin Approval
* Activity Logs

Educator does not see:

* Create User
* Create Team
* Assign External Member

External member does not see:

* Student management
* Full team list
* Approval pages

---

### 10.2 Locked Stage Design

Locked stages are visible but disabled.

Example:

```text
Stage 3: Portfolio Submission
Locked until BMS Session is completed.
```

This helps users understand the journey without accessing future actions.

---

### 10.3 Approval Status Design

| Status            | Meaning            |
| ----------------- | ------------------ |
| Pending           | Waiting for action |
| Approved          | Approved           |
| Rejected          | Rejected           |
| Revision Required | Needs correction   |
| Locked            | Not available yet  |
| Completed         | Done               |

---

### 10.4 Empty States

| Screen             | Empty State                                   |
| ------------------ | --------------------------------------------- |
| Team List          | No teams created yet. Create your first team. |
| Portfolio Approval | No portfolios pending approval.               |
| Notifications      | No notifications yet.                         |
| External Dashboard | No project assigned yet.                      |

---

### 10.5 Error States

| Error                  | Message                                                                          |
| ---------------------- | -------------------------------------------------------------------------------- |
| Unauthorized page      | You do not have permission to view this page.                                    |
| Locked stage           | This stage is locked until previous requirements are completed.                  |
| Missing portfolio link | Please add a valid portfolio link.                                               |
| Approval pending       | This stage cannot be unlocked until all approvals are completed.                 |
| Invalid login          | Invalid email or password. Contact IncluHub Admin if you do not have an account. |

---

## 11. MVP Screen Priority

### Must Build First

1. Login
2. Admin dashboard
3. User management
4. Create user
5. Student list
6. Educator list
7. External member list
8. Team list
9. Create team
10. Team detail
11. Stage board
12. Portfolio submission
13. Portfolio approval
14. Project assignment
15. Project approval
16. Notifications

### Can Build Later

1. Advanced reports
2. Advanced charts
3. Detailed educator analytics
4. External member profile portfolio
5. Student certificate screen
6. Payment screen
7. WhatsApp screen
8. AI feedback screen

---

## 12. Final Phase 3 Output

The MVP is designed around these core screens:

```text
Login
↓
Role-based dashboard
↓
Team management
↓
Stage tracking
↓
Portfolio submission
↓
Dual approval
↓
Project assignment
↓
Final unlock
```

The most important screen in the product is the **Team Detail Screen** because it connects students, educators, external members, stage progress, portfolio approvals, project approvals, and final unlock status in one place.

---

## 13. Next Phase

**Phase 4: Database Planning**

Will define:

1. Tables
2. Columns
3. Relationships
4. Role permissions
5. Stage approval data structure
6. Portfolio approval data structure
7. Supabase RLS planning
