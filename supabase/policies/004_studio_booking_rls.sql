-- =============================================================================
-- IncluHub Education Management Dashboard
-- 004: Studio Booking RLS (Package B)
--
-- Depends on: supabase/migrations/008_studio_bookings.sql
-- Do not edit 002_rls_policies.sql or 003_stage_management_rls.sql in place.
-- =============================================================================

ALTER TABLE studio_slot_occupancy ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_bookings ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- studio_slot_occupancy — active admin/student/educator read only, no writes
-- external_member has no SELECT policy (no Package B access)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "studio_slot_occupancy_select_authenticated" ON studio_slot_occupancy;
DROP POLICY IF EXISTS "studio_slot_occupancy_select_active_internal_roles" ON studio_slot_occupancy;

CREATE POLICY "studio_slot_occupancy_select_active_internal_roles"
  ON studio_slot_occupancy FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE id = auth.uid()
        AND status = 'active'
        AND role IN ('admin', 'student', 'educator')
    )
  );

-- ---------------------------------------------------------------------------
-- studio_bookings — scoped read, no client writes
-- external_member has no SELECT policy (no Package B access)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "studio_bookings_select_admin" ON studio_bookings;
DROP POLICY IF EXISTS "studio_bookings_select_student_own_team" ON studio_bookings;
DROP POLICY IF EXISTS "studio_bookings_select_educator_assigned" ON studio_bookings;

CREATE POLICY "studio_bookings_select_admin"
  ON studio_bookings FOR SELECT
  TO authenticated
  USING (
    get_my_role() = 'admin'::user_role
    AND is_admin()
  );

CREATE POLICY "studio_bookings_select_student_own_team"
  ON studio_bookings FOR SELECT
  TO authenticated
  USING (
    get_my_role() = 'student'::user_role
    AND team_id = my_active_team_id()
  );

CREATE POLICY "studio_bookings_select_educator_assigned"
  ON studio_bookings FOR SELECT
  TO authenticated
  USING (
    get_my_role() = 'educator'::user_role
    AND is_educator_assigned_to_team(team_id)
  );
