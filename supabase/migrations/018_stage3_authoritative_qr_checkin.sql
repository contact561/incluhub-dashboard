-- =============================================================================
-- IncluHub Education Management Dashboard
-- Migration 018: authoritative Stage 3 QR check-in + submit hardening
--
-- Depends on 015. Forward-only.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.book_studio_slot(
  p_portfolio_output_id uuid,
  p_booking_date date,
  p_slot_code text
)
RETURNS TABLE (booking_date date, slot_code text, booked_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_profile_id uuid := auth.uid();
  v_student_id uuid;
  v_today date := (current_timestamp AT TIME ZONE 'Asia/Kolkata')::date;
  v_now timestamptz := now();
  v_portfolio record;
  v_team record;
  v_occupancy_id uuid;
  v_booking_id uuid;
BEGIN
  IF v_profile_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = v_profile_id AND p.status = 'active' AND p.role = 'student'
  ) THEN
    RAISE EXCEPTION 'You do not have permission to perform this action.';
  END IF;
  v_student_id := public.my_student_id();
  IF v_student_id IS NULL THEN RAISE EXCEPTION 'Your student profile could not be found.'; END IF;
  IF p_booking_date IS NULL OR p_booking_date < v_today THEN
    RAISE EXCEPTION 'The selected date is in the past.';
  END IF;
  IF p_slot_code IS NULL OR p_slot_code NOT IN (
    'slot_06_09', 'slot_09_12', 'slot_12_15', 'slot_15_18', 'slot_18_21'
  ) THEN RAISE EXCEPTION 'Invalid studio slot.'; END IF;

  SELECT po.id, po.team_id, po.leader_student_id, po.workflow_status, po.sequence_order
  INTO v_portfolio
  FROM public.portfolio_outputs po
  WHERE po.id = p_portfolio_output_id
  FOR UPDATE;

  IF NOT FOUND OR v_portfolio.workflow_status <> 'awaiting_booking' THEN
    RAISE EXCEPTION 'This portfolio is not awaiting a studio booking.';
  END IF;
  IF v_portfolio.leader_student_id <> v_student_id THEN
    RAISE EXCEPTION 'You are not the current portfolio leader.';
  END IF;

  SELECT t.id, t.status, t.current_stage_number INTO v_team
  FROM public.teams t WHERE t.id = v_portfolio.team_id FOR UPDATE;
  IF NOT FOUND OR v_team.status <> 'active' THEN
    RAISE EXCEPTION 'You are not part of this team.';
  END IF;
  IF v_team.current_stage_number <> 3 THEN
    RAISE EXCEPTION 'The team is not currently in Stage 3.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.team_id = v_team.id AND tm.student_id = v_student_id
      AND tm.member_status = 'active'
  ) THEN RAISE EXCEPTION 'You are not part of this team.'; END IF;

  -- Sequential guard: only one active (non-locked / non-completed) portfolio at a time.
  IF EXISTS (
    SELECT 1 FROM public.portfolio_outputs po
    WHERE po.team_id = v_team.id
      AND po.id <> p_portfolio_output_id
      AND po.workflow_status NOT IN ('locked', 'completed')
  ) THEN
    RAISE EXCEPTION 'Another portfolio on this team is still active. Complete it before booking.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.studio_bookings sb
    WHERE sb.portfolio_output_id = p_portfolio_output_id
      AND sb.verification_status IN ('online_confirmed', 'physically_verified')
  ) THEN RAISE EXCEPTION 'This portfolio already has a studio booking.'; END IF;

  INSERT INTO public.studio_slot_occupancy (booking_date, slot_code)
  VALUES (p_booking_date, p_slot_code)
  ON CONFLICT ON CONSTRAINT studio_slot_occupancy_booking_date_slot_code_key DO NOTHING
  RETURNING id INTO v_occupancy_id;
  IF v_occupancy_id IS NULL THEN
    RAISE EXCEPTION 'This studio slot was just booked by another team. Please select another available slot.';
  END IF;

  INSERT INTO public.studio_bookings (
    portfolio_output_id, team_id, leader_student_id, occupancy_id,
    created_by, booked_at, verification_status, online_confirmed_at
  ) VALUES (
    p_portfolio_output_id, v_team.id, v_student_id, v_occupancy_id,
    v_profile_id, v_now, 'online_confirmed', v_now
  ) RETURNING id INTO v_booking_id;

  UPDATE public.portfolio_outputs
  SET workflow_status = 'awaiting_studio_checkin'
  WHERE id = p_portfolio_output_id;

  PERFORM public.enqueue_team_notification(
    v_team.id,
    'studio_booking_confirmed',
    'Studio booking confirmed',
    'The studio timing is confirmed. The portfolio leader must scan the Admin QR at the studio before submission opens.',
    '/student/portfolio',
    'studio_booking',
    v_booking_id,
    'studio_booking:' || v_booking_id::text,
    true, true, true
  );

  booking_date := p_booking_date; slot_code := p_slot_code; booked_at := v_now;
  RETURN NEXT;
END;
$function$;

CREATE OR REPLACE FUNCTION public.verify_studio_checkin(p_qr_token text)
RETURNS TABLE (booking_id uuid, portfolio_output_id uuid, verified_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_profile_id uuid := auth.uid();
  v_student_id uuid;
  v_token record;
  v_booking record;
  v_portfolio record;
  v_team record;
  v_now timestamptz := now();
  v_token_hash text;
BEGIN
  IF v_profile_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = v_profile_id AND p.role = 'student' AND p.status = 'active'
  ) THEN RAISE EXCEPTION 'You do not have permission to perform this action.'; END IF;
  IF p_qr_token IS NULL OR char_length(p_qr_token) < 32 THEN
    RAISE EXCEPTION 'This check-in QR is invalid or expired.';
  END IF;
  v_student_id := public.my_student_id();
  IF v_student_id IS NULL THEN RAISE EXCEPTION 'Your student profile could not be found.'; END IF;

  v_token_hash := encode(digest(p_qr_token, 'sha256'), 'hex');

  SELECT sct.id, sct.booking_id, sct.expires_at, sct.used_at, sct.generated_by
  INTO v_token
  FROM public.studio_checkin_tokens sct
  WHERE sct.token_hash = v_token_hash
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This check-in QR is invalid or expired.';
  END IF;

  SELECT sb.id, sb.portfolio_output_id, sb.team_id, sb.leader_student_id,
         sb.verification_status, sb.physically_verified_at
  INTO v_booking
  FROM public.studio_bookings sb
  WHERE sb.id = v_token.booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This booking is not awaiting physical check-in.';
  END IF;

  -- Idempotent: same leader, already verified, portfolio already awaiting submission.
  IF v_booking.verification_status = 'physically_verified'
     AND v_booking.leader_student_id = v_student_id THEN
    SELECT po.id, po.workflow_status, po.leader_student_id
    INTO v_portfolio
    FROM public.portfolio_outputs po
    WHERE po.id = v_booking.portfolio_output_id;
    IF FOUND
       AND v_portfolio.workflow_status = 'awaiting_submission'
       AND v_portfolio.leader_student_id = v_student_id THEN
      booking_id := v_booking.id;
      portfolio_output_id := v_booking.portfolio_output_id;
      verified_at := coalesce(v_booking.physically_verified_at, v_now);
      RETURN NEXT;
      RETURN;
    END IF;
  END IF;

  IF v_token.used_at IS NOT NULL OR v_token.expires_at < v_now THEN
    RAISE EXCEPTION 'This check-in QR is invalid or expired.';
  END IF;

  IF v_booking.verification_status <> 'online_confirmed' THEN
    RAISE EXCEPTION 'This booking is not awaiting physical check-in.';
  END IF;
  IF v_booking.leader_student_id <> v_student_id THEN
    RAISE EXCEPTION 'Only the current portfolio leader can use this check-in QR.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.team_id = v_booking.team_id
      AND tm.student_id = v_student_id
      AND tm.member_status = 'active'
  ) THEN
    RAISE EXCEPTION 'You are not part of this team.';
  END IF;

  SELECT t.id, t.status, t.current_stage_number
  INTO v_team
  FROM public.teams t
  WHERE t.id = v_booking.team_id
  FOR UPDATE;
  IF NOT FOUND OR v_team.status <> 'active' OR v_team.current_stage_number <> 3 THEN
    RAISE EXCEPTION 'The team is not currently in Stage 3.';
  END IF;

  SELECT po.id, po.team_id, po.leader_student_id, po.workflow_status
  INTO v_portfolio
  FROM public.portfolio_outputs po
  WHERE po.id = v_booking.portfolio_output_id
  FOR UPDATE;
  IF NOT FOUND OR v_portfolio.workflow_status <> 'awaiting_studio_checkin'
     OR v_portfolio.leader_student_id <> v_student_id THEN
    RAISE EXCEPTION 'This portfolio is not awaiting physical check-in.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.portfolio_outputs po
    WHERE po.team_id = v_booking.team_id
      AND po.id <> v_portfolio.id
      AND po.workflow_status NOT IN ('locked', 'completed')
  ) THEN
    RAISE EXCEPTION 'This portfolio is not the active Stage 3 sequence.';
  END IF;

  UPDATE public.studio_checkin_tokens
  SET used_at = v_now, used_by = v_profile_id WHERE id = v_token.id;
  UPDATE public.studio_bookings
  SET verification_status = 'physically_verified',
      physically_verified_at = v_now,
      physically_verified_by = v_profile_id
  WHERE id = v_booking.id;
  UPDATE public.portfolio_outputs
  SET workflow_status = 'awaiting_submission'
  WHERE id = v_portfolio.id;

  PERFORM public.enqueue_team_notification(
    v_booking.team_id,
    'studio_checkin_verified',
    'Studio check-in verified',
    'The portfolio leader checked in at the studio. Portfolio submission is now open for that leader only.',
    '/student/portfolio',
    'studio_booking',
    v_booking.id,
    'studio_checkin:' || v_booking.id::text,
    true, true, true
  );

  booking_id := v_booking.id;
  portfolio_output_id := v_booking.portfolio_output_id;
  verified_at := v_now;
  RETURN NEXT;
END;
$function$;

CREATE OR REPLACE FUNCTION public.submit_portfolio(
  p_portfolio_output_id uuid,
  p_title text,
  p_portfolio_url text,
  p_notes text
)
RETURNS TABLE (
  submission_id uuid,
  portfolio_output_id uuid,
  version_number integer,
  title text,
  portfolio_url text,
  notes text,
  submitted_at timestamptz,
  workflow_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_profile_id uuid;
  v_student_id uuid;
  v_now timestamptz := now();
  v_title text;
  v_url text;
  v_notes text;
  v_portfolio record;
  v_team record;
  v_submission_id uuid;
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

  v_title := nullif(btrim(coalesce(p_title, '')), '');
  v_url := nullif(btrim(coalesce(p_portfolio_url, '')), '');
  v_notes := nullif(btrim(coalesce(p_notes, '')), '');

  IF v_title IS NULL THEN
    RAISE EXCEPTION 'Portfolio title is required.';
  END IF;

  IF char_length(v_title) < 3 OR char_length(v_title) > 150 THEN
    RAISE EXCEPTION 'Portfolio title must be between 3 and 150 characters.';
  END IF;

  IF v_url IS NULL THEN
    RAISE EXCEPTION 'Enter a valid HTTP or HTTPS portfolio link.';
  END IF;

  IF v_url ~ '\s' THEN
    RAISE EXCEPTION 'Enter a valid HTTP or HTTPS portfolio link.';
  END IF;

  IF lower(v_url) ~ '^(javascript|data|file|vbscript):' THEN
    RAISE EXCEPTION 'Enter a valid HTTP or HTTPS portfolio link.';
  END IF;

  IF v_url !~* '^https?://[a-z0-9]([a-z0-9.-]*[a-z0-9])?(:[0-9]+)?(/.*)?$' THEN
    RAISE EXCEPTION 'Enter a valid HTTP or HTTPS portfolio link.';
  END IF;

  IF v_notes IS NOT NULL AND char_length(v_notes) > 2000 THEN
    RAISE EXCEPTION 'Notes cannot exceed 2000 characters.';
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
    RAISE EXCEPTION 'This portfolio is not awaiting submission.';
  END IF;

  IF v_portfolio.workflow_status = 'locked' THEN
    RAISE EXCEPTION 'This portfolio is locked.';
  END IF;

  IF v_portfolio.workflow_status = 'pending_educator'
     OR v_portfolio.workflow_status = 'pending_admin'
     OR v_portfolio.workflow_status = 'completed' THEN
    RAISE EXCEPTION 'This portfolio has already been submitted.';
  END IF;

  IF v_portfolio.workflow_status <> 'awaiting_submission' THEN
    RAISE EXCEPTION 'This portfolio is not awaiting submission.';
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
    RAISE EXCEPTION 'You do not have permission to perform this action.';
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
    RAISE EXCEPTION 'This portfolio is not awaiting submission.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM studio_bookings sb
    WHERE sb.portfolio_output_id = p_portfolio_output_id
      AND sb.verification_status = 'physically_verified'
  ) THEN
    RAISE EXCEPTION 'Physical studio check-in is required before submission.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM portfolio_submissions ps
    WHERE ps.portfolio_output_id = p_portfolio_output_id
      AND ps.version_number = 1
  ) THEN
    RAISE EXCEPTION 'This portfolio has already been submitted.';
  END IF;

  INSERT INTO public.portfolio_submissions (
    portfolio_output_id,
    version_number,
    title,
    portfolio_url,
    notes,
    submitted_by_student_id,
    created_by,
    created_at
  )
  VALUES (
    p_portfolio_output_id,
    1,
    v_title,
    v_url,
    v_notes,
    v_student_id,
    v_profile_id,
    v_now
  )
  ON CONFLICT ON CONSTRAINT
    portfolio_submissions_portfolio_output_id_version_number_key
  DO NOTHING
  RETURNING id INTO v_submission_id;

  IF v_submission_id IS NULL THEN
    RAISE EXCEPTION 'This portfolio has already been submitted.';
  END IF;

  UPDATE portfolio_outputs
  SET
    workflow_status = 'pending_educator',
    portfolio_title = v_title,
    portfolio_link = v_url,
    notes = v_notes,
    submitted_at = v_now
  WHERE id = p_portfolio_output_id;

  submission_id := v_submission_id;
  portfolio_output_id := p_portfolio_output_id;
  version_number := 1;
  title := v_title;
  portfolio_url := v_url;
  notes := v_notes;
  submitted_at := v_now;
  workflow_status := 'pending_educator';
  RETURN NEXT;
END;
$function$;

COMMENT ON FUNCTION public.book_studio_slot(uuid, date, text) IS
  'Leader-only Stage 3 booking; leaves submission locked until QR check-in.';
COMMENT ON FUNCTION public.verify_studio_checkin(text) IS
  'Authenticated leader scan is physical verification; idempotent for same leader.';
COMMENT ON FUNCTION public.submit_portfolio(uuid, text, text, text) IS
  'Requires physically verified studio booking before first submission.';
