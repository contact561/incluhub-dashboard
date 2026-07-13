-- =============================================================================
-- IncluHub Education Management Dashboard
-- Migration 009: Fix book_studio_slot ON CONFLICT ambiguity (Package B)
--
-- Resolves ERROR 42702: column reference "booking_date" is ambiguous when
-- RETURNS TABLE output columns share names with studio_slot_occupancy columns.
--
-- Depends on: supabase/migrations/008_studio_bookings.sql (already applied)
-- Do not edit 008 or policy 004 in place.
-- =============================================================================

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
  ON CONFLICT ON CONSTRAINT studio_slot_occupancy_booking_date_slot_code_key
  DO NOTHING
  RETURNING studio_slot_occupancy.id INTO v_occupancy_id;

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
