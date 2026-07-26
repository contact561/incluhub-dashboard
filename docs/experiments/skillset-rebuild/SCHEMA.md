# Schema Map — Skillset Rebuild

Target model for the experiment DB (dedicated Supabase project). Not applied yet.

## Identity

| Table | Notes |
|-------|-------|
| `profiles` | `id`, `email`, `full_name`, `role`, `status` (`pending_onboarding` \| `active` \| …) |
| `institutes` | Scalable institute list |
| `students` | `user_id`, `institute_id` (required), `category`, onboarding fields |
| `educators` | `user_id`, `institute_id` (required), optional specialty category |
| Auth | Supabase Auth; Google provider for students |

### Enums (MVP)

`user_role`: admin | student | educator  

`student_category`: makeup_artist | hairstylist | photographer | fashion_designer  

Team membership constraint: only the first three categories allowed in a studio team.

## Program / teams

| Table | Notes |
|-------|-------|
| `programs` | Program/batch container |
| `teams` | Belongs to program |
| `team_members` | Exactly one active MUA, hair, photo when complete; assign/deassign audited |

## Stage engine

| Table | Notes |
|-------|-------|
| `stage_definitions` | `code`, `name`, `stage_type`, `sort_order`, `is_active`, `config` jsonb |
| `team_stage_progress` | FK to `stage_definitions`, status, timestamps |

### Seed `stage_type` values

`team_formation` | `attendance_session` | `submission` | `studio_booking` | `info_only`

### Seed definitions (sort_order)

1. team_building  
2. bms_inauguration  
3. mood_board  
4. portfolio_studio  

Future inserts change `sort_order`; do not hard-code UI to “only 1–4”.

## Mood board

| Table | Notes |
|-------|-------|
| `mood_board_submissions` | versioned submissions per student/team as decided in ADR-004 |
| `mood_board_reviews` | educator + admin decisions |

## Studio

| Table | Notes |
|-------|-------|
| `studio_slot_occupancy` | date + slot uniqueness |
| `studio_bookings` | leader, team, status, verification |
| `studio_otp_tokens` | hash only, short TTL, single use |
| `studio_rebook_permits` | admin grant for second booking |

## Notifications

| Table | Notes |
|-------|-------|
| `notifications` | title, message, audience, event_type |
| `notification_recipients` | per-user read state |

Realtime: subscribe to recipient rows / progress changes with RLS.

## RPCs (indicative)

- complete student onboarding  
- create/update balanced team assign/deassign  
- complete BMS  
- submit/review mood board  
- book studio / grant rebook / create OTP / verify OTP  
- send admin update  
