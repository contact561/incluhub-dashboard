-- =============================================================================
-- Migration 027: Studio OTP check-in + rebook permits
-- Additive. Keeps QR RPCs. Auto-grants permit on no-show so shared DB
-- master rebook-after-no-show still works without Admin UI.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.studio_rebook_permits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_output_id uuid NOT NULL REFERENCES public.portfolio_outputs(id) ON DELETE CASCADE,
  granted_by uuid NOT NULL REFERENCES public.profiles(id),
  granted_at timestamptz NOT NULL DEFAULT now(),
  reason text,
  consumed_at timestamptz,
  consumed_booking_id uuid REFERENCES public.studio_bookings(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS studio_rebook_permits_open_idx
  ON public.studio_rebook_permits (portfolio_output_id)
  WHERE consumed_at IS NULL;

CREATE TABLE IF NOT EXISTS public.studio_otp_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.studio_bookings(id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  generated_by uuid NOT NULL REFERENCES public.profiles(id),
  used_at timestamptz,
  used_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS studio_otp_tokens_booking_idx
  ON public.studio_otp_tokens (booking_id, expires_at DESC);

ALTER TABLE public.studio_rebook_permits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studio_otp_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.studio_rebook_permits FROM anon, authenticated;
REVOKE ALL ON public.studio_otp_tokens FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.grant_studio_rebook_permit(
  p_portfolio_output_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_admin_id uuid := auth.uid();
  v_permit_id uuid;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
BEGIN
  IF v_admin_id IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'You do not have permission to perform this action.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.portfolio_outputs WHERE id = p_portfolio_output_id) THEN
    RAISE EXCEPTION 'Portfolio was not found.';
  END IF;

  INSERT INTO public.studio_rebook_permits (portfolio_output_id, granted_by, reason)
  VALUES (p_portfolio_output_id, v_admin_id, v_reason)
  RETURNING id INTO v_permit_id;

  RETURN v_permit_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_studio_checkin_otp(p_booking_id uuid)
RETURNS TABLE (booking_id uuid, otp_code text, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_admin_id uuid := auth.uid();
  v_booking record;
  v_now_ist timestamp := current_timestamp AT TIME ZONE 'Asia/Kolkata';
  v_start timestamp;
  v_end timestamp;
  v_code text;
  v_expiry timestamptz := now() + interval '5 minutes';
BEGIN
  IF v_admin_id IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'You do not have permission to perform this action.';
  END IF;

  SELECT sb.id, sb.verification_status, sso.booking_date, sso.slot_code
  INTO v_booking
  FROM public.studio_bookings sb
  JOIN public.studio_slot_occupancy sso ON sso.id = sb.occupancy_id
  WHERE sb.id = p_booking_id
  FOR UPDATE OF sb;

  IF NOT FOUND THEN RAISE EXCEPTION 'Studio booking was not found.'; END IF;
  IF v_booking.verification_status <> 'online_confirmed' THEN
    RAISE EXCEPTION 'This booking is not awaiting physical check-in.';
  END IF;

  v_start := v_booking.booking_date::timestamp + CASE v_booking.slot_code
    WHEN 'slot_06_09' THEN time '06:00'
    WHEN 'slot_09_12' THEN time '09:00'
    WHEN 'slot_12_15' THEN time '12:00'
    WHEN 'slot_15_18' THEN time '15:00'
    ELSE time '18:00' END;
  v_end := v_booking.booking_date::timestamp + CASE v_booking.slot_code
    WHEN 'slot_06_09' THEN time '09:00'
    WHEN 'slot_09_12' THEN time '12:00'
    WHEN 'slot_12_15' THEN time '15:00'
    WHEN 'slot_15_18' THEN time '18:00'
    ELSE time '21:00' END;

  IF v_now_ist < v_start - interval '30 minutes' OR v_now_ist > v_end THEN
    RAISE EXCEPTION 'Check-in OTP is available from 30 minutes before the slot until the slot ends.';
  END IF;

  UPDATE public.studio_otp_tokens AS sot
  SET used_at = coalesce(sot.used_at, now())
  WHERE sot.booking_id = p_booking_id AND sot.used_at IS NULL;

  v_code := lpad((floor(random() * 1000000))::int::text, 6, '0');

  INSERT INTO public.studio_otp_tokens (booking_id, code_hash, expires_at, generated_by)
  VALUES (
    p_booking_id,
    encode(digest(v_code, 'sha256'), 'hex'),
    v_expiry,
    v_admin_id
  );

  booking_id := p_booking_id;
  otp_code := v_code;
  expires_at := v_expiry;
  RETURN NEXT;
END;
$function$;

CREATE OR REPLACE FUNCTION public.verify_studio_checkin_otp(p_otp_code text)
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
  v_now timestamptz := now();
  v_code text := nullif(btrim(coalesce(p_otp_code, '')), '');
BEGIN
  IF v_profile_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = v_profile_id AND p.role = 'student' AND p.status = 'active'
  ) THEN RAISE EXCEPTION 'You do not have permission to perform this action.'; END IF;

  IF v_code IS NULL OR char_length(v_code) <> 6 THEN
    RAISE EXCEPTION 'This check-in OTP is invalid or expired.';
  END IF;

  v_student_id := public.my_student_id();
  IF v_student_id IS NULL THEN RAISE EXCEPTION 'Your student profile could not be found.'; END IF;

  SELECT sot.id, sot.booking_id, sot.expires_at, sot.used_at, sot.generated_by
  INTO v_token
  FROM public.studio_otp_tokens sot
  WHERE sot.code_hash = encode(digest(v_code, 'sha256'), 'hex')
  ORDER BY sot.created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND OR v_token.used_at IS NOT NULL OR v_token.expires_at < v_now THEN
    RAISE EXCEPTION 'This check-in OTP is invalid or expired.';
  END IF;

  SELECT sb.id, sb.portfolio_output_id, sb.team_id, sb.leader_student_id, sb.verification_status
  INTO v_booking
  FROM public.studio_bookings sb
  WHERE sb.id = v_token.booking_id
  FOR UPDATE;

  IF NOT FOUND OR v_booking.verification_status <> 'online_confirmed' THEN
    RAISE EXCEPTION 'This booking is not awaiting physical check-in.';
  END IF;
  IF v_booking.leader_student_id <> v_student_id THEN
    RAISE EXCEPTION 'Only the current portfolio leader can use this check-in OTP.';
  END IF;

  SELECT po.id, po.leader_student_id, po.workflow_status
  INTO v_portfolio
  FROM public.portfolio_outputs po
  WHERE po.id = v_booking.portfolio_output_id
  FOR UPDATE;

  IF NOT FOUND OR v_portfolio.workflow_status <> 'awaiting_studio_checkin'
     OR v_portfolio.leader_student_id <> v_student_id THEN
    RAISE EXCEPTION 'This portfolio is not awaiting physical check-in.';
  END IF;

  UPDATE public.studio_otp_tokens
  SET used_at = v_now, used_by = v_profile_id WHERE id = v_token.id;
  UPDATE public.studio_bookings
  SET verification_status = 'physically_verified',
      physically_verified_at = v_now,
      physically_verified_by = v_token.generated_by
  WHERE id = v_booking.id;
  UPDATE public.portfolio_outputs
  SET workflow_status = 'awaiting_submission'
  WHERE id = v_portfolio.id;

  PERFORM public.enqueue_team_notification(
    v_booking.team_id,
    'studio_checkin_verified',
    'Studio check-in verified',
    'The portfolio leader checked in at the studio. Portfolio submission is now open.',
    '/student/portfolio',
    'studio_booking',
    v_booking.id,
    'studio_checkin_otp:' || v_booking.id::text,
    true, true, true
  );

  booking_id := v_booking.id;
  portfolio_output_id := v_booking.portfolio_output_id;
  verified_at := v_now;
  RETURN NEXT;
END;
$function$;

-- Patch mark_studio_no_show: auto-grant rebook permit (master-compatible rebook path)
CREATE OR REPLACE FUNCTION public.mark_studio_no_show(
  p_booking_id uuid,
  p_remarks text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_admin_id uuid := auth.uid();
  v_booking record;
  v_remarks text := nullif(btrim(coalesce(p_remarks, '')), '');
BEGIN
  IF v_admin_id IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'You do not have permission to perform this action.';
  END IF;
  IF v_remarks IS NULL OR char_length(v_remarks) > 1000 THEN
    RAISE EXCEPTION 'No-show remarks are required and must be under 1000 characters.';
  END IF;

  SELECT sb.id, sb.portfolio_output_id, sb.team_id, sb.verification_status
  INTO v_booking FROM public.studio_bookings sb
  WHERE sb.id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Studio booking was not found.'; END IF;
  IF v_booking.verification_status <> 'online_confirmed' THEN
    RAISE EXCEPTION 'Only a booking awaiting check-in can be marked as a no-show.';
  END IF;

  UPDATE public.studio_bookings
  SET verification_status = 'no_show', no_show_at = now(),
      no_show_by = v_admin_id, no_show_remarks = v_remarks
  WHERE id = p_booking_id;
  UPDATE public.studio_checkin_tokens AS sct
  SET used_at = coalesce(sct.used_at, now())
  WHERE sct.booking_id = p_booking_id AND sct.used_at IS NULL;
  UPDATE public.studio_otp_tokens AS sot
  SET used_at = coalesce(sot.used_at, now())
  WHERE sot.booking_id = p_booking_id AND sot.used_at IS NULL;
  UPDATE public.portfolio_outputs
  SET workflow_status = 'awaiting_booking'
  WHERE id = v_booking.portfolio_output_id
    AND workflow_status = 'awaiting_studio_checkin';

  INSERT INTO public.studio_rebook_permits (portfolio_output_id, granted_by, reason)
  VALUES (v_booking.portfolio_output_id, v_admin_id, 'Auto-granted after no-show');

  PERFORM public.enqueue_team_notification(
    v_booking.team_id,
    'studio_no_show',
    'Studio booking requires rebooking',
    'The previous studio booking was marked as a no-show. The portfolio leader can select a new slot.',
    '/student/portfolio',
    'studio_booking',
    p_booking_id,
    'studio_no_show:' || p_booking_id::text,
    true, true, true
  );
  RETURN true;
END;
$function$;

-- Patch book_studio_slot: consume rebook permit when any prior booking exists
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
  v_assistant_count integer;
  v_slot_label text;
  v_discipline text;
  v_recipient record;
  v_message text;
  v_permit_id uuid;
  v_had_prior boolean;
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

  SELECT po.id, po.team_id, po.leader_student_id, po.workflow_status,
         po.sequence_order, po.portfolio_type
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

  IF EXISTS (
    SELECT 1 FROM public.portfolio_outputs po
    WHERE po.team_id = v_team.id
      AND po.id <> p_portfolio_output_id
      AND po.workflow_status NOT IN ('locked', 'completed')
  ) THEN
    RAISE EXCEPTION 'Another portfolio on this team is still active. Complete it before booking.';
  END IF;

  SELECT count(DISTINCT sar.assistant_student_id)::integer INTO v_assistant_count
  FROM public.studio_availability_responses sar
  WHERE sar.portfolio_output_id = p_portfolio_output_id;
  IF coalesce(v_assistant_count, 0) < 2 THEN
    RAISE EXCEPTION 'Both assistants must share availability before you can book the studio.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.studio_bookings sb
    WHERE sb.portfolio_output_id = p_portfolio_output_id
      AND sb.verification_status IN ('online_confirmed', 'physically_verified')
  ) THEN RAISE EXCEPTION 'This portfolio already has a studio booking.'; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.studio_bookings sb
    WHERE sb.portfolio_output_id = p_portfolio_output_id
  ) INTO v_had_prior;

  IF v_had_prior THEN
    SELECT srp.id INTO v_permit_id
    FROM public.studio_rebook_permits srp
    WHERE srp.portfolio_output_id = p_portfolio_output_id
      AND srp.consumed_at IS NULL
    ORDER BY srp.granted_at DESC
    LIMIT 1
    FOR UPDATE;
    IF v_permit_id IS NULL THEN
      RAISE EXCEPTION 'Admin must grant a rebook permit before you can book again.';
    END IF;
  END IF;

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

  IF v_permit_id IS NOT NULL THEN
    UPDATE public.studio_rebook_permits
    SET consumed_at = v_now, consumed_booking_id = v_booking_id
    WHERE id = v_permit_id;
  END IF;

  UPDATE public.portfolio_outputs
  SET workflow_status = 'awaiting_studio_checkin'
  WHERE id = p_portfolio_output_id;

  v_slot_label := CASE p_slot_code
    WHEN 'slot_06_09' THEN '6:00–9:00'
    WHEN 'slot_09_12' THEN '9:00–12:00'
    WHEN 'slot_12_15' THEN '12:00–15:00'
    WHEN 'slot_15_18' THEN '15:00–18:00'
    ELSE '18:00–21:00'
  END;
  v_discipline := CASE v_portfolio.portfolio_type
    WHEN 'photographer' THEN 'Photography'
    WHEN 'makeup_artist' THEN 'Makeup'
    WHEN 'hairstylist' THEN 'Hairstyling'
    ELSE 'portfolio'
  END;
  v_message := 'The ' || v_discipline || ' leader booked the studio on '
    || to_char(p_booking_date, 'DD Mon YYYY') || ' (' || v_slot_label
    || ' IST). Open Portfolio for details.';

  FOR v_recipient IN
    SELECT s.user_id
    FROM public.team_members tm
    JOIN public.students s ON s.id = tm.student_id
    WHERE tm.team_id = v_team.id
      AND tm.member_status = 'active'
      AND tm.student_id <> v_student_id
      AND s.status = 'active'
  LOOP
    PERFORM public.enqueue_user_notification(
      v_recipient.user_id,
      'studio_booking_teammate',
      'Studio booking confirmed for your team',
      v_message,
      '/student/portfolio',
      'studio_booking',
      v_booking_id,
      'studio_booking_teammate:' || v_booking_id::text || ':' || v_recipient.user_id::text
    );
  END LOOP;

  FOR v_recipient IN
    SELECT DISTINCT e.user_id
    FROM public.team_educators te
    JOIN public.educators e ON e.id = te.educator_id
    WHERE te.team_id = v_team.id
      AND te.status = 'active'
      AND e.status = 'active'
  LOOP
    PERFORM public.enqueue_user_notification(
      v_recipient.user_id,
      'studio_booking_educator',
      'Assigned team booked a studio slot',
      v_message,
      '/educator/my-teams',
      'studio_booking',
      v_booking_id,
      'studio_booking_educator:' || v_booking_id::text || ':' || v_recipient.user_id::text
    );
  END LOOP;

  booking_date := p_booking_date; slot_code := p_slot_code; booked_at := v_now;
  RETURN NEXT;
END;
$function$;

REVOKE ALL ON FUNCTION public.grant_studio_rebook_permit(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grant_studio_rebook_permit(uuid, text) TO authenticated;
REVOKE ALL ON FUNCTION public.create_studio_checkin_otp(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_studio_checkin_otp(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.verify_studio_checkin_otp(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verify_studio_checkin_otp(text) TO authenticated;
REVOKE ALL ON FUNCTION public.mark_studio_no_show(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_studio_no_show(uuid, text) TO authenticated;
REVOKE ALL ON FUNCTION public.book_studio_slot(uuid, date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.book_studio_slot(uuid, date, text) TO authenticated;
