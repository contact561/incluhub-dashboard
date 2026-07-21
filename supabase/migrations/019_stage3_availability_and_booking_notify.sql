-- =============================================================================
-- IncluHub Education Management Dashboard
-- Migration 019: assistant availability gate + booking fan-out notifications
--
-- Depends on 018. Forward-only.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.notify_portfolio_availability_open()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_assistant record;
  v_leader_label text;
BEGIN
  IF NEW.workflow_status = 'awaiting_booking'
     AND (TG_OP = 'INSERT' OR OLD.workflow_status IS DISTINCT FROM NEW.workflow_status) THEN
    v_leader_label := CASE NEW.portfolio_type
      WHEN 'photographer' THEN 'Photography'
      WHEN 'makeup_artist' THEN 'Makeup'
      WHEN 'hairstylist' THEN 'Hairstyling'
      ELSE 'portfolio'
    END;
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
        'When can you support this shoot?',
        'Your teammate''s ' || v_leader_label ||
          ' session is ready to book. Share the dates and timings you are available to assist.',
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
  v_assistant_count integer;
  v_leader_label text;
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

  SELECT po.id, po.team_id, po.leader_student_id, po.workflow_status, po.portfolio_type
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

  SELECT count(DISTINCT sar.assistant_student_id)::integer INTO v_assistant_count
  FROM public.studio_availability_responses sar
  WHERE sar.portfolio_output_id = p_portfolio_output_id;

  IF v_assistant_count >= 2 THEN
    v_leader_label := CASE v_portfolio.portfolio_type
      WHEN 'photographer' THEN 'Photography'
      WHEN 'makeup_artist' THEN 'Makeup'
      WHEN 'hairstylist' THEN 'Hairstyling'
      ELSE 'portfolio'
    END;
    PERFORM public.enqueue_user_notification(
      v_leader_user_id,
      'studio_availability_complete',
      'Both teammates shared availability',
      'Both assistants are ready for your ' || v_leader_label ||
        ' session. You can now book a studio slot that works for the team.',
      '/student/portfolio',
      'portfolio_output',
      p_portfolio_output_id,
      'studio_availability_complete:' || p_portfolio_output_id::text
    );
  END IF;

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
  v_assistant_count integer;
  v_slot_label text;
  v_discipline text;
  v_recipient record;
  v_message text;
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

  -- Notify the other two active students on the team.
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

  -- Notify educators mapped to each active student on the team.
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

COMMENT ON FUNCTION public.save_studio_availability(uuid, jsonb) IS
  'Assistant availability responses; notifies leader when both assistants have responded.';
COMMENT ON FUNCTION public.book_studio_slot(uuid, date, text) IS
  'Requires both assistants'' availability; notifies other students and mapped educators.';
