# Product Master Document v2

## IncluHub Education Management Dashboard

## 1. Product Name

**IncluHub Education Management Dashboard**

MVP working name:

**IncluHub Program Workflow Dashboard**

---

## 2. Product Purpose

The platform helps IncluHub manage students from creative institutes through a structured post-academic support program.

It is used to manage:

* Student onboarding
* Student role/category assignment
* Team creation
* Stage-based progress
* Portfolio submission
* BMS session tracking
* Brand/project exposure tracking
* External member assignment
* Educator read-only visibility
* Final ecosystem/application unlock

---

## 3. Core Product Idea

This is not a normal school ERP.

This dashboard is a **program workflow system** where students move through locked stages.

```text
Student Added
↓
Student Approved
↓
Student Categorized
↓
Team Created
↓
BMS Session
↓
Portfolio Submission
↓
Brand / Creative Project
↓
Final Ecosystem / Application Unlock
```

---

## 4. Main Users

| Role                     | MVP Status      | Purpose                                              |
| ------------------------ | --------------- | ---------------------------------------------------- |
| IncluHub Admin / Manager | Include         | Main controller of the full system                   |
| Student                  | Include         | Completes stage-based tasks                          |
| Educator                 | Include         | Limited approval power (Stage 3 & 4 only)            |
| External Member / Other  | Include         | Model, creative director, photographer, brand mentor |
| Institute Admin          | Remove from MVP | Not needed in first version                          |
| Super Admin              | Optional        | Can be same as IncluHub Admin in MVP                 |

---

## 5. User Role Logic

### 5.1 IncluHub Admin / Manager

The IncluHub Admin controls the full system.

They can:

* Create user accounts
* Invite users
* Assign user roles
* Add students
* Categorize students
* Create teams
* Assign students to teams
* Assign educators
* Assign external members
* Move teams from one stage to another
* Approve or reject student submissions
* Send notifications
* View all program progress

---

### 5.2 Student

Students cannot create their own account.

The account is created by IncluHub Admin.

Student can:

* Login
* View own dashboard
* View assigned team
* View current unlocked stage
* Submit required forms or links
* Submit portfolio link
* View notifications
* See locked future stages

Student cannot:

* Choose their own role
* Change their category
* Enter future stages
* See other teams
* Approve their own progress

---

### 5.3 Educator

Educator has limited approval power in MVP.

Educator can:

* Login
* View assigned students
* View student team status
* View stage progress
* View who completed portfolio
* View who is assigned to model/director/project
* Approve or reject Stage 3 (Portfolio Submission)
* Approve or reject Stage 4 (Brand / Creative Project)

Educator cannot:

* Create students
* Edit students
* Create teams
* Move stages
* Send broadcast notifications
* Approve Stage 0, 1, or 2

---

### 5.4 External Member / Other

This includes:

* Model
* Creative Director
* Photographer
* Brand Mentor
* Shoot Mentor
* Other collaborator

External member can:

* Login
* View assigned team/project
* View shoot/project details
* View relevant notifications

External member cannot:

* View unrelated students
* View unrelated teams
* Edit stage progress
* Approve students
* Access admin data

---

## 6. Account Creation Rule

MVP will use **admin-created accounts only**.

```text
IncluHub Admin creates account
↓
Selects role
↓
Adds email
↓
System sends invite/password setup
↓
User logs in
↓
System checks database role
↓
User goes to correct dashboard
```

There will be:

* No public signup
* No role selection dropdown for users
* No Google login in MVP
* No self-registration

---

## 7. Student Category Logic

Every student has:

```text
role = student
student_category = makeup_artist / photographer / hairstylist
status = active / inactive
payment_status = pending / confirmed / waived
```

Student categories:

| Category      |
| ------------- |
| Makeup Artist |
| Photographer  |
| Hairstylist   |

Admin decides the category while creating or approving the student account.

`payment_status` is a manual admin field only. No payment gateway in MVP.

---

## 8. Team Logic

One team should ideally contain:

| Role          | Count |
| ------------- | ----- |
| Makeup Artist | 1     |
| Photographer  | 1     |
| Hairstylist   | 1     |

These three students may come from different institutes.

The team belongs to one IncluHub Program / Batch and shares one Stage 0–5 workflow.
Each student keeps their own institute and is mapped to a matching educator from that same institute.

Team is created by IncluHub Admin.

Team should have:

* Team name
* Program name
* Students
* Assigned educator
* Assigned external member
* Current stage
* Status

---

## 9. Program Stage Flow

| Stage   | Name                           | Description                                   | Approval Rule                  |
| ------- | ------------------------------ | --------------------------------------------- | ------------------------------ |
| Stage 0 | Onboarding                     | Student account is created and activated      | Admin only                     |
| Stage 1 | Team Assignment                | Student is assigned to a creative team        | Admin only                     |
| Stage 2 | BMS Session                    | Student/team attends BMS session              | Admin only                     |
| Stage 3 | Portfolio Submission           | Student submits portfolio link/details        | Admin + Educator (dual)        |
| Stage 4 | Brand / Creative Project       | Team works with model/director/project        | Admin + Educator (dual)        |
| Stage 5 | Ecosystem / Application Unlock | Final opportunity/application section unlocks | Unlocks after Stage 4 approval |

Important rule:

**No stage unlocks automatically. IncluHub Admin must approve every stage transition.**

Educators do not approve Stage 1. They only receive confirmation that their student joined a team.

---

## 10. MVP Features

### Feature 1: Authentication

* Login page
* Forgot password
* Invite-based account setup
* Role-based redirect
* No public signup

---

### Feature 2: User Management

* Create student
* Create educator
* Create external member
* Create admin
* Assign role
* Activate/deactivate account

---

### Feature 3: Student Management

* Student list
* Student profile
* Student category
* Assigned team
* Current stage
* Status
* Manual `payment_status` field

---

### Feature 4: Team Management

* Create team inside a Program / Batch
* Add 1 makeup artist (any participating institute)
* Add 1 photographer (any participating institute)
* Add 1 hairstylist (any participating institute)
* Map each student to their own institute’s matching educator
* Assign educator
* Assign program
* View team progress

---

### Feature 5: Stage Management

* Stage board
* Current stage
* Locked future stages
* Admin approval
* Stage history
* Completion status

---

### Feature 6: Student Submission

* Form submission
* Portfolio link submission
* Notes
* Admin review
* Approve/reject status

---

### Feature 7: External Member Assignment

* External member profile
* Assignment to team
* Project/shoot details
* External dashboard

---

### Feature 8: Notification Bell

* Admin creates notification
* Send to all students
* Send to educators
* Send to external members
* Send to specific team
* Read/unread status

---

### Feature 9: Educator Dashboard

* Assigned student list
* Assigned team list
* Stage status
* Portfolio completion
* Project assignment visibility
* Approve/reject Stage 3 and Stage 4

---

### Feature 10: Basic Activity Logs

Logs for:

* User created
* Team created
* Stage changed
* Submission approved
* External member assigned
* Notification sent

---

### Feature 11: Portfolio and Project Dual Approval System

Stage 3 and Stage 4 require both:

* IncluHub Admin approval
* Educator approval

Neither alone is sufficient to unlock the next stage.

Portfolio approval breakdown (Stage 3):

* Makeup portfolio → Makeup educator + Admin
* Photography portfolio → Photography educator + Admin
* Hairstyling portfolio → Hairstyling educator + Admin

Stage 4 unlocks only after all 3 portfolios are approved by both required approvers.

---

## 11. MVP Screens Required

### Admin Screens

1. Admin dashboard
2. User management
3. Create user
4. Student list
5. Student profile
6. Team list
7. Create team
8. Team detail
9. Stage progress board
10. Submission review
11. External member list
12. Assign external member
13. Notification create
14. Activity logs

### Student Screens

1. Student dashboard
2. My team
3. My current stage
4. Submit task/link
5. Portfolio submission
6. Notifications
7. Locked stages view

### Educator Screens

1. Educator dashboard
2. Assigned students
3. Assigned teams
4. Stage progress view
5. Portfolio/project approval

### External Member Screens

1. External dashboard
2. Assigned project/team
3. Shoot/project details
4. Notifications

---

## 12. Permission Rules

| Action                 | Admin | Student | Educator           | External Member    |
| ---------------------- | ----- | ------- | ------------------ | ------------------ |
| Login                  | Yes   | Yes     | Yes                | Yes                |
| Create users           | Yes   | No      | No                 | No                 |
| Assign roles           | Yes   | No      | No                 | No                 |
| Create teams           | Yes   | No      | No                 | No                 |
| View own team          | Yes   | Yes     | Yes, assigned only | Yes, assigned only |
| View all teams         | Yes   | No      | No                 | No                 |
| Submit task            | No    | Yes     | No                 | No                 |
| Approve Stage 0–2      | Yes   | No      | No                 | No                 |
| Approve Stage 3–4      | Yes   | No      | Yes, assigned only | No                 |
| Move stage             | Yes   | No      | No                 | No                 |
| Assign external member | Yes   | No      | No                 | No                 |
| Send notification      | Yes   | No      | No                 | No                 |
| Read notification      | Yes   | Yes     | Yes                | Yes                |
| View activity logs     | Yes   | No      | No                 | No                 |

---

## 13. Data Required

Core database tables:

1. users
2. profiles
3. students
4. educators
5. external_members
6. programs
7. teams
8. team_members
9. stages
10. team_stage_progress
11. tasks
12. submissions
13. external_assignments
14. notifications
15. notification_reads
16. activity_logs

Every major table should include:

* id
* created_at
* updated_at
* created_by
* status

Where needed:

* institute_id (on students/educators; not required as a single team-level institute)
* program_id (team container / Program Batch)
* program_institutes / program_enrollments
* team_id
* user_id

---

## 14. What MVP Should Avoid

* Payments or payment gateway
* WhatsApp automation
* AI features or AI grading
* Advanced analytics
* CRM
* Marketplace
* Mobile app
* Certificate automation
* Complex placement system
* Public registration
* Complex external dashboard
* Advanced charts
* Fully automated stage movement

---

## 15. Daily Workflow Solved

### Current problem

The manager currently has to manually track:

* Which student belongs to which category
* Which students are grouped together
* Which team is in which stage
* Which team attended BMS
* Which student submitted portfolio
* Which team is ready for project exposure
* Which model/director is assigned
* Which student is ready for final ecosystem/application access

### Dashboard solution

```text
Create user
↓
Assign role
↓
Create team
↓
Move team through stages
↓
Collect student submissions
↓
Assign external member
↓
Notify everyone
↓
Unlock final stage
```

---

## 16. Legal/Agreement Alignment

The dashboard tracks:

* Student onboarding
* Manual payment/onboarding status
* Course duration
* Portal access
* Stage completion
* BMS session
* Portfolio building
* Brand exposure
* Studio access limitations
* No automatic opportunity guarantee
* Student conduct issues
* Portal records as official reference

Important product rule:

**Completing stages does not guarantee work, income, internship, placement, or brand opportunity. Final ecosystem access depends on IncluHub approval.**

---

## 17. MVP Success State

The MVP is successful when:

**IncluHub Admin can create users, assign roles, create student teams, move those teams through locked stages, collect portfolio/task submissions, assign models or creative directors, send notifications, allow educators to approve Stage 3 and Stage 4, and allow educators to view progress without editing anything else.**

---

## 18. Final MVP Scope Statement

Build the smallest version that allows one real program to run properly.

The MVP should support:

1. One IncluHub Admin
2. Multiple students
3. Multiple educators
4. Multiple external members
5. Team-based program flow
6. Stage locking
7. Student submissions
8. Admin approvals
9. Educator dual approval for Stage 3 and Stage 4
10. Notifications
11. Activity logs

This is the first real operating system for IncluHub's post-academic support program.
