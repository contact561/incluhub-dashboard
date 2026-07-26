-- =============================================================================
-- IncluHub Education Management Dashboard
-- Migration 025: Skillset rebuild foundations
--
-- - fashion_designer student category
-- - profiles.status pending_onboarding
-- - stage_definitions registry + seed
-- - complete_student_onboarding RPC (Google student path)
-- - educator institute roster helper view (RLS via function)
-- =============================================================================

-- Categories
ALTER TYPE public.student_category ADD VALUE IF NOT EXISTS 'fashion_designer';

-- Profile onboarding status
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_status_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_status_check
  CHECK (status IN ('active', 'inactive', 'suspended', 'pending_onboarding'));

-- Stage engine registry
CREATE TABLE IF NOT EXISTS public.stage_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  stage_type text NOT NULL
    CHECK (stage_type IN (
      'team_formation',
      'attendance_session',
      'submission',
      'studio_booking',
      'info_only'
    )),
  sort_order integer NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS stage_definitions_sort_order_key
  ON public.stage_definitions (sort_order);

COMMENT ON TABLE public.stage_definitions IS
  'Ordered program stage/session registry. Insert new rows to add mid-program steps.';

INSERT INTO public.stage_definitions (code, name, stage_type, sort_order, config)
VALUES
  ('team_building', 'Team building', 'team_formation', 10, '{}'::jsonb),
  ('bms_inauguration', 'BMS / Inauguration', 'attendance_session', 20, '{}'::jsonb),
  ('mood_board', 'Mood board', 'submission', 30, '{"requires_dual_approval": true}'::jsonb),
  ('portfolio_studio', 'Portfolio + studio', 'studio_booking', 40, '{"one_booking_default": true}'::jsonb)
ON CONFLICT (code) DO NOTHING;

ALTER TABLE public.stage_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS stage_definitions_select_authenticated ON public.stage_definitions;
CREATE POLICY stage_definitions_select_authenticated
  ON public.stage_definitions
  FOR SELECT
  TO authenticated
  USING (is_active = true OR public.is_admin());

GRANT SELECT ON public.stage_definitions TO authenticated;

-- Ensure Google/OAuth student can finish onboarding
CREATE OR REPLACE FUNCTION public.complete_student_onboarding(
  p_institute_id uuid,
  p_student_category text,
  p_full_name text,
  p_phone text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_category public.student_category;
  v_name text := nullif(btrim(coalesce(p_full_name, '')), '');
  v_phone text := nullif(btrim(coalesce(p_phone, '')), '');
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'You do not have permission to perform this action.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = v_uid
      AND p.role = 'student'
      AND p.status IN ('pending_onboarding', 'active')
  ) THEN
    RAISE EXCEPTION 'You do not have permission to perform this action.';
  END IF;

  IF p_institute_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.institutes i
    WHERE i.id = p_institute_id AND i.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Select a valid institute.';
  END IF;

  IF p_student_category IS NULL OR btrim(p_student_category) NOT IN (
    'makeup_artist', 'photographer', 'hairstylist', 'fashion_designer'
  ) THEN
    RAISE EXCEPTION 'Select a valid student category.';
  END IF;

  v_category := btrim(p_student_category)::public.student_category;

  IF v_name IS NULL OR char_length(v_name) < 2 THEN
    RAISE EXCEPTION 'Full name is required.';
  END IF;

  UPDATE public.profiles
  SET
    full_name = v_name,
    phone = coalesce(v_phone, phone),
    status = 'active',
    updated_at = now()
  WHERE id = v_uid;

  INSERT INTO public.students (
    user_id,
    institute_id,
    student_category,
    payment_status,
    status,
    current_stage_number,
    created_by
  ) VALUES (
    v_uid,
    p_institute_id,
    v_category,
    'pending',
    'active',
    0,
    v_uid
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    institute_id = EXCLUDED.institute_id,
    student_category = EXCLUDED.student_category,
    status = 'active',
    updated_at = now();

  RETURN true;
END;
$function$;

COMMENT ON FUNCTION public.complete_student_onboarding(uuid, text, text, text) IS
  'Google/OAuth student completes institute + category onboarding.';

REVOKE ALL ON FUNCTION public.complete_student_onboarding(uuid, text, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_student_onboarding(uuid, text, text, text)
  TO authenticated;

-- Institute roster for educators (same institute only)
CREATE OR REPLACE FUNCTION public.get_educator_institute_students()
RETURNS TABLE (
  student_id uuid,
  user_id uuid,
  full_name text,
  email text,
  student_category public.student_category,
  institute_id uuid,
  current_stage_number integer,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_institute_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'You do not have permission to perform this action.';
  END IF;

  IF public.is_admin() THEN
    RETURN QUERY
    SELECT
      s.id,
      s.user_id,
      p.full_name,
      p.email,
      s.student_category,
      s.institute_id,
      s.current_stage_number,
      s.status
    FROM public.students s
    JOIN public.profiles p ON p.id = s.user_id
    WHERE s.status = 'active' AND p.status = 'active'
    ORDER BY p.full_name;
    RETURN;
  END IF;

  SELECT e.institute_id INTO v_institute_id
  FROM public.educators e
  WHERE e.user_id = v_uid AND e.status = 'active';

  IF v_institute_id IS NULL THEN
    RAISE EXCEPTION 'You do not have permission to perform this action.';
  END IF;

  RETURN QUERY
  SELECT
    s.id,
    s.user_id,
    p.full_name,
    p.email,
    s.student_category,
    s.institute_id,
    s.current_stage_number,
    s.status
  FROM public.students s
  JOIN public.profiles p ON p.id = s.user_id
  WHERE s.institute_id = v_institute_id
    AND s.status = 'active'
    AND p.status = 'active'
  ORDER BY p.full_name;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_educator_institute_students() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_educator_institute_students() TO authenticated;
