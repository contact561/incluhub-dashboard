# Phase 2: Role-Based User Flow Document

## IncluHub Education Management Dashboard

---

## 1. Phase

**Current Phase:** Phase 2 — User Flow Planning

Phase 1 is now locked. The product is a stage-based program workflow dashboard for managing creative students, educators, external members, and IncluHub Admin approvals.

---

## 2. Final User Roles

| Role                     | Purpose                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------- |
| IncluHub Admin / Manager | Controls account creation, team creation, stages, approvals, notifications, and assignments |
| Student                  | Completes assigned stage tasks and portfolio submissions                                    |
| Educator                 | Views assigned students and approves portfolio/project stages where required                |
| External Member / Other  | Views only assigned project/team details                                                    |
| Institute Admin          | Not included in MVP                                                                         |

---

## 3. Main System Flow

```text
Admin creates users
↓
Admin assigns roles
↓
Admin creates student teams
↓
Students move through stage-based program
↓
Students submit required work
↓
Educators approve only required portfolio/project stages
↓
Admin gives final approval
↓
Next stage unlocks
```

---

## 4. Admin User Flow

### 4.1 Admin Login Flow

```text
Admin opens login page
↓
Enters email and password
↓
System checks role from database
↓
Role = admin
↓
Admin dashboard opens
```

### Admin Dashboard Shows

* Total students
* Pending students
* Active teams
* Teams by stage
* Pending portfolio approvals
* Pending educator approvals
* External member assignments
* Notifications sent
* Recent activity logs

---

### 4.2 Admin Creates User

```text
Admin goes to User Management
↓
Clicks Create User
↓
Adds name, email, phone
↓
Selects role
↓
If student, selects category
↓
System sends invite/password setup
↓
User account becomes active
```

### Role Options

* Student
* Educator
* External Member
* Admin

### Student Category Options

* Makeup Artist
* Photographer
* Hairstylist

---

## 5. Student User Flow

### 5.1 Student Login Flow

```text
Student opens login page
↓
Enters email and password
↓
System checks role from database
↓
Role = student
↓
Student dashboard opens
```

### Student Dashboard Shows

* Current stage
* Assigned team
* Team members
* Tasks to complete
* Portfolio submission area
* Locked future stages
* Notifications

---

### 5.2 Student Stage Access Rule

A student can only interact with the current unlocked stage.

Example:

```text
Student is in Stage 2
↓
Stage 3, Stage 4, and Stage 5 are visible but locked
↓
Student cannot submit anything in locked stages
```

---

## 6. Educator User Flow

### 6.1 Educator Login Flow

```text
Educator opens login page
↓
Enters email and password
↓
System checks role from database
↓
Role = educator
↓
Educator dashboard opens
```

### Educator Dashboard Shows

* Assigned students
* Assigned student teams
* Stage status
* Team assignment updates
* Portfolio approval requests
* Project approval requests
* Notifications

---

### 6.2 Educator Permission Rule

Educator is mostly read-only with limited approval power.

Educator can:

* View assigned students
* View assigned teams
* View stage progress
* View portfolio submissions
* Approve/reject Stage 3 portfolio work
* Approve/reject Stage 4 project completion

Educator cannot:

* Create users
* Create teams
* Move stages directly
* Assign external members
* Send global notifications
* View unrelated students

---

## 7. External Member User Flow

### 7.1 External Member Login Flow

```text
External member opens login page
↓
Enters email and password
↓
System checks role from database
↓
Role = external_member
↓
External dashboard opens
```

### External Dashboard Shows

* Assigned team
* Project or shoot details
* Student team members
* Date/time/location if added
* Instructions
* Notifications

External member cannot approve stages in MVP.

---

## 8. Stage-Based Flow

### Stage 0: Onboarding

**Purpose:** Student account is created and activated.

```text
Admin creates student account
↓
Admin selects student category
↓
Student receives invite
↓
Student logs in
↓
Student becomes available for team creation
```

| Role           | Approval |
| -------------- | -------- |
| IncluHub Admin | Yes      |
| Educator       | No       |

---

### Stage 1: Team Assignment

**Purpose:** Create a creative team with one student from each category.

```text
Admin creates team
↓
Admin selects one student from each category
↓
Team is created
↓
Students receive team update
↓
Educators receive confirmation update
↓
Stage 1 is marked complete by Admin
```

**Educator Rule:** Educators do not approve Stage 1. They only receive a confirmation notification.

Example notification:
```text
Your photography student has been assigned to Team A with one makeup artist and one hairstylist.
```

| Role           | Approval |
| -------------- | -------- |
| IncluHub Admin | Yes      |
| Educator       | No       |

---

### Stage 2: BMS Session

**Purpose:** Track whether the team/student attended the BMS session.

```text
Team attends BMS session
↓
Admin marks BMS completed
↓
Students receive stage completion update
↓
Educators can view the completion
↓
Stage 3 unlocks
```

| Role           | Approval |
| -------------- | -------- |
| IncluHub Admin | Yes      |
| Educator       | No       |

---

### Stage 3: Portfolio Submission

**Purpose:** Each student must complete portfolio work before the team moves to project/brand exposure.

#### Portfolio Output Logic

For one team, the system creates 3 main portfolio records:

| Portfolio Output      | Leader        | Assistants                   | Educator Approval    |
| --------------------- | ------------- | ---------------------------- | -------------------- |
| Makeup Portfolio      | Makeup Artist | Photographer + Hairstylist   | Makeup Educator      |
| Photography Portfolio | Photographer  | Makeup Artist + Hairstylist  | Photography Educator |
| Hairstyling Portfolio | Hairstylist   | Makeup Artist + Photographer | Hairstyling Educator |

Each student contributes to 3 portfolios: 1 as leader, 2 as assistant.

Each portfolio output requires:

* Portfolio title
* Portfolio type
* Leader student
* Assistant students
* Portfolio link/file
* Student notes
* Educator approval status
* Admin approval status

#### Stage 3 Approval Flow

```text
Student submits portfolio
↓
Relevant educator reviews portfolio
↓
Educator approves or rejects
↓
IncluHub Admin reviews portfolio
↓
Admin approves or rejects
↓
All 3 portfolio outputs must be approved
↓
Stage 4 unlocks
```

| Portfolio Type        | Educator Required    | Admin Required |
| --------------------- | -------------------- | -------------- |
| Makeup Portfolio      | Makeup Educator      | IncluHub Admin |
| Photography Portfolio | Photography Educator | IncluHub Admin |
| Hairstyling Portfolio | Hairstyling Educator | IncluHub Admin |

#### Stage 3 Unlock Rule

Team moves to Stage 4 only when:

```text
Makeup portfolio approved
+
Photography portfolio approved
+
Hairstyling portfolio approved
+
All relevant educator approvals completed
+
IncluHub Admin approval completed
```

---

### Stage 4: Brand / Creative Project

**Purpose:** Team works on a real or simulated creative project with external members.

```text
Admin assigns external member
↓
Team sees project details
↓
External member sees assigned team
↓
Team completes project
↓
Educator reviews project completion
↓
Admin reviews project completion
↓
Stage 5 unlocks
```

| Role           | Approval |
| -------------- | -------- |
| IncluHub Admin | Yes      |
| Educator       | Yes      |

---

### Stage 5: Ecosystem / Application Unlock

**Purpose:** Final opportunity/application section unlocks after all required stages are completed.

```text
Stage 4 completed
↓
Educator approval completed
↓
Admin approval completed
↓
Stage 5 unlocks
↓
Student/team can access final application/opportunity section
```

Important rule:

**Stage 5 unlock does not guarantee work, placement, income, internship, or brand opportunity. It only means the student/team is eligible to apply or be considered.**

---

## 9. Notification Flow

### Admin Broadcast Notification

```text
Admin creates notification
↓
Selects audience
↓
Notification appears in user bell
↓
User opens notification
↓
System marks it as read
```

### Audience Options

* All students
* All educators
* All external members
* Specific team
* Specific student
* Specific educator
* Specific external member

---

## 10. Approval Status Flow

Each approval has one of these statuses:

| Status             | Meaning                               |
| ------------------ | ------------------------------------- |
| pending            | Waiting for review                    |
| approved           | Approved by required person           |
| rejected           | Rejected with reason                  |
| revision_required  | Student/team must update and resubmit |

---

## 11. Error States

| Situation                                         | System Response                                                          |
| ------------------------------------------------- | ------------------------------------------------------------------------ |
| Student tries to access locked stage              | Show "This stage is locked until previous stage approval is completed."  |
| Educator tries to approve unrelated team          | Block access                                                             |
| Student submits incomplete portfolio              | Show required field error                                                |
| Only educator approves but admin has not approved | Keep stage locked                                                        |
| Only admin approves but educator has not approved | Keep stage locked                                                        |
| External member tries to view unrelated team      | Block access                                                             |
| User tries to login without account               | Show invalid login or contact admin message                              |

---

## 12. Final Phase 2 Output

The MVP user flow is now clear:

1. Admin creates accounts.
2. Admin creates teams.
3. Educators receive team assignment updates.
4. Students move through locked stages.
5. Stage 3 requires portfolio-wise educator + admin approval.
6. Stage 4 requires educator + admin approval.
7. Stage 5 unlocks only after required approvals.
8. External members only see assigned project/team details.
9. Notifications support communication across roles.
