-- =============================================================================
-- IncluHub Education Management Dashboard
-- Migration 008: Studio bookings (Package B)
--
-- - studio_slot_occupancy (privacy-safe availability + Realtime)
-- - studio_bookings (immutable private booking records)
-- - get_studio_slot_availability RPC
-- - book_studio_slot RPC
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. studio_slot_occupancy
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS studio_slot_occupancy (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_date date        NOT NULL,
  slot_code    text        NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT studio_slot_occupancy_slot_code_check
    CHECK (slot_code IN (
      'slot_06_09',
      'slot_09_12',
      'slot_12_15',
      'slot_15_18',
      'slot_18_21'
    )),
  CONSTRAINT studio_slot_occupancy_booking_date_slot_code_key
    UNIQUE (booking_date, slot_code)
);

COMMENT ON TABLE studio_slot_occupancy IS
  'Privacy-safe studio slot occupancy for availability and Realtime. No team or student data.';

CREATE INDEX IF NOT EXISTS idx_studio_slot_occupancy_booking_date
  ON studio_slot_occupancy (booking_date);

-- ---------------------------------------------------------------------------
-- 2. studio_bookings
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS studio_bookings (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_output_id uuid        NOT NULL UNIQUE
    REFERENCES portfolio_outputs(id) ON DELETE RESTRICT,
  team_id             uuid        NOT NULL
    REFERENCES teams(id) ON DELETE RESTRICT,
  leader_student_id   uuid        NOT NULL
    REFERENCES students(id) ON DELETE RESTRICT,
  occupancy_id        uuid        NOT NULL UNIQUE
    REFERENCES studio_slot_occupancy(id) ON DELETE RESTRICT,
  created_by          uuid        NOT NULL
    REFERENCES profiles(id) ON DELETE RESTRICT,
  booked_at           timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE studio_bookings IS
  'Immutable studio booking records. Mutations only via book_studio_slot RPC.';

CREATE INDEX IF NOT EXISTS idx_studio_bookings_team_id
  ON studio_bookings (team_id);

CREATE INDEX IF NOT EXISTS idx_studio_bookings_leader_student_id
  ON studio_bookings (leader_student_id);

CREATE INDEX IF NOT EXISTS idx_studio_bookings_portfolio_output_id
  ON studio_bookings (portfolio_output_id);

CREATE INDEX IF NOT EXISTS idx_studio_bookings_occupancy_id
  ON studio_bookings (occupancy_id);

CREATE INDEX IF NOT EXISTS idx_studio_bookings_booked_at
  ON studio_bookings (booked_at);

-- ---------------------------------------------------------------------------
-- 3. Grants — authenticated SELECT only; explicit anon revocation
-- ---------------------------------------------------------------------------

GRANT SELECT ON TABLE studio_slot_occupancy TO postgres, service_role, authenticated;
GRANT SELECT ON TABLE studio_bookings TO postgres, service_role, authenticated;

REVOKE ALL ON TABLE public.studio_slot_occupancy FROM anon;
REVOKE ALL ON TABLE public.studio_bookings FROM anon;

GRANT ALL PRIVILEGES ON TABLE studio_slot_occupancy TO postgres, service_role;
GRANT ALL PRIVILEGES ON TABLE studio_bookings TO postgres, service_role;

-- ---------------------------------------------------------------------------
-- 4. get_studio_slot_availability
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_studio_slot_availability(
  p_booking_date date
)
RETURNS TABLE (
  slot_code text,
  available boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_slot text;
  v_slots text[] := ARRAY[
    'slot_06_09',
    'slot_09_12',
    'slot_12_15',
    'slot_15_18',
    'slot_18_21'
  ];
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'You do not have permission to perform this action.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
      AND status = 'active'
      AND role IN ('admin', 'student', 'educator')
  ) THEN
    RAISE EXCEPTION 'You do not have permission to perform this action.';
  END IF;

  IF p_booking_date IS NULL THEN
    RAISE EXCEPTION 'The selected date is in the past.';
  END IF;

  FOREACH v_slot IN ARRAY v_slots
  LOOP
    slot_code := v_slot;
    available := NOT EXISTS (
      SELECT 1
      FROM studio_slot_occupancy sso
      WHERE sso.booking_date = p_booking_date
        AND sso.slot_code = v_slot
    );
    RETURN NEXT;
  END LOOP;
END;
$function$;

COMMENT ON FUNCTION public.get_studio_slot_availability(date) IS
  'Returns five ordered slot availability rows for a date. No private booking data.';

REVOKE ALL ON FUNCTION public.get_studio_slot_availability(date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_studio_slot_availability(date) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_studio_slot_availability(date) TO authenticated;

-- ---------------------------------------------------------------------------
-- 5. book_studio_slot
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.book_studio_slot(
  p_portfolio_output_id uuid,
  p_booking_date date,
  p_slot_code text
)
RETURNS TABLE (
  booking_date date,
  slot_code text,
  booked_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_profile_id uuid;
  v_student_id uuid;
  v_today_ist date := (current_timestamp AT TIME ZONE 'Asia/Kolkata')::date;
  v_now timestamptz := now();
  v_portfolio record;
  v_team record;
  v_occupancy_id uuid;
  v_booking_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'You do not have permission to perform this action.';
  END IF;

  v_profile_id := auth.uid();

  IF NOT EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = v_profile_id
      AND status = 'active'
      AND role = 'student'
  ) THEN
    RAISE EXCEPTION 'You do not have permission to perform this action.';
  END IF;

  v_student_id := my_student_id();
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Your student profile could not be found.';
  END IF;

  IF p_booking_date IS NULL THEN
    RAISE EXCEPTION 'The selected date is in the past.';
  END IF;

  IF p_booking_date < v_today_ist THEN
    RAISE EXCEPTION 'The selected date is in the past.';
  END IF;

  IF p_slot_code IS NULL OR p_slot_code NOT IN (
    'slot_06_09',
    'slot_09_12',
    'slot_12_15',
    'slot_15_18',
    'slot_18_21'
  ) THEN
    RAISE EXCEPTION 'Invalid studio slot.';
  END IF;

  SELECT
    po.id,
    po.team_id,
    po.leader_student_id,
    po.workflow_status,
    po.sequence_order
  INTO v_portfolio
  FROM portfolio_outputs po
  WHERE po.id = p_portfolio_output_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This portfolio is not awaiting a studio booking.';
  END IF;

  IF v_portfolio.workflow_status = 'locked' THEN
    RAISE EXCEPTION 'This portfolio is locked.';
  END IF;

  IF v_portfolio.workflow_status <> 'awaiting_booking' THEN
    RAISE EXCEPTION 'This portfolio is not awaiting a studio booking.';
  END IF;

  IF v_portfolio.leader_student_id <> v_student_id THEN
    RAISE EXCEPTION 'You are not the current portfolio leader.';
  END IF;

  SELECT
    t.id,
    t.status,
    t.current_stage_number
  INTO v_team
  FROM teams t
  WHERE t.id = v_portfolio.team_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'You are not part of this team.';
  END IF;

  IF v_team.status <> 'active' THEN
    RAISE EXCEPTION 'You are not part of this team.';
  END IF;

  IF v_team.current_stage_number <> 3 THEN
    RAISE EXCEPTION 'The team is not currently in Stage 3.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM team_members tm
    WHERE tm.team_id = v_team.id
      AND tm.student_id = v_student_id
      AND tm.member_status = 'active'
  ) THEN
    RAISE EXCEPTION 'You are not part of this team.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM portfolio_outputs po
    WHERE po.team_id = v_team.id
      AND po.workflow_status NOT IN ('locked', 'completed')
      AND po.id <> p_portfolio_output_id
  ) THEN
    RAISE EXCEPTION 'This portfolio is not awaiting a studio booking.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM studio_bookings sb
    WHERE sb.portfolio_output_id = p_portfolio_output_id
  ) THEN
    RAISE EXCEPTION 'This portfolio already has a studio booking.';
  END IF;

  INSERT INTO public.studio_slot_occupancy (
    booking_date,
    slot_code
  )
  VALUES (
    p_booking_date,
    p_slot_code
  )
  ON CONFLICT (booking_date, slot_code) DO NOTHING
  RETURNING id INTO v_occupancy_id;

  IF v_occupancy_id IS NULL THEN
    RAISE EXCEPTION
      'This studio slot was just booked by another team. Please select another available slot.';
  END IF;

  INSERT INTO studio_bookings (
    portfolio_output_id,
    team_id,
    leader_student_id,
    occupancy_id,
    created_by,
    booked_at
  )
  VALUES (
    p_portfolio_output_id,
    v_team.id,
    v_student_id,
    v_occupancy_id,
    v_profile_id,
    v_now
  )
  RETURNING id INTO v_booking_id;

  UPDATE portfolio_outputs
  SET workflow_status = 'awaiting_submission'
  WHERE id = p_portfolio_output_id;

  booking_date := p_booking_date;
  slot_code := p_slot_code;
  booked_at := v_now;
  RETURN NEXT;
END;
$function$;

COMMENT ON FUNCTION public.book_studio_slot(uuid, date, text) IS
  'Atomically books a studio slot for the active portfolio leader. Student only. Immutable booking.';

REVOKE ALL ON FUNCTION public.book_studio_slot(uuid, date, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.book_studio_slot(uuid, date, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.book_studio_slot(uuid, date, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. Realtime publication (idempotent, safe when publication missing)
-- ---------------------------------------------------------------------------
-- If supabase_realtime does not exist in this environment, enable manually:
-- Supabase Dashboard → Database → Replication → add studio_slot_occupancy.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_publication
    WHERE pubname = 'supabase_realtime'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'studio_slot_occupancy'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.studio_slot_occupancy;
  END IF;
END $$;
