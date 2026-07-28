-- =============================================================================
-- IncluHub Dashboard
-- Migration 023: Admin-only reviews, moodboards, educator comments,
--                personal shoot credits, and OTP studio check-in
--
-- Forward-only. Depends on migrations 001-022.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. Moodboard workflow
-- ---------------------------------------------------------------------------

ALTER TABLE public.portfolio_outputs
  ADD COLUMN IF NOT EXISTS moodboard_status text NOT NULL DEFAULT 'not_submitted';

ALTER TABLE public.portfolio_outputs
  DROP CONSTRAINT IF EXISTS portfolio_outputs_moodboard_status_check;

ALTER TABLE public.portfolio_outputs
  ADD CONSTRAINT portfolio_outputs_moodboard_status_check
  CHECK (moodboard_status IN (
    'not_submitted', 'pending_admin', 'revision_required', 'approved'
  ));

CREATE TABLE IF NOT EXISTS public.moodboard_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_output_id uuid NOT NULL
    REFERENCES public.portfolio_outputs(id) ON DELETE CASCADE,
  version_number integer NOT NULL CHECK (version_number > 0),
  title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 150),
  moodboard_url text NOT NULL,
  notes text,
  submitted_by_student_id uuid NOT NULL
    REFERENCES public.students(id) ON DELETE RESTRICT,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (portfolio_output_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_moodboard_submissions_portfolio
  ON public.moodboard_submissions (portfolio_output_id, version_number DESC);

CREATE TABLE IF NOT EXISTS public.moodboard_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  moodboard_submission_id uuid NOT NULL
    REFERENCES public.moodboard_submissions(id) ON DELETE CASCADE,
  reviewer_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  decision text NOT NULL CHECK (decision IN ('approved', 'revision_required')),
  comments text,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (moodboard_submission_id)
);

CREATE INDEX IF NOT EXISTS idx_moodboard_reviews_submission
  ON public.moodboard_reviews (moodboard_submission_id);

COMMENT ON TABLE public.moodboard_submissions IS
  'Versioned leader moodboards that must be approved by Admin before Stage 3 studio booking.';
COMMENT ON TABLE public.moodboard_reviews IS
  'Immutable Admin-only moodboard decisions.';

-- ---------------------------------------------------------------------------
-- 2. Educator monitoring comments (non-blocking, no approval authority)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.workflow_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  portfolio_output_id uuid REFERENCES public.portfolio_outputs(id) ON DELETE CASCADE,
  moodboard_submission_id uuid
    REFERENCES public.moodboard_submissions(id) ON DELETE CASCADE,
  portfolio_submission_id uuid
    REFERENCES public.portfolio_submissions(id) ON DELETE CASCADE,
  author_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    portfolio_output_id IS NOT NULL
    OR moodboard_submission_id IS NOT NULL
    OR portfolio_submission_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_workflow_comments_team_created
  ON public.workflow_comments (team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_comments_portfolio_created
  ON public.workflow_comments (portfolio_output_id, created_at DESC);

COMMENT ON TABLE public.workflow_comments IS
  'Read-only-to-students educator monitoring notes. Comments never change workflow state.';

-- ---------------------------------------------------------------------------
-- 3. Two post-Stage-5 personal shoot credits per student
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.personal_shoot_entitlements (
  student_id uuid PRIMARY KEY REFERENCES public.students(id) ON DELETE CASCADE,
  total_credits integer NOT NULL DEFAULT 2 CHECK (total_credits = 2),
  used_credits integer NOT NULL DEFAULT 0
    CHECK (used_credits BETWEEN 0 AND total_credits),
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  granted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.personal_studio_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE RESTRICT,
  occupancy_id uuid NOT NULL UNIQUE
    REFERENCES public.studio_slot_occupancy(id) ON DELETE RESTRICT,
  purpose text NOT NULL CHECK (char_length(btrim(purpose)) BETWEEN 3 AND 500),
  verification_status text NOT NULL DEFAULT 'online_confirmed'
    CHECK (verification_status IN ('online_confirmed', 'physically_verified', 'no_show')),
  physically_verified_at timestamptz,
  physically_verified_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  no_show_at timestamptz,
  no_show_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  no_show_remarks text,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  booked_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_personal_studio_bookings_student
  ON public.personal_studio_bookings (student_id, booked_at DESC);
CREATE INDEX IF NOT EXISTS idx_personal_studio_bookings_team
  ON public.personal_studio_bookings (team_id, booked_at DESC);

CREATE OR REPLACE FUNCTION public.grant_personal_shoot_credits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.ecosystem_access_status = 'granted'
     AND OLD.ecosystem_access_status IS DISTINCT FROM NEW.ecosystem_access_status THEN
    INSERT INTO public.personal_shoot_entitlements (
      student_id, total_credits, used_credits, unlocked_at,
      granted_by, updated_at
    )
    VALUES (
      NEW.id, 2, 0, coalesce(NEW.ecosystem_access_granted_at, now()),
      NEW.ecosystem_access_granted_by, now()
    )
    ON CONFLICT (student_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_grant_personal_shoot_credits ON public.students;
CREATE TRIGGER trg_grant_personal_shoot_credits
AFTER UPDATE OF ecosystem_access_status ON public.students
FOR EACH ROW EXECUTE FUNCTION public.grant_personal_shoot_credits();

INSERT INTO public.personal_shoot_entitlements (
  student_id, total_credits, used_credits, unlocked_at, granted_by, updated_at
)
SELECT
  s.id, 2, 0, coalesce(s.ecosystem_access_granted_at, now()),
  s.ecosystem_access_granted_by, now()
FROM public.students s
WHERE s.ecosystem_access_status = 'granted'
ON CONFLICT (student_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. Six-digit booking OTP challenges (replaces QR)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.studio_checkin_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_type text NOT NULL CHECK (booking_type IN ('portfolio', 'personal')),
  booking_id uuid NOT NULL,
  otp_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  failed_attempts integer NOT NULL DEFAULT 0 CHECK (failed_attempts BETWEEN 0 AND 5),
  used_at timestamptz,
  generated_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  used_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_studio_checkin_otps_booking
  ON public.studio_checkin_otps (booking_type, booking_id, created_at DESC);

COMMENT ON TABLE public.studio_checkin_otps IS
  'Hashed, one-time, five-minute studio attendance codes. Plain OTP values are never stored.';

-- ---------------------------------------------------------------------------
-- 5. Workflow normalization: portfolio submissions go directly to Admin
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.normalize_admin_only_portfolio_workflow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.workflow_status = 'pending_educator' THEN
    NEW.workflow_status := 'pending_admin';
    NEW.revision_return_to := NULL;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_normalize_admin_only_portfolio_workflow
  ON public.portfolio_outputs;
CREATE TRIGGER trg_normalize_admin_only_portfolio_workflow
BEFORE INSERT OR UPDATE OF workflow_status ON public.portfolio_outputs
FOR EACH ROW EXECUTE FUNCTION public.normalize_admin_only_portfolio_workflow();

UPDATE public.portfolio_outputs
SET workflow_status = 'pending_admin', revision_return_to = NULL
WHERE workflow_status = 'pending_educator';

-- Existing already-booked or submitted fixtures remain usable. All other
-- active/future portfolio outputs must submit and receive moodboard approval.
UPDATE public.portfolio_outputs po
SET moodboard_status = 'approved'
WHERE EXISTS (
  SELECT 1 FROM public.studio_bookings sb
  WHERE sb.portfolio_output_id = po.id
)
OR EXISTS (
  SELECT 1 FROM public.portfolio_submissions ps
  WHERE ps.portfolio_output_id = po.id
);

CREATE OR REPLACE FUNCTION public.enforce_approved_moodboard_before_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.portfolio_outputs po
    WHERE po.id = NEW.portfolio_output_id
      AND po.moodboard_status = 'approved'
  ) THEN
    RAISE EXCEPTION 'Admin must approve the moodboard before studio booking.';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_require_moodboard_before_booking
  ON public.studio_bookings;
CREATE TRIGGER trg_require_moodboard_before_booking
BEFORE INSERT ON public.studio_bookings
FOR EACH ROW EXECUTE FUNCTION public.enforce_approved_moodboard_before_booking();

-- ---------------------------------------------------------------------------
-- 6. Moodboard and comment RPCs
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.submit_moodboard(
  p_portfolio_output_id uuid,
  p_title text,
  p_moodboard_url text,
  p_notes text
)
RETURNS TABLE (
  moodboard_submission_id uuid,
  version_number integer,
  moodboard_status text,
  submitted_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_profile_id uuid := auth.uid();
  v_student_id uuid;
  v_portfolio record;
  v_title text := nullif(btrim(coalesce(p_title, '')), '');
  v_url text := nullif(btrim(coalesce(p_moodboard_url, '')), '');
  v_notes text := nullif(btrim(coalesce(p_notes, '')), '');
  v_version integer;
  v_submission_id uuid;
  v_now timestamptz := now();
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

  IF v_title IS NULL OR char_length(v_title) NOT BETWEEN 3 AND 150 THEN
    RAISE EXCEPTION 'Moodboard title must be between 3 and 150 characters.';
  END IF;
  IF v_url IS NULL OR v_url !~* '^https://drive\.google\.com/' THEN
    RAISE EXCEPTION 'Use a Google Drive link beginning with https://drive.google.com/.';
  END IF;
  IF v_notes IS NOT NULL AND char_length(v_notes) > 2000 THEN
    RAISE EXCEPTION 'Notes cannot exceed 2000 characters.';
  END IF;

  SELECT
    po.id, po.team_id, po.leader_student_id, po.workflow_status,
    po.moodboard_status
  INTO v_portfolio
  FROM public.portfolio_outputs po
  WHERE po.id = p_portfolio_output_id
  FOR UPDATE;

  IF NOT FOUND OR v_portfolio.workflow_status <> 'awaiting_booking' THEN
    RAISE EXCEPTION 'This moodboard is not open for submission.';
  END IF;
  IF v_portfolio.leader_student_id <> v_student_id THEN
    RAISE EXCEPTION 'Only the current portfolio leader can submit this moodboard.';
  END IF;
  IF v_portfolio.moodboard_status NOT IN ('not_submitted', 'revision_required') THEN
    RAISE EXCEPTION 'This moodboard is already awaiting review or approved.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.teams t
    WHERE t.id = v_portfolio.team_id
      AND t.status = 'active'
      AND t.current_stage_number = 3
  ) THEN
    RAISE EXCEPTION 'The team is not currently in Stage 3.';
  END IF;

  SELECT coalesce(max(ms.version_number), 0) + 1
  INTO v_version
  FROM public.moodboard_submissions ms
  WHERE ms.portfolio_output_id = p_portfolio_output_id;

  INSERT INTO public.moodboard_submissions (
    portfolio_output_id, version_number, title, moodboard_url, notes,
    submitted_by_student_id, created_by, created_at
  )
  VALUES (
    p_portfolio_output_id, v_version, v_title, v_url, v_notes,
    v_student_id, v_profile_id, v_now
  )
  RETURNING id INTO v_submission_id;

  UPDATE public.portfolio_outputs
  SET moodboard_status = 'pending_admin'
  WHERE id = p_portfolio_output_id;

  PERFORM public.enqueue_team_notification(
    v_portfolio.team_id,
    'moodboard_submitted',
    'Moodboard submitted',
    'A portfolio moodboard is ready for Admin review. Educators may monitor and comment.',
    '/admin/moodboards',
    'moodboard_submission',
    v_submission_id,
    'moodboard_submitted:' || v_submission_id::text,
    false, true, true
  );

  moodboard_submission_id := v_submission_id;
  version_number := v_version;
  moodboard_status := 'pending_admin';
  submitted_at := v_now;
  RETURN NEXT;
END;
$function$;

CREATE OR REPLACE FUNCTION public.review_moodboard_as_admin(
  p_moodboard_submission_id uuid,
  p_decision text,
  p_comments text
)
RETURNS TABLE (
  moodboard_submission_id uuid,
  portfolio_output_id uuid,
  decision text,
  moodboard_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_admin_id uuid := auth.uid();
  v_submission record;
  v_portfolio record;
  v_decision text := btrim(coalesce(p_decision, ''));
  v_comments text := nullif(btrim(coalesce(p_comments, '')), '');
  v_review_id uuid;
BEGIN
  IF v_admin_id IS NULL OR NOT public.is_admin() OR NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = v_admin_id AND p.role = 'admin' AND p.status = 'active'
  ) THEN
    RAISE EXCEPTION 'You do not have permission to perform this action.';
  END IF;
  IF v_decision NOT IN ('approved', 'revision_required') THEN
    RAISE EXCEPTION 'Select approve or request revision.';
  END IF;
  IF v_decision = 'revision_required' AND v_comments IS NULL THEN
    RAISE EXCEPTION 'Revision comments are required.';
  END IF;
  IF v_comments IS NOT NULL AND char_length(v_comments) > 2000 THEN
    RAISE EXCEPTION 'Comments cannot exceed 2000 characters.';
  END IF;

  SELECT ms.id, ms.portfolio_output_id, ms.version_number
  INTO v_submission
  FROM public.moodboard_submissions ms
  WHERE ms.id = p_moodboard_submission_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Moodboard submission was not found.';
  END IF;

  SELECT po.id, po.team_id, po.moodboard_status
  INTO v_portfolio
  FROM public.portfolio_outputs po
  WHERE po.id = v_submission.portfolio_output_id
  FOR UPDATE;

  IF v_portfolio.moodboard_status <> 'pending_admin' THEN
    RAISE EXCEPTION 'This moodboard is not awaiting Admin review.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.moodboard_submissions newer
    WHERE newer.portfolio_output_id = v_submission.portfolio_output_id
      AND newer.version_number > v_submission.version_number
  ) THEN
    RAISE EXCEPTION 'Only the latest moodboard submission can be reviewed.';
  END IF;

  INSERT INTO public.moodboard_reviews (
    moodboard_submission_id, reviewer_user_id, decision, comments,
    created_by, created_at
  )
  VALUES (
    v_submission.id, v_admin_id, v_decision,
    CASE WHEN v_decision = 'revision_required' THEN v_comments ELSE v_comments END,
    v_admin_id, now()
  )
  ON CONFLICT (moodboard_submission_id) DO NOTHING
  RETURNING id INTO v_review_id;

  IF v_review_id IS NULL THEN
    RAISE EXCEPTION 'This moodboard has already been reviewed.';
  END IF;

  UPDATE public.portfolio_outputs
  SET moodboard_status = v_decision
  WHERE id = v_submission.portfolio_output_id;

  PERFORM public.enqueue_team_notification(
    v_portfolio.team_id,
    CASE WHEN v_decision = 'approved'
      THEN 'moodboard_approved' ELSE 'moodboard_revision_required' END,
    CASE WHEN v_decision = 'approved'
      THEN 'Moodboard approved' ELSE 'Moodboard revision requested' END,
    CASE WHEN v_decision = 'approved'
      THEN 'Your moodboard has been approved. Studio booking is now available.'
      ELSE 'Admin requested changes to the moodboard. Review the comments and submit a new version.' END,
    '/student/portfolio',
    'moodboard_submission',
    v_submission.id,
    'moodboard_review:' || v_submission.id::text,
    true, true, true
  );

  moodboard_submission_id := v_submission.id;
  portfolio_output_id := v_submission.portfolio_output_id;
  decision := v_decision;
  moodboard_status := v_decision;
  RETURN NEXT;
END;
$function$;

CREATE OR REPLACE FUNCTION public.add_educator_workflow_comment(
  p_team_id uuid,
  p_portfolio_output_id uuid,
  p_moodboard_submission_id uuid,
  p_portfolio_submission_id uuid,
  p_body text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_author_id uuid := auth.uid();
  v_body text := nullif(btrim(coalesce(p_body, '')), '');
  v_comment_id uuid;
BEGIN
  IF v_author_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = v_author_id AND p.role = 'educator' AND p.status = 'active'
  ) OR NOT public.is_educator_assigned_to_team(p_team_id) THEN
    RAISE EXCEPTION 'You do not have permission to comment on this team.';
  END IF;
  IF v_body IS NULL OR char_length(v_body) > 2000 THEN
    RAISE EXCEPTION 'Comment must be between 1 and 2000 characters.';
  END IF;
  IF p_portfolio_output_id IS NULL
     AND p_moodboard_submission_id IS NULL
     AND p_portfolio_submission_id IS NULL THEN
    RAISE EXCEPTION 'Select a workflow item to comment on.';
  END IF;
  IF p_portfolio_output_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.portfolio_outputs po
    WHERE po.id = p_portfolio_output_id AND po.team_id = p_team_id
  ) THEN
    RAISE EXCEPTION 'The workflow item does not belong to this team.';
  END IF;
  IF p_moodboard_submission_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.moodboard_submissions ms
    JOIN public.portfolio_outputs po ON po.id = ms.portfolio_output_id
    WHERE ms.id = p_moodboard_submission_id
      AND po.team_id = p_team_id
      AND (
        p_portfolio_output_id IS NULL
        OR po.id = p_portfolio_output_id
      )
  ) THEN
    RAISE EXCEPTION 'The moodboard does not belong to this team portfolio.';
  END IF;
  IF p_portfolio_submission_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.portfolio_submissions ps
    JOIN public.portfolio_outputs po ON po.id = ps.portfolio_output_id
    WHERE ps.id = p_portfolio_submission_id
      AND po.team_id = p_team_id
      AND (
        p_portfolio_output_id IS NULL
        OR po.id = p_portfolio_output_id
      )
  ) THEN
    RAISE EXCEPTION 'The portfolio submission does not belong to this team portfolio.';
  END IF;

  INSERT INTO public.workflow_comments (
    team_id, portfolio_output_id, moodboard_submission_id,
    portfolio_submission_id, author_user_id, body
  )
  VALUES (
    p_team_id, p_portfolio_output_id, p_moodboard_submission_id,
    p_portfolio_submission_id, v_author_id, v_body
  )
  RETURNING id INTO v_comment_id;

  PERFORM public.enqueue_team_notification(
    p_team_id,
    'educator_comment_added',
    'Educator added a comment',
    v_body,
    '/student/portfolio',
    'workflow_comment',
    v_comment_id,
    'workflow_comment:' || v_comment_id::text,
    true, false, true
  );

  RETURN v_comment_id;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 7. Personal studio booking RPC
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.book_personal_studio_slot(
  p_booking_date date,
  p_slot_code text,
  p_purpose text
)
RETURNS TABLE (
  booking_id uuid,
  booking_date date,
  slot_code text,
  booked_at timestamptz,
  credits_remaining integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_profile_id uuid := auth.uid();
  v_student record;
  v_entitlement record;
  v_today date := (current_timestamp AT TIME ZONE 'Asia/Kolkata')::date;
  v_purpose text := nullif(btrim(coalesce(p_purpose, '')), '');
  v_occupancy_id uuid;
  v_booking_id uuid;
  v_now timestamptz := now();
BEGIN
  IF v_profile_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = v_profile_id AND p.role = 'student' AND p.status = 'active'
  ) THEN
    RAISE EXCEPTION 'You do not have permission to perform this action.';
  END IF;
  IF p_booking_date IS NULL OR p_booking_date < v_today
     OR p_booking_date > v_today + 14 THEN
    RAISE EXCEPTION 'Personal shoot bookings must be within the next 14 days.';
  END IF;
  IF p_slot_code NOT IN (
    'slot_06_09', 'slot_09_12', 'slot_12_15', 'slot_15_18', 'slot_18_21'
  ) THEN
    RAISE EXCEPTION 'Invalid studio slot.';
  END IF;
  IF v_purpose IS NULL OR char_length(v_purpose) NOT BETWEEN 3 AND 500 THEN
    RAISE EXCEPTION 'Shoot purpose must be between 3 and 500 characters.';
  END IF;

  SELECT s.id, s.current_team_id, s.ecosystem_access_status, s.status
  INTO v_student
  FROM public.students s
  WHERE s.user_id = v_profile_id
  FOR UPDATE;

  IF NOT FOUND OR v_student.status <> 'active'
     OR v_student.ecosystem_access_status <> 'granted'
     OR v_student.current_team_id IS NULL THEN
    RAISE EXCEPTION 'Personal shoots unlock after Admin grants Stage 5 ecosystem access.';
  END IF;

  SELECT pse.student_id, pse.total_credits, pse.used_credits
  INTO v_entitlement
  FROM public.personal_shoot_entitlements pse
  WHERE pse.student_id = v_student.id
  FOR UPDATE;

  IF NOT FOUND OR v_entitlement.used_credits >= v_entitlement.total_credits THEN
    RAISE EXCEPTION 'You have used both personal studio shoot credits.';
  END IF;

  BEGIN
    INSERT INTO public.studio_slot_occupancy (booking_date, slot_code)
    VALUES (p_booking_date, p_slot_code)
    RETURNING id INTO v_occupancy_id;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION
      'This studio slot was just booked. Please select another available slot.';
  END;

  INSERT INTO public.personal_studio_bookings (
    student_id, team_id, occupancy_id, purpose, created_by, booked_at
  )
  VALUES (
    v_student.id, v_student.current_team_id, v_occupancy_id,
    v_purpose, v_profile_id, v_now
  )
  RETURNING id INTO v_booking_id;

  UPDATE public.personal_shoot_entitlements
  SET used_credits = used_credits + 1, updated_at = v_now
  WHERE student_id = v_student.id;

  PERFORM public.enqueue_team_notification(
    v_student.current_team_id,
    'personal_studio_booked',
    'Personal studio shoot booked',
    'A student used one personal studio credit. Admin will generate the attendance OTP at the studio.',
    '/student/studio',
    'personal_studio_booking',
    v_booking_id,
    'personal_studio_booking:' || v_booking_id::text,
    false, true, true
  );

  booking_id := v_booking_id;
  booking_date := p_booking_date;
  slot_code := p_slot_code;
  booked_at := v_now;
  credits_remaining := v_entitlement.total_credits - v_entitlement.used_credits - 1;
  RETURN NEXT;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 8. Admin-generated OTP and student verification
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.generate_studio_checkin_otp(
  p_booking_type text,
  p_booking_id uuid
)
RETURNS TABLE (
  otp_code text,
  expires_at timestamptz
)
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
  v_bytes bytea;
  v_number bigint;
  v_code text;
  v_otp_id uuid := gen_random_uuid();
  v_expiry timestamptz := now() + interval '5 minutes';
BEGIN
  IF v_admin_id IS NULL OR NOT public.is_admin() OR NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = v_admin_id AND p.role = 'admin' AND p.status = 'active'
  ) THEN
    RAISE EXCEPTION 'You do not have permission to perform this action.';
  END IF;
  IF p_booking_type NOT IN ('portfolio', 'personal') THEN
    RAISE EXCEPTION 'Booking type is invalid.';
  END IF;

  IF p_booking_type = 'portfolio' THEN
    SELECT sb.id, sb.verification_status, sso.booking_date, sso.slot_code
    INTO v_booking
    FROM public.studio_bookings sb
    JOIN public.studio_slot_occupancy sso ON sso.id = sb.occupancy_id
    WHERE sb.id = p_booking_id
    FOR UPDATE OF sb;
  ELSE
    SELECT psb.id, psb.verification_status, sso.booking_date, sso.slot_code
    INTO v_booking
    FROM public.personal_studio_bookings psb
    JOIN public.studio_slot_occupancy sso ON sso.id = psb.occupancy_id
    WHERE psb.id = p_booking_id
    FOR UPDATE OF psb;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Studio booking was not found.';
  END IF;
  IF v_booking.verification_status <> 'online_confirmed' THEN
    RAISE EXCEPTION 'This booking is not awaiting studio check-in.';
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
    RAISE EXCEPTION
      'OTP is available from 30 minutes before the slot until the slot ends.';
  END IF;

  UPDATE public.studio_checkin_otps
  SET used_at = coalesce(used_at, now())
  WHERE booking_type = p_booking_type
    AND booking_id = p_booking_id
    AND used_at IS NULL;

  v_bytes := gen_random_bytes(4);
  v_number :=
    get_byte(v_bytes, 0)::bigint * 16777216
    + get_byte(v_bytes, 1)::bigint * 65536
    + get_byte(v_bytes, 2)::bigint * 256
    + get_byte(v_bytes, 3)::bigint;
  v_code := lpad((v_number % 1000000)::text, 6, '0');

  INSERT INTO public.studio_checkin_otps (
    id, booking_type, booking_id, otp_hash, expires_at,
    generated_by, created_at
  )
  VALUES (
    v_otp_id, p_booking_type, p_booking_id,
    encode(digest(v_code || v_otp_id::text, 'sha256'), 'hex'),
    v_expiry, v_admin_id, now()
  );

  otp_code := v_code;
  expires_at := v_expiry;
  RETURN NEXT;
END;
$function$;

CREATE OR REPLACE FUNCTION public.verify_studio_checkin_otp(
  p_booking_type text,
  p_booking_id uuid,
  p_otp_code text
)
RETURNS TABLE (
  verified boolean,
  message text,
  verified_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_profile_id uuid := auth.uid();
  v_student_id uuid;
  v_code text := btrim(coalesce(p_otp_code, ''));
  v_otp record;
  v_booking record;
  v_now timestamptz := now();
BEGIN
  IF v_profile_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = v_profile_id AND p.role = 'student' AND p.status = 'active'
  ) THEN
    RAISE EXCEPTION 'You do not have permission to perform this action.';
  END IF;
  IF p_booking_type NOT IN ('portfolio', 'personal')
     OR v_code !~ '^[0-9]{6}$' THEN
    verified := false;
    message := 'Enter the six-digit OTP generated by Admin.';
    verified_at := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  v_student_id := public.my_student_id();
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Your student profile could not be found.';
  END IF;

  SELECT sco.id, sco.otp_hash, sco.expires_at, sco.failed_attempts
  INTO v_otp
  FROM public.studio_checkin_otps sco
  WHERE sco.booking_type = p_booking_type
    AND sco.booking_id = p_booking_id
    AND sco.used_at IS NULL
  ORDER BY sco.created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND OR v_otp.expires_at < v_now OR v_otp.failed_attempts >= 5 THEN
    verified := false;
    message := 'This OTP is invalid, expired, or locked. Ask Admin to generate a new one.';
    verified_at := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  IF v_otp.otp_hash <> encode(
    digest(v_code || v_otp.id::text, 'sha256'), 'hex'
  ) THEN
    UPDATE public.studio_checkin_otps
    SET failed_attempts = least(failed_attempts + 1, 5)
    WHERE id = v_otp.id;
    verified := false;
    message := CASE WHEN v_otp.failed_attempts + 1 >= 5
      THEN 'Too many incorrect attempts. Ask Admin to generate a new OTP.'
      ELSE 'The OTP is incorrect. Check the code and try again.' END;
    verified_at := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  IF p_booking_type = 'portfolio' THEN
    SELECT sb.id, sb.portfolio_output_id, sb.leader_student_id,
           sb.verification_status
    INTO v_booking
    FROM public.studio_bookings sb
    WHERE sb.id = p_booking_id
    FOR UPDATE;

    IF NOT FOUND OR v_booking.leader_student_id <> v_student_id THEN
      RAISE EXCEPTION 'Only the booked portfolio leader can use this OTP.';
    END IF;
    IF v_booking.verification_status <> 'online_confirmed' THEN
      RAISE EXCEPTION 'This booking is not awaiting studio check-in.';
    END IF;

    UPDATE public.studio_bookings
    SET verification_status = 'physically_verified',
        physically_verified_at = v_now,
        physically_verified_by = v_profile_id
    WHERE id = p_booking_id;

    UPDATE public.portfolio_outputs
    SET workflow_status = 'awaiting_submission'
    WHERE id = v_booking.portfolio_output_id
      AND workflow_status = 'awaiting_studio_checkin';
  ELSE
    SELECT psb.id, psb.student_id, psb.verification_status
    INTO v_booking
    FROM public.personal_studio_bookings psb
    WHERE psb.id = p_booking_id
    FOR UPDATE;

    IF NOT FOUND OR v_booking.student_id <> v_student_id THEN
      RAISE EXCEPTION 'Only the student who booked this shoot can use this OTP.';
    END IF;
    IF v_booking.verification_status <> 'online_confirmed' THEN
      RAISE EXCEPTION 'This booking is not awaiting studio check-in.';
    END IF;

    UPDATE public.personal_studio_bookings
    SET verification_status = 'physically_verified',
        physically_verified_at = v_now,
        physically_verified_by = v_profile_id
    WHERE id = p_booking_id;
  END IF;

  UPDATE public.studio_checkin_otps
  SET used_at = v_now, used_by = v_profile_id
  WHERE id = v_otp.id;

  verified := true;
  message := CASE WHEN p_booking_type = 'portfolio'
    THEN 'Studio check-in complete. Portfolio submission is now open.'
    ELSE 'Studio check-in complete. Your personal shoot attendance is confirmed.' END;
  verified_at := v_now;
  RETURN NEXT;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 9. Admin-only portfolio decision
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.review_portfolio_admin_only(
  p_portfolio_output_id uuid,
  p_submission_id uuid,
  p_decision text,
  p_comments text
)
RETURNS TABLE (
  portfolio_output_id uuid,
  submission_id uuid,
  review_id uuid,
  decision text,
  workflow_status text,
  next_portfolio_output_id uuid,
  team_stage_number integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_admin_id uuid := auth.uid();
  v_now timestamptz := now();
  v_decision text := btrim(coalesce(p_decision, ''));
  v_comments text := nullif(btrim(coalesce(p_comments, '')), '');
  v_portfolio record;
  v_team record;
  v_submission record;
  v_review_id uuid;
  v_next record;
  v_stage3 record;
  v_stage4 record;
  v_next_id uuid;
  v_team_stage integer;
BEGIN
  IF v_admin_id IS NULL OR NOT public.is_admin() OR NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = v_admin_id AND p.role = 'admin' AND p.status = 'active'
  ) THEN
    RAISE EXCEPTION 'You do not have permission to perform this action.';
  END IF;
  IF v_decision NOT IN ('approved', 'revision_required') THEN
    RAISE EXCEPTION 'Select approve or request revision.';
  END IF;
  IF v_decision = 'revision_required' AND v_comments IS NULL THEN
    RAISE EXCEPTION 'Revision comments are required.';
  END IF;
  IF v_comments IS NOT NULL AND char_length(v_comments) > 2000 THEN
    RAISE EXCEPTION 'Comments cannot exceed 2000 characters.';
  END IF;

  SELECT po.id, po.team_id, po.sequence_order, po.workflow_status
  INTO v_portfolio
  FROM public.portfolio_outputs po
  WHERE po.id = p_portfolio_output_id
  FOR UPDATE;

  IF NOT FOUND OR v_portfolio.workflow_status <> 'pending_admin' THEN
    RAISE EXCEPTION 'This portfolio is not awaiting Admin review.';
  END IF;

  SELECT t.id, t.current_stage_number, t.status
  INTO v_team
  FROM public.teams t
  WHERE t.id = v_portfolio.team_id
  FOR UPDATE;

  IF NOT FOUND OR v_team.status <> 'active' OR v_team.current_stage_number <> 3 THEN
    RAISE EXCEPTION 'The team is not currently in Stage 3.';
  END IF;

  SELECT ps.id, ps.portfolio_output_id, ps.version_number
  INTO v_submission
  FROM public.portfolio_submissions ps
  WHERE ps.id = p_submission_id
  FOR UPDATE;

  IF NOT FOUND OR v_submission.portfolio_output_id <> p_portfolio_output_id THEN
    RAISE EXCEPTION 'This submission does not belong to the portfolio.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.portfolio_submissions newer
    WHERE newer.portfolio_output_id = p_portfolio_output_id
      AND newer.version_number > v_submission.version_number
  ) THEN
    RAISE EXCEPTION 'Only the latest portfolio submission can be reviewed.';
  END IF;

  INSERT INTO public.portfolio_reviews (
    portfolio_submission_id, reviewer_stage, reviewer_user_id,
    decision, comments, created_by, created_at
  )
  VALUES (
    p_submission_id, 'admin', v_admin_id,
    v_decision::portfolio_review_decision,
    CASE WHEN v_decision = 'revision_required' THEN v_comments ELSE v_comments END,
    v_admin_id, v_now
  )
  ON CONFLICT ON CONSTRAINT portfolio_reviews_submission_stage_key
  DO NOTHING
  RETURNING id INTO v_review_id;

  IF v_review_id IS NULL THEN
    RAISE EXCEPTION 'This portfolio submission has already been reviewed by Admin.';
  END IF;

  IF v_decision = 'revision_required' THEN
    UPDATE public.portfolio_outputs
    SET workflow_status = 'revision_required',
        revision_return_to = 'admin'
    WHERE id = p_portfolio_output_id;

    PERFORM public.enqueue_team_notification(
      v_portfolio.team_id,
      'portfolio_revision_required',
      'Portfolio revision requested',
      'Admin requested changes to the portfolio. Review the comments and submit a new version.',
      '/student/portfolio',
      'portfolio_submission',
      p_submission_id,
      'portfolio_admin_review:' || p_submission_id::text,
      true, true, true
    );

    portfolio_output_id := p_portfolio_output_id;
    submission_id := p_submission_id;
    review_id := v_review_id;
    decision := v_decision;
    workflow_status := 'revision_required';
    next_portfolio_output_id := NULL;
    team_stage_number := 3;
    RETURN NEXT;
    RETURN;
  END IF;

  UPDATE public.portfolio_outputs
  SET workflow_status = 'completed',
      revision_return_to = NULL,
      status = 'approved'
  WHERE id = p_portfolio_output_id;

  SELECT po.id, po.workflow_status
  INTO v_next
  FROM public.portfolio_outputs po
  WHERE po.team_id = v_portfolio.team_id
    AND po.sequence_order = v_portfolio.sequence_order + 1
  FOR UPDATE;

  IF FOUND THEN
    IF v_next.workflow_status <> 'locked' THEN
      RAISE EXCEPTION 'The next portfolio is not in the expected locked state.';
    END IF;
    UPDATE public.portfolio_outputs
    SET workflow_status = 'awaiting_booking',
        moodboard_status = 'not_submitted'
    WHERE id = v_next.id;
    v_next_id := v_next.id;
    v_team_stage := 3;
  ELSE
    IF EXISTS (
      SELECT 1 FROM public.portfolio_outputs po
      WHERE po.team_id = v_portfolio.team_id
        AND po.sequence_order BETWEEN 1 AND 3
        AND po.workflow_status <> 'completed'
    ) THEN
      RAISE EXCEPTION 'All three portfolios must be approved before Stage 4.';
    END IF;

    SELECT tsp.id, tsp.status
    INTO v_stage3
    FROM public.team_stage_progress tsp
    WHERE tsp.team_id = v_portfolio.team_id AND tsp.stage_number = 3
    FOR UPDATE;
    SELECT tsp.id, tsp.status
    INTO v_stage4
    FROM public.team_stage_progress tsp
    WHERE tsp.team_id = v_portfolio.team_id AND tsp.stage_number = 4
    FOR UPDATE;

    IF v_stage3.status <> 'in_progress' OR v_stage4.status <> 'locked' THEN
      RAISE EXCEPTION 'Stage progression could not be completed.';
    END IF;

    UPDATE public.team_stage_progress
    SET status = 'completed', completed_at = v_now,
        admin_approval_status = 'approved',
        admin_approved_by = v_admin_id, admin_approved_at = v_now
    WHERE id = v_stage3.id;
    UPDATE public.team_stage_progress
    SET status = 'in_progress', started_at = coalesce(started_at, v_now)
    WHERE id = v_stage4.id;
    UPDATE public.teams
    SET current_stage_number = 4, stage_status = 'in_progress'
    WHERE id = v_portfolio.team_id;
    UPDATE public.students s
    SET current_stage_number = 4
    FROM public.team_members tm
    WHERE tm.team_id = v_portfolio.team_id
      AND tm.student_id = s.id
      AND tm.member_status = 'active';

    v_next_id := NULL;
    v_team_stage := 4;
  END IF;

  PERFORM public.enqueue_team_notification(
    v_portfolio.team_id,
    'portfolio_approved',
    'Portfolio approved',
    CASE WHEN v_next_id IS NULL
      THEN 'Admin approved the final team portfolio. The team has moved to the Brand / Creative Project stage.'
      ELSE 'Admin approved this portfolio. The next portfolio leader can now submit a moodboard.' END,
    '/student/my-stage',
    'portfolio_submission',
    p_submission_id,
    'portfolio_admin_review:' || p_submission_id::text,
    true, true, true
  );

  portfolio_output_id := p_portfolio_output_id;
  submission_id := p_submission_id;
  review_id := v_review_id;
  decision := v_decision;
  workflow_status := 'completed';
  next_portfolio_output_id := v_next_id;
  team_stage_number := v_team_stage;
  RETURN NEXT;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_portfolio_under_admin_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_submission_id uuid;
BEGIN
  IF NEW.workflow_status = 'pending_admin'
     AND OLD.workflow_status IS DISTINCT FROM NEW.workflow_status THEN
    SELECT ps.id
    INTO v_submission_id
    FROM public.portfolio_submissions ps
    WHERE ps.portfolio_output_id = NEW.id
    ORDER BY ps.version_number DESC
    LIMIT 1;

    IF v_submission_id IS NOT NULL THEN
      PERFORM public.enqueue_team_notification(
        NEW.team_id,
        'portfolio_under_admin_review',
        'Moodboard and portfolio under review',
        'Your moodboard and portfolio are under review. Please wait for an update from the IncluHub Manager regarding selection for Brand or Ecosystem opportunities. You may be contacted by email or phone.',
        '/student/portfolio',
        'portfolio_submission',
        v_submission_id,
        'portfolio_under_review:' || v_submission_id::text,
        true, true, true
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_portfolio_under_admin_review
  ON public.portfolio_outputs;
CREATE TRIGGER trg_notify_portfolio_under_admin_review
AFTER UPDATE OF workflow_status ON public.portfolio_outputs
FOR EACH ROW EXECUTE FUNCTION public.notify_portfolio_under_admin_review();

-- ---------------------------------------------------------------------------
-- 10. RLS and grants
-- ---------------------------------------------------------------------------

ALTER TABLE public.moodboard_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moodboard_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_shoot_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_studio_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studio_checkin_otps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "moodboard_submissions_select_admin"
  ON public.moodboard_submissions FOR SELECT TO authenticated
  USING (public.is_admin());
CREATE POLICY "moodboard_submissions_select_student_team"
  ON public.moodboard_submissions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.portfolio_outputs po
    WHERE po.id = portfolio_output_id
      AND po.team_id = public.my_active_team_id()
  ));
CREATE POLICY "moodboard_submissions_select_educator_team"
  ON public.moodboard_submissions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.portfolio_outputs po
    WHERE po.id = portfolio_output_id
      AND public.is_educator_assigned_to_team(po.team_id)
  ));

CREATE POLICY "moodboard_reviews_select_admin"
  ON public.moodboard_reviews FOR SELECT TO authenticated
  USING (public.is_admin());
CREATE POLICY "moodboard_reviews_select_student_team"
  ON public.moodboard_reviews FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.moodboard_submissions ms
    JOIN public.portfolio_outputs po ON po.id = ms.portfolio_output_id
    WHERE ms.id = moodboard_submission_id
      AND po.team_id = public.my_active_team_id()
  ));
CREATE POLICY "moodboard_reviews_select_educator_team"
  ON public.moodboard_reviews FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.moodboard_submissions ms
    JOIN public.portfolio_outputs po ON po.id = ms.portfolio_output_id
    WHERE ms.id = moodboard_submission_id
      AND public.is_educator_assigned_to_team(po.team_id)
  ));

CREATE POLICY "workflow_comments_select_admin"
  ON public.workflow_comments FOR SELECT TO authenticated
  USING (public.is_admin());
CREATE POLICY "workflow_comments_select_student_team"
  ON public.workflow_comments FOR SELECT TO authenticated
  USING (team_id = public.my_active_team_id());
CREATE POLICY "workflow_comments_select_educator_team"
  ON public.workflow_comments FOR SELECT TO authenticated
  USING (public.is_educator_assigned_to_team(team_id));

CREATE POLICY "personal_entitlements_select_admin"
  ON public.personal_shoot_entitlements FOR SELECT TO authenticated
  USING (public.is_admin());
CREATE POLICY "personal_entitlements_select_self"
  ON public.personal_shoot_entitlements FOR SELECT TO authenticated
  USING (student_id = public.my_student_id());

CREATE POLICY "personal_bookings_select_admin"
  ON public.personal_studio_bookings FOR SELECT TO authenticated
  USING (public.is_admin());
CREATE POLICY "personal_bookings_select_self"
  ON public.personal_studio_bookings FOR SELECT TO authenticated
  USING (student_id = public.my_student_id());
CREATE POLICY "personal_bookings_select_educator_team"
  ON public.personal_studio_bookings FOR SELECT TO authenticated
  USING (public.is_educator_assigned_to_team(team_id));

REVOKE ALL ON TABLE public.moodboard_submissions FROM anon;
REVOKE ALL ON TABLE public.moodboard_reviews FROM anon;
REVOKE ALL ON TABLE public.workflow_comments FROM anon;
REVOKE ALL ON TABLE public.personal_shoot_entitlements FROM anon;
REVOKE ALL ON TABLE public.personal_studio_bookings FROM anon;
REVOKE ALL ON TABLE public.studio_checkin_otps FROM anon, authenticated;

GRANT SELECT ON TABLE public.moodboard_submissions TO authenticated;
GRANT SELECT ON TABLE public.moodboard_reviews TO authenticated;
GRANT SELECT ON TABLE public.workflow_comments TO authenticated;
GRANT SELECT ON TABLE public.personal_shoot_entitlements TO authenticated;
GRANT SELECT ON TABLE public.personal_studio_bookings TO authenticated;

REVOKE INSERT, UPDATE, DELETE ON TABLE public.moodboard_submissions FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.moodboard_reviews FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.workflow_comments FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.personal_shoot_entitlements FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.personal_studio_bookings FROM authenticated;

REVOKE ALL ON FUNCTION public.submit_moodboard(uuid, text, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_moodboard(uuid, text, text, text)
  TO authenticated;
REVOKE ALL ON FUNCTION public.review_moodboard_as_admin(uuid, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_moodboard_as_admin(uuid, text, text)
  TO authenticated;
REVOKE ALL ON FUNCTION public.add_educator_workflow_comment(
  uuid, uuid, uuid, uuid, text
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_educator_workflow_comment(
  uuid, uuid, uuid, uuid, text
) TO authenticated;
REVOKE ALL ON FUNCTION public.book_personal_studio_slot(date, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.book_personal_studio_slot(date, text, text)
  TO authenticated;
REVOKE ALL ON FUNCTION public.generate_studio_checkin_otp(text, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_studio_checkin_otp(text, uuid)
  TO authenticated;
REVOKE ALL ON FUNCTION public.verify_studio_checkin_otp(text, uuid, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verify_studio_checkin_otp(text, uuid, text)
  TO authenticated;
REVOKE ALL ON FUNCTION public.review_portfolio_admin_only(uuid, uuid, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_portfolio_admin_only(uuid, uuid, text, text)
  TO authenticated;

-- Educators retain read access and can comment, but can no longer mutate
-- portfolio decisions. QR functions remain in the schema only for migration
-- compatibility and are no longer executable by application roles.
REVOKE EXECUTE ON FUNCTION public.review_portfolio_as_educator(
  uuid, uuid, text, text
) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.create_studio_checkin_qr(uuid)
  FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.verify_studio_checkin(text)
  FROM authenticated;

COMMENT ON FUNCTION public.review_portfolio_admin_only(uuid, uuid, text, text) IS
  'Admin-only latest portfolio decision; educator approval is not a prerequisite.';
COMMENT ON FUNCTION public.generate_studio_checkin_otp(text, uuid) IS
  'Admin-only five-minute numeric OTP generation for a booked studio slot.';
COMMENT ON FUNCTION public.verify_studio_checkin_otp(text, uuid, text) IS
  'Student OTP verification with five-attempt limit; unlocks portfolio submission or confirms a personal shoot.';
