-- =============================================================================
-- IncluHub Education Management Dashboard
-- 003: Stage Management RLS (Package A)
--
-- Depends on: 006_stage_bms_foundation.sql
-- Do not edit 002_rls_policies.sql in place.
-- =============================================================================

-- Portfolio initialization and stage transitions are RPC-only.
-- Remove direct student writes on portfolio_outputs.

drop policy if exists "portfolio_outputs_insert_student_leader" on portfolio_outputs;
drop policy if exists "portfolio_outputs_update_student_pending" on portfolio_outputs;

-- Stage progress mutations remain admin-only via existing policies.
-- BMS completion uses complete_bms_session (security definer).
