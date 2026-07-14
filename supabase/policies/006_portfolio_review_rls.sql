-- =============================================================================
-- IncluHub Education Management Dashboard
-- 006: Portfolio review RLS (Package D1)
--
-- Depends on: supabase/migrations/011_portfolio_review_workflow.sql
-- Do not edit 002–005 policy files in place.
-- =============================================================================

ALTER TABLE portfolio_reviews ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Ensure legacy portfolio_approvals has no Package D mutation path
-- (idempotent with migration 011 drops)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "portfolio_approvals_insert_educator_own" ON portfolio_approvals;
DROP POLICY IF EXISTS "portfolio_approvals_update_educator_own" ON portfolio_approvals;
DROP POLICY IF EXISTS "portfolio_approvals_write_admin" ON portfolio_approvals;

REVOKE INSERT, UPDATE, DELETE ON TABLE public.portfolio_approvals FROM authenticated;
REVOKE ALL ON TABLE public.portfolio_approvals FROM anon;
GRANT SELECT ON TABLE public.portfolio_approvals TO authenticated;

-- ---------------------------------------------------------------------------
-- portfolio_reviews — SELECT only; all writes via SECURITY DEFINER RPCs
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "portfolio_reviews_select_admin" ON portfolio_reviews;
DROP POLICY IF EXISTS "portfolio_reviews_select_student_own_team" ON portfolio_reviews;
DROP POLICY IF EXISTS "portfolio_reviews_select_matching_educator" ON portfolio_reviews;

CREATE POLICY "portfolio_reviews_select_admin"
  ON portfolio_reviews FOR SELECT
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

CREATE POLICY "portfolio_reviews_select_student_own_team"
  ON portfolio_reviews FOR SELECT
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
      FROM portfolio_submissions ps
      JOIN portfolio_outputs po ON po.id = ps.portfolio_output_id
      WHERE ps.id = portfolio_reviews.portfolio_submission_id
        AND po.team_id = my_active_team_id()
    )
  );

-- Matching educator only: mapped to the portfolio leader (not any team educator).
CREATE POLICY "portfolio_reviews_select_matching_educator"
  ON portfolio_reviews FOR SELECT
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
      FROM portfolio_submissions ps
      WHERE ps.id = portfolio_reviews.portfolio_submission_id
        AND is_matching_portfolio_leader_educator(ps.portfolio_output_id)
    )
  );

-- No INSERT, UPDATE, or DELETE policies.
-- Mutations only via review_portfolio_as_educator / review_portfolio_as_admin.

REVOKE ALL ON TABLE public.portfolio_reviews FROM anon;
GRANT SELECT ON TABLE public.portfolio_reviews TO authenticated;
