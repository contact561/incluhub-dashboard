-- =============================================================================
-- IncluHub Education Management Dashboard
-- Migration 021: Stage 3 QR prerequisites (015 backfill)
--
-- Safe to apply when 018–020 were applied without 015. Adds only the tables,
-- columns, and RPCs that 018/019 do not recreate:
--   - studio_availability_responses
--   - studio_checkin_tokens
--   - create_studio_checkin_qr
--   - mark_studio_no_show
--
-- Does NOT replace book_studio_slot, verify_studio_checkin, or
-- save_studio_availability (those stay at 018/019 versions).
--
-- Depends on 014 (notifications). Forward-only.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.studio_availability_responses (
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

CREATE INDEX IF NOT EXISTS idx_studio_availability_portfolio
  ON public.studio_availability_responses (portfolio_output_id, booking_date, slot_code);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_studio_availability_updated_at'
  ) THEN
    CREATE TRIGGER trg_studio_availability_updated_at
      BEFORE UPDATE ON public.studio_availability_responses
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END;
$$;

ALTER TABLE public.studio_bookings
  ADD COLUMN IF NOT EXISTS verification_status text,
  ADD COLUMN IF NOT EXISTS online_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS physically_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS physically_verified_by uuid
    REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS no_show_at timestamptz,
  ADD COLUMN IF NOT EXISTS no_show_by uuid
    REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS no_show_remarks text;

UPDATE public.studio_bookings
SET verification_status = 'physically_verified',
    online_confirmed_at = coalesce(online_confirmed_at, booked_at),
    physically_verified_at = coalesce(physically_verified_at, booked_at)
WHERE verification_status IS NULL;

ALTER TABLE public.studio_bookings
  ALTER COLUMN verification_status SET DEFAULT 'online_confirmed';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'studio_bookings'
      AND column_name = 'verification_status'
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE public.studio_bookings
      ALTER COLUMN verification_status SET NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'studio_bookings'
      AND column_name = 'online_confirmed_at'
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE public.studio_bookings
      ALTER COLUMN online_confirmed_at SET DEFAULT now(),
      ALTER COLUMN online_confirmed_at SET NOT NULL;
  END IF;
END;
$$;

ALTER TABLE public.studio_bookings
  DROP CONSTRAINT IF EXISTS studio_bookings_verification_status_check;

ALTER TABLE public.studio_bookings
  ADD CONSTRAINT studio_bookings_verification_status_check
  CHECK (verification_status IN ('online_confirmed', 'physically_verified', 'no_show'));

ALTER TABLE public.studio_bookings
  DROP CONSTRAINT IF EXISTS studio_bookings_no_show_remarks_length;

ALTER TABLE public.studio_bookings
  ADD CONSTRAINT studio_bookings_no_show_remarks_length
  CHECK (no_show_remarks IS NULL OR char_length(no_show_remarks) <= 1000);

ALTER TABLE public.studio_bookings
  DROP CONSTRAINT IF EXISTS studio_bookings_portfolio_output_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_studio_bookings_one_active_per_portfolio
  ON public.studio_bookings (portfolio_output_id)
  WHERE verification_status IN ('online_confirmed', 'physically_verified');

CREATE INDEX IF NOT EXISTS idx_studio_bookings_verification
  ON public.studio_bookings (verification_status, booked_at DESC);

CREATE TABLE IF NOT EXISTS public.studio_checkin_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.studio_bookings(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  generated_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  generated_at timestamptz NOT NULL DEFAULT now(),
  used_at timestamptz,
  used_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_studio_checkin_booking
  ON public.studio_checkin_tokens (booking_id, expires_at DESC);

COMMENT ON TABLE public.studio_availability_responses IS
  'Non-reserving assistant availability recommendations for the active portfolio.';
COMMENT ON TABLE public.studio_checkin_tokens IS
  'Hashed, single-use, 60-second Admin QR tokens. Raw tokens are never stored.';

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

GRANT SELECT ON public.studio_availability_responses TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.studio_availability_responses FROM authenticated;
REVOKE ALL ON public.studio_checkin_tokens FROM anon, authenticated;

REVOKE ALL ON FUNCTION public.create_studio_checkin_qr(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_studio_checkin_qr(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.mark_studio_no_show(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_studio_no_show(uuid, text) TO authenticated;

COMMENT ON FUNCTION public.create_studio_checkin_qr(uuid) IS
  'Admin-only short-lived booking QR for authenticated leader scan.';
COMMENT ON FUNCTION public.mark_studio_no_show(uuid, text) IS
  'Admin-only no-show path; returns portfolio to awaiting_booking for rebook.';
