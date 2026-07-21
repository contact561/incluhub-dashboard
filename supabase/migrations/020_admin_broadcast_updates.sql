-- =============================================================================
-- IncluHub Education Management Dashboard
-- Migration 020: Admin broadcast Updates (students / educators / everyone)
--
-- Depends on 014. Forward-only.
-- =============================================================================

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_audience_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_audience_type_check
  CHECK (audience_type IN (
    'all_students',
    'all_educators',
    'all_external',
    'everyone',
    'specific_team',
    'specific_user'
  ));

CREATE OR REPLACE FUNCTION public.send_admin_update(
  p_audience text,
  p_title text,
  p_message text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_admin_id uuid := auth.uid();
  v_audience text := nullif(btrim(coalesce(p_audience, '')), '');
  v_title text := nullif(btrim(coalesce(p_title, '')), '');
  v_message text := nullif(btrim(coalesce(p_message, '')), '');
  v_notification_id uuid;
BEGIN
  IF v_admin_id IS NULL OR NOT public.is_admin() OR NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = v_admin_id AND p.role = 'admin' AND p.status = 'active'
  ) THEN
    RAISE EXCEPTION 'You do not have permission to perform this action.';
  END IF;

  IF v_audience IS NULL OR v_audience NOT IN (
    'all_students', 'all_educators', 'everyone'
  ) THEN
    RAISE EXCEPTION 'Select a valid update audience.';
  END IF;

  IF v_title IS NULL OR char_length(v_title) < 3 OR char_length(v_title) > 200 THEN
    RAISE EXCEPTION 'Update title must be between 3 and 200 characters.';
  END IF;

  IF v_message IS NULL OR char_length(v_message) < 3 OR char_length(v_message) > 2000 THEN
    RAISE EXCEPTION 'Update message must be between 3 and 2000 characters.';
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
  ) VALUES (
    v_title,
    v_message,
    v_audience,
    'normal',
    v_admin_id,
    'admin_update',
    NULL,
    NULL,
    '/admin/notifications',
    NULL
  )
  RETURNING id INTO v_notification_id;

  IF v_audience = 'all_students' THEN
    INSERT INTO public.notification_recipients (notification_id, recipient_user_id)
    SELECT DISTINCT v_notification_id, s.user_id
    FROM public.students s
    JOIN public.profiles p ON p.id = s.user_id
    WHERE s.status = 'active' AND p.status = 'active' AND p.role = 'student'
    ON CONFLICT (notification_id, recipient_user_id) DO NOTHING;
  ELSIF v_audience = 'all_educators' THEN
    INSERT INTO public.notification_recipients (notification_id, recipient_user_id)
    SELECT DISTINCT v_notification_id, e.user_id
    FROM public.educators e
    JOIN public.profiles p ON p.id = e.user_id
    WHERE e.status = 'active' AND p.status = 'active' AND p.role = 'educator'
    ON CONFLICT (notification_id, recipient_user_id) DO NOTHING;
  ELSE
    INSERT INTO public.notification_recipients (notification_id, recipient_user_id)
    SELECT DISTINCT v_notification_id, p.id
    FROM public.profiles p
    WHERE p.status = 'active'
      AND p.role IN ('student', 'educator', 'admin')
    ON CONFLICT (notification_id, recipient_user_id) DO NOTHING;
  END IF;

  -- Recipients open their own role inbox, not the admin compose path.
  UPDATE public.notifications
  SET action_url = CASE v_audience
    WHEN 'all_students' THEN '/student/notifications'
    WHEN 'all_educators' THEN '/educator/notifications'
    ELSE NULL
  END
  WHERE id = v_notification_id;

  RETURN v_notification_id;
END;
$function$;

COMMENT ON FUNCTION public.send_admin_update(text, text, text) IS
  'Admin-only broadcast Updates to all students, all educators, or everyone.';

REVOKE ALL ON FUNCTION public.send_admin_update(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_admin_update(text, text, text) TO authenticated;
