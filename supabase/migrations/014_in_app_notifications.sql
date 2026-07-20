-- =============================================================================
-- IncluHub Education Management Dashboard
-- Migration 014: role-scoped in-app workflow notifications
--
-- Forward-only migration. Do not edit migrations 001-013 in place.
-- =============================================================================

-- Added here so the enum value is committed before migration 015 uses it.
-- PostgreSQL does not permit a newly-added enum value to be used safely in the
-- same migration transaction that creates it.
ALTER TYPE public.portfolio_workflow_status
  ADD VALUE IF NOT EXISTS 'awaiting_studio_checkin' AFTER 'awaiting_booking';

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS event_type text NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS entity_type text,
  ADD COLUMN IF NOT EXISTS entity_id uuid,
  ADD COLUMN IF NOT EXISTS action_url text,
  ADD COLUMN IF NOT EXISTS dedupe_key text;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_event_type_length
    CHECK (char_length(event_type) BETWEEN 1 AND 80),
  ADD CONSTRAINT notifications_entity_type_length
    CHECK (entity_type IS NULL OR char_length(entity_type) <= 80),
  ADD CONSTRAINT notifications_action_url_safe
    CHECK (
      action_url IS NULL
      OR (
        action_url LIKE '/%'
        AND action_url NOT LIKE '//%'
        AND char_length(action_url) <= 500
      )
    ),
  ADD CONSTRAINT notifications_dedupe_key_length
    CHECK (dedupe_key IS NULL OR char_length(dedupe_key) <= 200);

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedupe_key
  ON public.notifications (dedupe_key)
  WHERE dedupe_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_event_created
  ON public.notifications (event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_recipients_unread
  ON public.notification_recipients (recipient_user_id, created_at DESC)
  WHERE read_status = false;

COMMENT ON COLUMN public.notifications.event_type IS
  'Stable workflow event identifier used by role inboxes.';
COMMENT ON COLUMN public.notifications.action_url IS
  'Internal application path only; external URLs are rejected.';
COMMENT ON COLUMN public.notifications.dedupe_key IS
  'Optional idempotency key for system-generated workflow events.';

-- System notification fan-out. This function is intentionally not executable
-- by API roles; secure workflow RPCs call it as their definer.
CREATE OR REPLACE FUNCTION public.enqueue_team_notification(
  p_team_id uuid,
  p_event_type text,
  p_title text,
  p_message text,
  p_action_url text,
  p_entity_type text,
  p_entity_id uuid,
  p_dedupe_key text,
  p_include_students boolean DEFAULT true,
  p_include_educators boolean DEFAULT true,
  p_include_admins boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_notification_id uuid;
  v_actor_id uuid := auth.uid();
  v_event_type text := nullif(btrim(coalesce(p_event_type, '')), '');
  v_title text := nullif(btrim(coalesce(p_title, '')), '');
  v_message text := nullif(btrim(coalesce(p_message, '')), '');
  v_action_url text := nullif(btrim(coalesce(p_action_url, '')), '');
  v_dedupe_key text := nullif(btrim(coalesce(p_dedupe_key, '')), '');
BEGIN
  IF p_team_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.teams t WHERE t.id = p_team_id
  ) THEN
    RAISE EXCEPTION 'Notification team was not found.';
  END IF;

  IF v_event_type IS NULL OR char_length(v_event_type) > 80
     OR v_title IS NULL OR char_length(v_title) > 200
     OR v_message IS NULL OR char_length(v_message) > 2000 THEN
    RAISE EXCEPTION 'Notification content is invalid.';
  END IF;

  IF v_action_url IS NOT NULL AND (
    v_action_url NOT LIKE '/%'
    OR v_action_url LIKE '//%'
    OR char_length(v_action_url) > 500
  ) THEN
    RAISE EXCEPTION 'Notification destination is invalid.';
  END IF;

  INSERT INTO public.notifications (
    title,
    message,
    audience_type,
    priority,
    created_by,
    event_type,
    entity_type,
    entity_id,
    action_url,
    dedupe_key
  )
  VALUES (
    v_title,
    v_message,
    'specific_team',
    'normal',
    v_actor_id,
    v_event_type,
    nullif(btrim(coalesce(p_entity_type, '')), ''),
    p_entity_id,
    v_action_url,
    v_dedupe_key
  )
  ON CONFLICT (dedupe_key) WHERE dedupe_key IS NOT NULL
  DO UPDATE SET dedupe_key = EXCLUDED.dedupe_key
  RETURNING id INTO v_notification_id;

  IF p_include_students THEN
    INSERT INTO public.notification_recipients (
      notification_id,
      recipient_user_id
    )
    SELECT DISTINCT v_notification_id, s.user_id
    FROM public.team_members tm
    JOIN public.students s ON s.id = tm.student_id
    JOIN public.profiles p ON p.id = s.user_id
    WHERE tm.team_id = p_team_id
      AND tm.member_status = 'active'
      AND s.status = 'active'
      AND p.status = 'active'
    ON CONFLICT (notification_id, recipient_user_id) DO NOTHING;
  END IF;

  IF p_include_educators THEN
    INSERT INTO public.notification_recipients (
      notification_id,
      recipient_user_id
    )
    SELECT DISTINCT v_notification_id, e.user_id
    FROM public.team_educators te
    JOIN public.educators e ON e.id = te.educator_id
    JOIN public.profiles p ON p.id = e.user_id
    WHERE te.team_id = p_team_id
      AND te.status = 'active'
      AND e.status = 'active'
      AND p.status = 'active'
    ON CONFLICT (notification_id, recipient_user_id) DO NOTHING;
  END IF;

  IF p_include_admins THEN
    INSERT INTO public.notification_recipients (
      notification_id,
      recipient_user_id
    )
    SELECT v_notification_id, p.id
    FROM public.profiles p
    WHERE p.role = 'admin'
      AND p.status = 'active'
    ON CONFLICT (notification_id, recipient_user_id) DO NOTHING;
  END IF;

  RETURN v_notification_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_profile_id uuid := auth.uid();
  v_updated integer;
BEGIN
  IF v_profile_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = v_profile_id
      AND p.status = 'active'
  ) THEN
    RAISE EXCEPTION 'You do not have permission to perform this action.';
  END IF;

  UPDATE public.notification_recipients nr
  SET read_status = true,
      read_at = coalesce(nr.read_at, now())
  WHERE nr.notification_id = p_notification_id
    AND nr.recipient_user_id = v_profile_id
    AND nr.read_status = false;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated = 0 AND NOT EXISTS (
    SELECT 1
    FROM public.notification_recipients nr
    WHERE nr.notification_id = p_notification_id
      AND nr.recipient_user_id = v_profile_id
  ) THEN
    RAISE EXCEPTION 'Notification was not found.';
  END IF;

  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.enqueue_user_notification(
  p_recipient_user_id uuid,
  p_event_type text,
  p_title text,
  p_message text,
  p_action_url text,
  p_entity_type text,
  p_entity_id uuid,
  p_dedupe_key text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_notification_id uuid;
BEGIN
  IF p_recipient_user_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = p_recipient_user_id
      AND p.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Notification recipient was not found.';
  END IF;

  IF nullif(btrim(coalesce(p_event_type, '')), '') IS NULL
     OR nullif(btrim(coalesce(p_title, '')), '') IS NULL
     OR nullif(btrim(coalesce(p_message, '')), '') IS NULL
     OR (p_action_url IS NOT NULL AND (
       p_action_url NOT LIKE '/%'
       OR p_action_url LIKE '//%'
       OR char_length(p_action_url) > 500
     )) THEN
    RAISE EXCEPTION 'Notification content is invalid.';
  END IF;

  INSERT INTO public.notifications (
    title, message, audience_type, priority, created_by, event_type,
    entity_type, entity_id, action_url, dedupe_key
  )
  VALUES (
    btrim(p_title), btrim(p_message), 'specific_user', 'normal', auth.uid(),
    btrim(p_event_type), nullif(btrim(coalesce(p_entity_type, '')), ''),
    p_entity_id, nullif(btrim(coalesce(p_action_url, '')), ''),
    nullif(btrim(coalesce(p_dedupe_key, '')), '')
  )
  ON CONFLICT (dedupe_key) WHERE dedupe_key IS NOT NULL
  DO UPDATE SET dedupe_key = EXCLUDED.dedupe_key
  RETURNING id INTO v_notification_id;

  INSERT INTO public.notification_recipients (
    notification_id, recipient_user_id
  )
  VALUES (v_notification_id, p_recipient_user_id)
  ON CONFLICT (notification_id, recipient_user_id) DO NOTHING;

  RETURN v_notification_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_bms_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.stage_number = 2
     AND NEW.status = 'completed'
     AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM public.enqueue_team_notification(
      NEW.team_id,
      'bms_completed',
      'BMS session completed',
      'Your team has completed the BMS session. Stage 3 portfolio production is now available.',
      '/student/my-stage',
      'team_stage_progress',
      NEW.id,
      'bms_completed:' || NEW.team_id::text,
      true,
      true,
      false
    );
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_bms_completion ON public.team_stage_progress;
CREATE TRIGGER trg_notify_bms_completion
  AFTER UPDATE OF status ON public.team_stage_progress
  FOR EACH ROW EXECUTE FUNCTION public.notify_bms_completion();

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_profile_id uuid := auth.uid();
  v_updated integer;
BEGIN
  IF v_profile_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = v_profile_id
      AND p.status = 'active'
  ) THEN
    RAISE EXCEPTION 'You do not have permission to perform this action.';
  END IF;

  UPDATE public.notification_recipients nr
  SET read_status = true,
      read_at = coalesce(nr.read_at, now())
  WHERE nr.recipient_user_id = v_profile_id
    AND nr.read_status = false;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$function$;

REVOKE ALL ON FUNCTION public.enqueue_team_notification(
  uuid, text, text, text, text, text, uuid, text, boolean, boolean, boolean
) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.enqueue_user_notification(
  uuid, text, text, text, text, text, uuid, text
) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.notify_bms_completion()
  FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.mark_notification_read(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_notification_read(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.mark_all_notifications_read() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read() TO authenticated;

-- Read state changes are RPC-only so recipients cannot alter ownership fields.
REVOKE UPDATE ON public.notification_recipients FROM authenticated;
