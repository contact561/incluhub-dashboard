# IncluHub — Product Requirements Document (Skillset Experiment)

**Version:** 0.1 (Phase 0)  
**Branch:** `experiment/skillset-rebuild`  
**Status:** Draft for founder review before coding

---

## 1. Purpose

IncluHub is a post-academic program dashboard for fashion-industry students (makeup artists, hairstylists, photographers, and future categories). Admin runs the program; educators see only their institute’s students; students complete stage-based work including mood boards and studio booking.

This experiment rebuilds the product with:

- Google student authentication + institute onboarding
- Institute-scoped educators
- Extensible stage/session registry (insert future stages without rewriting dashboards)
- Real-time updates
- Studio online booking + physical OTP check-in

---

## 2. Users


| Role | Auth | Capabilities |
|------|------|--------------|
| Admin | Email/password (provisioned) | Institutes, educators, teams assign/deassign, stage ops, broadcasts, studio oversight, OTP display, rebook permits |
| Student | Google OAuth + onboarding | Own dashboard + team; stage modules; mood board; studio book/OTP; leader once / assistant twice |
| Educator | Email/password (provisioned) | Own institute students only; progress/notifications; mood board review participation |

**Hard rule:** Students cannot access educator or admin routes (server + RLS).

External members: **deferred**.

---

## 3. Categories

**Team of three (MVP):** makeup_artist, hairstylist, photographer.

**Fashion designer:** may onboard and appear on institute roster; **not** required in the 3-person studio team for build-now.

Institutes: scalable list (≈10 now, grows). Each student and educator belongs to one institute.

---

## 4. Build-now program flow

1. Student Google onboarding (institute + category + profile)
2. **Team building** — Admin assigns/deassigns teams of 3 (cross-institute OK)
3. **BMS / inauguration** — Admin marks session complete
4. **Mood board** — Student submits; institute educator + admin approval path; notifies educators
5. **Portfolio + studio** — After mood board approved: online slot booking → physical OTP → unlock submission path
6. Stage 4 / 5 — **out of scope** until later briefing

Studio rules:

- One booking by default
- Second booking only with Admin rebook permit
- Each student: leader once, assistant twice across the three portfolio turns

---

## 5. Non-functional requirements

| NFR | Requirement |
|-----|-------------|
| Extensibility | New stages/sessions insertable via registry between existing steps |
| Real-time | Dashboards update on stage/booking/notification events (Supabase Realtime) |
| Security | Role isolation; institute RLS for educators; OTP hashed server-side |
| Scale | Institute count not hard-capped in code |
| No payments / WhatsApp / AI / mobile app / public open signup without onboarding |

---

## 6. Out of scope (build-now)

- Stage 4 and Stage 5 product content
- QR check-in (replaced by OTP)
- Stripe, CRM, marketplace, advanced analytics
- SMS OTP delivery
- Auth.js rewrite (stay on Supabase Auth)

---

## 7. Success criteria (experiment)

- Phase 0 docs approved
- Happy path: Google student → team → BMS → mood board approve → studio book → OTP → educator of same institute saw updates; other institute educator did not
- Adding a stub mid-program stage definition appears on adaptive student/educator timelines without shell rewrite
