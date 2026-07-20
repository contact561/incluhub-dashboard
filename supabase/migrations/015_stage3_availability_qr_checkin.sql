-- =============================================================================
-- IncluHub Education Management Dashboard
-- Migration 015: assistant availability + online/physical studio verification
--
-- Depends on 014. Forward-only; do not edit 008 or 009 in place.
-- =============================================================================

CREATE TABLE public.studio_availability_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_output_id uuid NOT NULL
    REFERENCES public.portfolio_outputs(id) ON DELETE CASCADE,
  assistant_student_id uuid NOT NULL
    REFERENCES public.students(id) ON DELETE CASCADE,
  booking_date date NOT NULL,
  slot_code text NOT NULL CHECK (slot_code IN (
    'slot_06_09', 'slot_09_12', 'slot_12_15', 'slot_15_18', 'slot_18_21'
  )),
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (portfolio_output_id, assistant_student_id, booking_date, slot_code)
);

CREATE INDEX idx_studio_availability_portfolio
  ON public.studio_availability_responses (portfolio_output_id, booking_date, slot_code);

CREATE TRIGGER trg_studio_availability_updated_at
  BEFORE UPDATE ON public.studio_availability_responses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.studio_bookings
  ADD COLUMN verification_status text,
  ADD COLUMN online_confirmed_at timestamptz,
  ADD COLUMN physically_verified_at timestamptz,
  ADD COLUMN physically_verified_by uuid
    REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN no_show_at timestamptz,
  ADD COLUMN no_show_by uuid
    REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN no_show_remarks text;

UPDATE public.studio_bookings
SET verification_status = 'physically_verified',
    online_confirmed_at = coalesce(online_confirmed_at, booked_at),
    physically_verified_at = coalesce(physically_verified_at, booked_at)
WHERE verification_status IS NULL;

ALTER TABLE public.studio_bookings
  ALTER COLUMN verification_status SET DEFAULT 'online_confirmed',
  ALTER COLUMN verification_status SET NOT NULL,
  ALTER COLUMN online_confirmed_at SET DEFAULT now(),
  ALTER COLUMN online_confirmed_at SET NOT NULL,
  ADD CONSTRAINT studio_bookings_verification_status_check
    CHECK (verification_status IN ('online_confirmed', 'physically_verified', 'no_show')),
  ADD CONSTRAINT studio_bookings_no_show_remarks_length
    CHECK (no_show_remarks IS NULL OR char_length(no_show_remarks) <= 1000);

ALTER TABLE public.studio_bookings
  DROP CONSTRAINT IF EXISTS studio_bookings_portfolio_output_id_key;

CREATE UNIQUE INDEX idx_studio_bookings_one_active_per_portfolio
  ON public.studio_bookings (portfolio_output_id)
  WHERE verification_status IN ('online_confirmed', 'physically_verified');

CREATE INDEX idx_studio_bookings_verification
  ON public.studio_bookings (verification_status, booked_at DESC);

CREATE TABLE public.studio_checkin_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.studio_bookings(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  generated_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  generated_at timestamptz NOT NULL DEFAULT now(),
  used_at timestamptz,
  used_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_studio_checkin_booking
  ON public.studio_checkin_tokens (booking_id, expires_at DESC);

COMMENT ON TABLE public.studio_availability_responses IS
  'Non-reserving assistant availability recommendations for the active portfolio.';
COMMENT ON TABLE public.studio_checkin_tokens IS
  'Hashed, single-use, 60-second Admin QR tokens. Raw tokens are never stored.';

CREATE OR REPLACE FUNCTION public.save_studio_availability(
  p_portfolio_output_id uuid,
  p_slots jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_profile_id uuid := auth.uid();
  v_student_id uuid;
  v_today date := (current_timestamp AT TIME ZONE 'Asia/Kolkata')::date;
  v_portfolio record;
  v_item jsonb;
  v_booking_date date;
  v_slot_code text;
  v_inserted integer := 0;
  v_leader_user_id uuid;
BEGIN
  IF v_profile_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = v_profile_id AND p.role = 'student' AND p.status = 'active'
  ) THEN
    RAISE EXCEPTION 'You do not have permission to perform this action.';
  END IF;

  v_student_id := public.my_student_id();
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Your student profile could not be found.';
  END IF;

  IF p_slots IS NULL OR jsonb_typeof(p_slots) <> 'array'
     OR jsonb_array_length(p_slots) < 1
     OR jsonb_array_length(p_slots) > 20 THEN
    RAISE EXCEPTION 'Select between 1 and 20 available timings.';
  END IF;

  SELECT po.id, po.team_id, po.leader_student_id, po.workflow_status
  INTO v_portfolio
  FROM public.portfolio_outputs po
  WHERE po.id = p_portfolio_output_id
  FOR UPDATE;

  IF NOT FOUND OR v_portfolio.workflow_status <> 'awaiting_booking' THEN
    RAISE EXCEPTION 'Availability can only be updated before the studio is booked.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.portfolio_participants pp
    WHERE pp.portfolio_output_id = p_portfolio_output_id
      AND pp.student_id = v_student_id
      AND pp.participation_role = 'assistant'
  ) THEN
    RAISE EXCEPTION 'Only an assistant on this portfolio can update availability.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.teams t
    WHERE t.id = v_portfolio.team_id
      AND t.status = 'active'
      AND t.current_stage_number = 3
  ) THEN
    RAISE EXCEPTION 'The team is not currently in Stage 3.';
  END IF;

  DELETE FROM public.studio_availability_responses sar
  WHERE sar.portfolio_output_id = p_portfolio_output_id
    AND sar.assistant_student_id = v_student_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_slots)
  LOOP
    BEGIN
      v_booking_date := (v_item ->> 'booking_date')::date;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'One or more selected dates are invalid.';
    END;
    v_slot_code := v_item ->> 'slot_code';

    IF v_booking_date < v_today OR v_booking_date > v_today + 14 THEN
      RAISE EXCEPTION 'Availability must be within the next 14 days.';
    END IF;
    IF v_slot_code NOT IN (
      'slot_06_09', 'slot_09_12', 'slot_12_15', 'slot_15_18', 'slot_18_21'
    ) THEN
      RAISE EXCEPTION 'One or more selected studio slots are invalid.';
    END IF;

    INSERT INTO public.studio_availability_responses (
      portfolio_output_id, assistant_student_id, booking_date, slot_code, created_by
    ) VALUES (
      p_portfolio_output_id, v_student_id, v_booking_date, v_slot_code, v_profile_id
    ) ON CONFLICT DO NOTHING;
  END LOOP;

  SELECT count(*)::integer INTO v_inserted
  FROM public.studio_availability_responses sar
  WHERE sar.portfolio_output_id = p_portfolio_output_id
    AND sar.assistant_student_id = v_student_id;

  SELECT s.user_id INTO v_leader_user_id
  FROM public.students s WHERE s.id = v_portfolio.leader_student_id;

  PERFORM public.enqueue_user_notification(
    v_leader_user_id,
    'studio_availability_updated',
    'A teammate shared studio availability',
    'Review your assistants'' preferred timings before booking the studio.',
    '/student/portfolio',
    'portfolio_output',
    p_portfolio_output_id,
    'studio_availability:' || p_portfolio_output_id::text || ':' || v_student_id::text || ':' || floor(extract(epoch from now()) / 60)::text
  );

  RETURN v_inserted;
END;
$function$;

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

  SELECT po.id, po.team_id, po.leader_student_id, po.workflow_status
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

CREATE OR REPLACE FUNCTION public.create_studio_checkin_qr(p_booking_id uuid)
RETURNS TABLE (booking_id uuid, qr_token text, expires_at timestamptz)
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
  v_raw_token text;
  v_expiry timestamptz := now() + interval '60 seconds';
BEGIN
  IF v_admin_id IS NULL OR NOT public.is_admin() OR NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = v_admin_id AND p.role = 'admin' AND p.status = 'active'
  ) THEN RAISE EXCEPTION 'You do not have permission to perform this action.'; END IF;

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
    RAISE EXCEPTION 'Check-in QR is available from 30 minutes before the slot until the slot ends.';
  END IF;

  UPDATE public.studio_checkin_tokens
  SET used_at = coalesce(used_at, now())
  WHERE booking_id = p_booking_id AND used_at IS NULL;

  v_raw_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');

  INSERT INTO public.studio_checkin_tokens (
    booking_id, token_hash, expires_at, generated_by
  ) VALUES (
    p_booking_id, encode(digest(v_raw_token, 'sha256'), 'hex'), v_expiry, v_admin_id
  );

  booking_id := p_booking_id; qr_token := v_raw_token; expires_at := v_expiry;
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
  v_now timestamptz := now();
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

  SELECT sct.id, sct.booking_id, sct.expires_at, sct.used_at, sct.generated_by
  INTO v_token
  FROM public.studio_checkin_tokens sct
  WHERE sct.token_hash = encode(digest(p_qr_token, 'sha256'), 'hex')
  FOR UPDATE;
  IF NOT FOUND OR v_token.used_at IS NOT NULL OR v_token.expires_at < v_now THEN
    RAISE EXCEPTION 'This check-in QR is invalid or expired.';
  END IF;

  SELECT sb.id, sb.portfolio_output_id, sb.team_id, sb.leader_student_id,
         sb.verification_status
  INTO v_booking
  FROM public.studio_bookings sb
  WHERE sb.id = v_token.booking_id
  FOR UPDATE;
  IF NOT FOUND OR v_booking.verification_status <> 'online_confirmed' THEN
    RAISE EXCEPTION 'This booking is not awaiting physical check-in.';
  END IF;
  IF v_booking.leader_student_id <> v_student_id THEN
    RAISE EXCEPTION 'Only the current portfolio leader can use this check-in QR.';
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

  UPDATE public.studio_checkin_tokens
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
    'studio_checkin:' || v_booking.id::text,
    true, true, true
  );

  booking_id := v_booking.id;
  portfolio_output_id := v_booking.portfolio_output_id;
  verified_at := v_now;
  RETURN NEXT;
END;
$function$;

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
  UPDATE public.studio_checkin_tokens
  SET used_at = coalesce(used_at, now())
  WHERE booking_id = p_booking_id AND used_at IS NULL;
  UPDATE public.portfolio_outputs
  SET workflow_status = 'awaiting_booking'
  WHERE id = v_booking.portfolio_output_id
    AND workflow_status = 'awaiting_studio_checkin';

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

CREATE OR REPLACE FUNCTION public.notify_portfolio_availability_open()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_assistant record;
BEGIN
  IF NEW.workflow_status = 'awaiting_booking'
     AND (TG_OP = 'INSERT' OR OLD.workflow_status IS DISTINCT FROM NEW.workflow_status) THEN
    FOR v_assistant IN
      SELECT s.user_id, pp.student_id
      FROM public.portfolio_participants pp
      JOIN public.students s ON s.id = pp.student_id
      WHERE pp.portfolio_output_id = NEW.id
        AND pp.participation_role = 'assistant'
    LOOP
      PERFORM public.enqueue_user_notification(
        v_assistant.user_id,
        'studio_availability_requested',
        'Share your studio availability',
        'Select the studio timings that work for you so the portfolio leader can choose a suitable slot.',
        '/student/portfolio',
        'portfolio_output',
        NEW.id,
        'studio_availability_requested:' || NEW.id::text || ':' || v_assistant.student_id::text
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_portfolio_availability_open_insert ON public.portfolio_outputs;
DROP TRIGGER IF EXISTS trg_notify_portfolio_availability_open_update ON public.portfolio_outputs;
CREATE TRIGGER trg_notify_portfolio_availability_open_insert
  AFTER INSERT ON public.portfolio_outputs
  FOR EACH ROW EXECUTE FUNCTION public.notify_portfolio_availability_open();
CREATE TRIGGER trg_notify_portfolio_availability_open_update
  AFTER UPDATE OF workflow_status ON public.portfolio_outputs
  FOR EACH ROW EXECUTE FUNCTION public.notify_portfolio_availability_open();

GRANT SELECT ON public.studio_availability_responses TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.studio_availability_responses FROM authenticated;
REVOKE ALL ON public.studio_checkin_tokens FROM anon, authenticated;

REVOKE ALL ON FUNCTION public.save_studio_availability(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_studio_availability(uuid, jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.book_studio_slot(uuid, date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.book_studio_slot(uuid, date, text) TO authenticated;
REVOKE ALL ON FUNCTION public.create_studio_checkin_qr(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_studio_checkin_qr(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.verify_studio_checkin(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verify_studio_checkin(text) TO authenticated;
REVOKE ALL ON FUNCTION public.mark_studio_no_show(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_studio_no_show(uuid, text) TO authenticated;
REVOKE ALL ON FUNCTION public.notify_portfolio_availability_open()
  FROM PUBLIC, anon, authenticated;
