-- =============================================================================
-- IncluHub Dashboard
-- Migration 024: service-role access for workflow operations and test tooling
--
-- The service role remains server-only. Authenticated browser roles continue
-- to use the RLS policies and limited grants defined in migration 023.
-- =============================================================================

GRANT ALL ON TABLE public.moodboard_submissions TO service_role;
GRANT ALL ON TABLE public.moodboard_reviews TO service_role;
GRANT ALL ON TABLE public.workflow_comments TO service_role;
GRANT ALL ON TABLE public.personal_shoot_entitlements TO service_role;
GRANT ALL ON TABLE public.personal_studio_bookings TO service_role;
GRANT ALL ON TABLE public.studio_checkin_otps TO service_role;

