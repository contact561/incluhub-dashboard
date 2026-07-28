# IncluHub Current User Flows

This document reflects the current MVP workflow. `docs/PROJECT_RULES.md` is the
authoritative product and security reference.

## Authentication

```text
Admin creates account
→ User signs in without selecting a role
→ Server reads the active profiles row
→ User is sent to the matching role portal
```

There is no public signup.

## Admin

Admin creates users, programs, teams, and stage records. Admin sees the
moodboard queue, portfolio queue, combined studio schedule, and notifications.
Admin is the only role that can:

- approve or request revision on moodboards;
- approve or request revision on portfolios;
- complete controlled stages;
- generate a studio attendance OTP;
- grant Stage 5 ecosystem access.

## Student

Students can see only their own permitted team and workflow data. During Stage
3, portfolio outputs are completed sequentially:

```text
Submit moodboard
→ Admin approves moodboard
→ assistants share availability
→ leader books studio
→ Admin generates real-time six-digit OTP at the slot
→ booked student enters OTP
→ leader uploads portfolio
→ Admin reviews
→ approve unlocks next portfolio / revision returns to same leader
```

After upload, the student is told that the moodboard and portfolio are under
review and to wait for the IncluHub Manager’s email or phone update about brand
or ecosystem selection.

## Educator

Educators see only assigned students and teams. They can view stage status,
moodboards, portfolio versions, and review history. They can add advisory
comments visible to students and Admin.

Educators cannot approve, reject, request revision, move a stage, create users,
assign members, generate OTPs, or send global notifications.

## External member

External members see only explicitly assigned project and team information.
They do not approve stages in the MVP.

## Stage sequence

| Stage | Name | Decision owner |
| --- | --- | --- |
| 0 | Onboarding | Admin |
| 1 | Team Assignment | Admin |
| 2 | BMS Session | Admin |
| 3 | Moodboards, studio shoots, portfolios | Admin |
| 4 | Brand / Creative Project | Admin |
| 5 | Ecosystem / Application Access | Admin |

## Nine-shoot allocation

One three-person team receives:

- three sequential Stage 3 team portfolio bookings; and
- two personal studio credits per student after Admin grants Stage 5 access.

That is `3 + (3 × 2) = 9` studio shoots for the team overall. Each personal
booking belongs to the student who owns the credit.

## OTP attendance

Admin can generate the OTP only from 30 minutes before a booked slot until that
slot ends. The code is valid for five minutes, is stored only as a hash, and
allows five failed attempts. A successful portfolio OTP unlocks upload; a
successful personal-shoot OTP confirms that student’s attendance.

## Notifications

The MVP uses in-app notifications for workflow updates. Email and phone in the
under-review message describe the Manager’s later human follow-up; this does
not add automated email, phone, or WhatsApp functionality.
