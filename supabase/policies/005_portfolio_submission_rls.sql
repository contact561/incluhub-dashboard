-- =============================================================================
-- IncluHub Education Management Dashboard
-- 005: Portfolio submission RLS (Package C)
--
-- Depends on: supabase/migrations/010_portfolio_submission.sql
-- Do not edit 002–004 policy files in place.
-- =============================================================================

ALTER TABLE portfolio_submissions ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- portfolio_submissions — scoped read only; no direct writes
-- All inserts happen exclusively through submit_portfolio (SECURITY DEFINER).
-- External members have no SELECT policy (no Package C access).
-- Every SELECT policy requires an active profile of the matching role.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "portfolio_submissions_select_admin" ON portfolio_submissions;
DROP POLICY IF EXISTS "portfolio_submissions_select_student_own_team" ON portfolio_submissions;
DROP POLICY IF EXISTS "portfolio_submissions_select_educator_assigned" ON portfolio_submissions;

CREATE POLICY "portfolio_submissions_select_admin"
  ON portfolio_submissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE id = auth.uid()
        AND status = 'active'
        AND role = 'admin'::user_role
    )
    AND is_admin()
  );

CREATE POLICY "portfolio_submissions_select_student_own_team"
  ON portfolio_submissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE id = auth.uid()
        AND status = 'active'
        AND role = 'student'::user_role
    )
    AND EXISTS (
      SELECT 1
      FROM portfolio_outputs po
      WHERE po.id = portfolio_submissions.portfolio_output_id
        AND po.team_id = my_active_team_id()
    )
  );

CREATE POLICY "portfolio_submissions_select_educator_assigned"
  ON portfolio_submissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE id = auth.uid()
        AND status = 'active'
        AND role = 'educator'::user_role
    )
    AND EXISTS (
      SELECT 1
      FROM portfolio_outputs po
      WHERE po.id = portfolio_submissions.portfolio_output_id
        AND is_educator_assigned_to_team(po.team_id)
    )
  );

-- No INSERT, UPDATE, or DELETE policies intentionally.
-- Mutations only via public.submit_portfolio.
