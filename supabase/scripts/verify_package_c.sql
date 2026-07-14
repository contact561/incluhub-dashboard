-- =============================================================================
-- IncluHub Dashboard — Package C verification (010_portfolio_submission)
-- =============================================================================
--
-- READ-ONLY static checks for schema, grants, RPCs, and RLS.
-- Does not modify live data.
--
-- For simulated-auth RPC mutation tests (BEGIN … ROLLBACK), use:
--   supabase/scripts/verify_package_c_rpc.sql
--
-- Browser/manual UI tests are NOT covered here — see IMPLEMENTATION_PROGRESS.md.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Exact submit_portfolio signature via to_regprocedure
-- ---------------------------------------------------------------------------
SELECT
  'submit_portfolio_exact_signature' AS check_name,
  CASE
    WHEN to_regprocedure('public.submit_portfolio(uuid,text,text,text)') IS NOT NULL
    THEN 'PASS'
    ELSE 'FAIL'
  END AS result,
  to_regprocedure('public.submit_portfolio(uuid,text,text,text)')::text AS procedure_found;

-- ---------------------------------------------------------------------------
-- 2. SECURITY DEFINER
-- ---------------------------------------------------------------------------
SELECT
  'submit_portfolio_security_definer' AS check_name,
  CASE
    WHEN p.prosecdef THEN 'PASS'
    ELSE 'FAIL'
  END AS result
FROM pg_proc p
WHERE p.oid = to_regprocedure('public.submit_portfolio(uuid,text,text,text)');

-- ---------------------------------------------------------------------------
-- 3. Safe search_path in proconfig
-- ---------------------------------------------------------------------------
SELECT
  'submit_portfolio_safe_search_path' AS check_name,
  CASE
    WHEN p.proconfig IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM unnest(p.proconfig) AS cfg(value)
       WHERE cfg.value ~* '^search_path='
         AND cfg.value ~* '(^|=|,)\s*public(\s*,|$)'
         AND cfg.value !~* '\$user'
     )
    THEN 'PASS'
    ELSE 'FAIL'
  END AS result,
  coalesce(array_to_string(p.proconfig, ', '), 'none') AS proconfig
FROM pg_proc p
WHERE p.oid = to_regprocedure('public.submit_portfolio(uuid,text,text,text)');

-- ---------------------------------------------------------------------------
-- 4–5. EXECUTE grants
-- ---------------------------------------------------------------------------
SELECT
  'submit_portfolio_execute_authenticated' AS check_name,
  CASE
    WHEN has_function_privilege(
      'authenticated',
      'public.submit_portfolio(uuid, text, text, text)',
      'EXECUTE'
    ) THEN 'PASS'
    ELSE 'FAIL'
  END AS result;

SELECT
  'submit_portfolio_no_execute_anon' AS check_name,
  CASE
    WHEN NOT has_function_privilege(
      'anon',
      'public.submit_portfolio(uuid, text, text, text)',
      'EXECUTE'
    ) THEN 'PASS'
    ELSE 'FAIL'
  END AS result;

SELECT
  'submit_portfolio_no_execute_public' AS check_name,
  CASE
    WHEN NOT has_function_privilege(
      'public',
      'public.submit_portfolio(uuid, text, text, text)',
      'EXECUTE'
    ) THEN 'PASS'
    ELSE 'FAIL'
  END AS result;

-- ---------------------------------------------------------------------------
-- 6. authenticated SELECT only (no INSERT/UPDATE/DELETE)
-- ---------------------------------------------------------------------------
SELECT
  'portfolio_submissions_authenticated_select_only' AS check_name,
  CASE
    WHEN has_table_privilege('authenticated', 'public.portfolio_submissions', 'SELECT')
     AND NOT has_table_privilege('authenticated', 'public.portfolio_submissions', 'INSERT')
     AND NOT has_table_privilege('authenticated', 'public.portfolio_submissions', 'UPDATE')
     AND NOT has_table_privilege('authenticated', 'public.portfolio_submissions', 'DELETE')
    THEN 'PASS'
    ELSE 'FAIL'
  END AS result;

-- ---------------------------------------------------------------------------
-- 7. anon has no table privileges
-- ---------------------------------------------------------------------------
SELECT
  'portfolio_submissions_anon_no_privileges' AS check_name,
  CASE
    WHEN NOT has_table_privilege('anon', 'public.portfolio_submissions', 'SELECT')
     AND NOT has_table_privilege('anon', 'public.portfolio_submissions', 'INSERT')
     AND NOT has_table_privilege('anon', 'public.portfolio_submissions', 'UPDATE')
     AND NOT has_table_privilege('anon', 'public.portfolio_submissions', 'DELETE')
    THEN 'PASS'
    ELSE 'FAIL'
  END AS result;

-- ---------------------------------------------------------------------------
-- 8. RLS enabled
-- ---------------------------------------------------------------------------
SELECT
  'portfolio_submissions_rls_enabled' AS check_name,
  CASE WHEN c.relrowsecurity THEN 'PASS' ELSE 'FAIL' END AS result
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname = 'portfolio_submissions';

-- ---------------------------------------------------------------------------
-- 9. No INSERT / UPDATE / DELETE policies
-- ---------------------------------------------------------------------------
SELECT
  'portfolio_submissions_no_write_policies' AS check_name,
  CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS result,
  coalesce(string_agg(policyname || ':' || cmd, ', '), 'none') AS policies_found
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'portfolio_submissions'
  AND cmd IN ('INSERT', 'UPDATE', 'DELETE');

-- ---------------------------------------------------------------------------
-- 10. All SELECT policies apply TO authenticated
-- ---------------------------------------------------------------------------
SELECT
  'portfolio_submissions_select_policies_to_authenticated' AS check_name,
  CASE
    WHEN count(*) = 3
     AND bool_and(roles = ARRAY['authenticated']::name[])
    THEN 'PASS'
    ELSE 'FAIL'
  END AS result,
  string_agg(policyname || ' roles=' || roles::text, '; ' ORDER BY policyname)
    AS policies_found
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'portfolio_submissions'
  AND cmd = 'SELECT';

-- ---------------------------------------------------------------------------
-- 11. Admin policy: active Admin + is_admin
-- ---------------------------------------------------------------------------
SELECT
  'portfolio_submissions_admin_policy_active_checks' AS check_name,
  CASE
    WHEN count(*) = 1
     AND bool_and(
       qual ILIKE '%active%'
       AND qual ILIKE '%admin%'
       AND qual ILIKE '%is_admin%'
     )
    THEN 'PASS'
    ELSE 'FAIL'
  END AS result,
  max(qual) AS policy_qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'portfolio_submissions'
  AND policyname = 'portfolio_submissions_select_admin'
  AND cmd = 'SELECT';

-- ---------------------------------------------------------------------------
-- 12. Student policy: active Student + own-team
-- ---------------------------------------------------------------------------
SELECT
  'portfolio_submissions_student_policy_active_checks' AS check_name,
  CASE
    WHEN count(*) = 1
     AND bool_and(
       qual ILIKE '%active%'
       AND qual ILIKE '%student%'
       AND qual ILIKE '%my_active_team_id%'
     )
    THEN 'PASS'
    ELSE 'FAIL'
  END AS result,
  max(qual) AS policy_qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'portfolio_submissions'
  AND policyname = 'portfolio_submissions_select_student_own_team'
  AND cmd = 'SELECT';

-- ---------------------------------------------------------------------------
-- 13. Educator policy: active Educator + assigned-team
-- ---------------------------------------------------------------------------
SELECT
  'portfolio_submissions_educator_policy_active_checks' AS check_name,
  CASE
    WHEN count(*) = 1
     AND bool_and(
       qual ILIKE '%active%'
       AND qual ILIKE '%educator%'
       AND qual ILIKE '%is_educator_assigned_to_team%'
     )
    THEN 'PASS'
    ELSE 'FAIL'
  END AS result,
  max(qual) AS policy_qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'portfolio_submissions'
  AND policyname = 'portfolio_submissions_select_educator_assigned'
  AND cmd = 'SELECT';

-- ---------------------------------------------------------------------------
-- 14. External member has no policy
-- ---------------------------------------------------------------------------
SELECT
  'portfolio_submissions_no_external_policy' AS check_name,
  CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS result,
  coalesce(string_agg(policyname, ', '), 'none') AS policies_found
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'portfolio_submissions'
  AND (
    policyname ILIKE '%external%'
    OR coalesce(qual, '') ILIKE '%external%'
  );

-- ---------------------------------------------------------------------------
-- 15. UNIQUE(portfolio_output_id, version_number) exists
-- ---------------------------------------------------------------------------
SELECT
  'portfolio_submissions_unique_portfolio_version' AS check_name,
  CASE WHEN count(*) >= 1 THEN 'PASS' ELSE 'FAIL' END AS result,
  string_agg(c.conname, ', ' ORDER BY c.conname) AS constraints_found
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'public'
  AND t.relname = 'portfolio_submissions'
  AND c.contype = 'u'
  AND pg_get_constraintdef(c.oid) ILIKE '%portfolio_output_id%'
  AND pg_get_constraintdef(c.oid) ILIKE '%version_number%';

-- ---------------------------------------------------------------------------
-- 16. No unique constraint solely on portfolio_output_id
-- ---------------------------------------------------------------------------
SELECT
  'portfolio_submissions_no_sole_portfolio_unique' AS check_name,
  CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS result,
  coalesce(string_agg(c.conname, ', '), 'none') AS constraints_found
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'public'
  AND t.relname = 'portfolio_submissions'
  AND c.contype = 'u'
  AND replace(pg_get_constraintdef(c.oid), ' ', '')
        ~* 'UNIQUE\(portfolio_output_id\)'
  AND pg_get_constraintdef(c.oid) NOT ILIKE '%version_number%';

-- ---------------------------------------------------------------------------
-- 17. version_number CHECK exists
-- ---------------------------------------------------------------------------
SELECT
  'portfolio_submissions_version_check' AS check_name,
  CASE WHEN count(*) >= 1 THEN 'PASS' ELSE 'FAIL' END AS result,
  string_agg(c.conname, ', ' ORDER BY c.conname) AS checks_found
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'public'
  AND t.relname = 'portfolio_submissions'
  AND c.contype = 'c'
  AND pg_get_constraintdef(c.oid) ILIKE '%version_number%';

-- ---------------------------------------------------------------------------
-- 18. Package C Storage scope
-- Migration 010 creates no Storage objects. An existing unrelated bucket whose
-- name contains "portfolio" cannot be attributed to Package C from DB history.
-- ---------------------------------------------------------------------------
SELECT
  'package_c_storage_scope' AS check_name,
  CASE
    WHEN to_regclass('storage.buckets') IS NULL THEN 'PASS'
    ELSE 'MANUAL_CHECK_REQUIRED'
  END AS result,
  CASE
    WHEN to_regclass('storage.buckets') IS NULL THEN
      'storage.buckets unavailable; no Package C storage created by migration 010'
    ELSE
      'Confirm migration 010 created no storage.buckets / storage.objects. '
      || 'A pre-existing bucket name containing "portfolio" is outside Package C scope.'
  END AS guidance;

-- Supporting schema presence checks (informational completeness)
SELECT
  'portfolio_submissions_table_exists' AS check_name,
  CASE WHEN to_regclass('public.portfolio_submissions') IS NOT NULL
    THEN 'PASS' ELSE 'FAIL' END AS result;

SELECT
  'portfolio_submissions_columns' AS check_name,
  CASE WHEN count(*) = 9 THEN 'PASS' ELSE 'FAIL' END AS result,
  string_agg(column_name, ', ' ORDER BY column_name) AS columns_found
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'portfolio_submissions'
  AND column_name IN (
    'id',
    'portfolio_output_id',
    'version_number',
    'title',
    'portfolio_url',
    'notes',
    'submitted_by_student_id',
    'created_by',
    'created_at'
  );
