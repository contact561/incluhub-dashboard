# ADR-002: Student Google authentication

## Status

Accepted (experiment) — overrides legacy “no Google in MVP” for this branch only

## Context

Students must onboard with automated identity and provide institute + category data. Admin/educator remain provisioned accounts.

## Decision

- Students: **Google OAuth** via Supabase Auth
- After first login: mandatory onboarding (`pending_onboarding` → `active`)
- Capture: institute, category, confirmed name, phone, terms
- Admin / Educator: **email/password**, Admin-created
- Role always from `profiles.role`; no role picker on login
- Route isolation enforced in proxy/middleware + layout + RLS

## Consequences

- Requires Google provider config on the experiment Supabase project
- Incomplete profiles cannot enter the program timeline
- Legacy admin-created student password flow is not the primary student path here
