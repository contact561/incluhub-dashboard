-- =============================================================================
-- Package E1 static schema, grant, RPC, and RLS verification
-- Run after migration 013. Read-only.
-- =============================================================================

DO $$
DECLARE
  v_missing text;
  v_function record;
BEGIN
  SELECT string_agg(required.column_name, ', ' ORDER BY required.column_name)
  INTO v_missing
  FROM (
    VALUES
      ('brand_works_date'),
      ('brand_works_remarks'),
      ('brand_works_scheduled_at'),
      ('brand_works_scheduled_by'),
      ('brand_works_completed_at'),
      ('brand_works_completed_by')
  ) AS required(column_name)
  WHERE NOT EXISTS (
    SELECT 1
    FROM information_schema.columns AS c
    WHERE c.table_schema = 'public'
      AND c.table_name = 'team_stage_progress'
      AND c.column_name = required.column_name
  );

  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'FAIL: missing Brand Works columns: %', v_missing;
  END IF;
  RAISE NOTICE 'PASS: all six Brand Works columns exist';

  FOR v_function IN
    SELECT
      p.proname,
      p.prosecdef,
      coalesce(array_to_string(p.proconfig, ','), '') AS configuration
    FROM pg_proc AS p
    JOIN pg_namespace AS n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('schedule_brand_works', 'complete_brand_works')
  LOOP
    IF NOT v_function.prosecdef THEN
      RAISE EXCEPTION 'FAIL: % is not SECURITY DEFINER', v_function.proname;
    END IF;
    IF v_function.configuration NOT LIKE '%search_path=public%' THEN
      RAISE EXCEPTION 'FAIL: % does not fix search_path', v_function.proname;
    END IF;
  END LOOP;

  IF (
    SELECT count(*)
    FROM pg_proc AS p
    JOIN pg_namespace AS n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('schedule_brand_works', 'complete_brand_works')
  ) <> 2 THEN
    RAISE EXCEPTION 'FAIL: both Package E1 RPCs were not found';
  END IF;
  RAISE NOTICE 'PASS: both RPCs are SECURITY DEFINER with fixed search_path';

  IF NOT has_function_privilege(
    'authenticated', 'public.schedule_brand_works(uuid,date,text)', 'EXECUTE'
  ) OR NOT has_function_privilege(
    'authenticated', 'public.complete_brand_works(uuid)', 'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'FAIL: authenticated is missing RPC execute grants';
  END IF;

  IF has_function_privilege(
    'anon', 'public.schedule_brand_works(uuid,date,text)', 'EXECUTE'
  ) OR has_function_privilege(
    'anon', 'public.complete_brand_works(uuid)', 'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'FAIL: anon can execute a Package E1 RPC';
  END IF;
  RAISE NOTICE 'PASS: RPC execute grants are restricted';

  IF has_table_privilege('authenticated', 'public.team_stage_progress', 'INSERT')
     OR has_table_privilege('authenticated', 'public.team_stage_progress', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.team_stage_progress', 'DELETE') THEN
    RAISE EXCEPTION 'FAIL: authenticated can mutate team_stage_progress directly';
  END IF;

  IF NOT has_table_privilege(
    'authenticated', 'public.team_stage_progress', 'SELECT'
  ) THEN
    RAISE EXCEPTION 'FAIL: authenticated cannot read team_stage_progress';
  END IF;
  RAISE NOTICE 'PASS: stage progress is read-only outside workflow RPCs';

  IF NOT (
    SELECT c.relrowsecurity
    FROM pg_class AS c
    JOIN pg_namespace AS n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'team_stage_progress'
  ) THEN
    RAISE EXCEPTION 'FAIL: RLS is not enabled on team_stage_progress';
  END IF;

  IF (
    SELECT count(*)
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'team_stage_progress'
      AND policyname IN (
        'team_stage_progress_select_admin',
        'team_stage_progress_select_student_own_team',
        'team_stage_progress_select_educator_assigned'
      )
  ) <> 3 THEN
    RAISE EXCEPTION 'FAIL: expected admin/student/educator read policies are missing';
  END IF;
  RAISE NOTICE 'PASS: role-scoped Stage 4 RLS read policies are present';
END;
$$;
