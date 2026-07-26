# ADR-003: Institute-scoped educators

## Status

Accepted

## Context

Educators must only see and be notified about students from their own institute, even when those students join cross-institute teams.

## Decision

- Every educator has required `institute_id`
- Every student has required `institute_id` (from Google onboarding)
- Educator SELECT policies: `student.institute_id = educator.institute_id`
- Dashboard default view: roster + category filters + activity for that institute
- Team membership does **not** expand educator visibility to teammates from other institutes
- Admin sees all institutes

## Consequences

- Cross-institute teams still work for students
- Educators get a clean institute lens (reduces “chaos”)
- Team-mapped educator specialty approval may still apply later for reviews, but **security boundary is institute**
