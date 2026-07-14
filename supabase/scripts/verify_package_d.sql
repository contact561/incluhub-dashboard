-- =============================================================================
-- IncluHub Dashboard — Package D1 verification (011_portfolio_review_workflow)
-- =============================================================================
--
-- READ-ONLY static checks for schema, grants, RPCs, and RLS.
-- Does not modify live data.
--
-- For simulated-auth RPC mutation tests (BEGIN … ROLLBACK), use:
--   supabase/scripts/verify_package_d_rpc.sql
-- =============================================================================

-- 1–3. Enums exist with exact values
SELECT
  'enum_portfolio_reviewer_stage' AS check_name,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public' AND t.typname = 'portfolio_reviewer_stage'
    )
    AND (
      SELECT array_agg(e.enumlabel::text ORDER BY e.enumsortorder)
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public' AND t.typname = 'portfolio_reviewer_stage'
    ) = ARRAY['educator', 'admin']::text[]
    THEN 'PASS' ELSE 'FAIL'
  END AS result;

SELECT
  'enum_portfolio_review_decision' AS check_name,
  CASE
    WHEN (
      SELECT array_agg(e.enumlabel::text ORDER BY e.enumsortorder)
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public' AND t.typname = 'portfolio_review_decision'
    ) = ARRAY['approved', 'revision_required']::text[]
    THEN 'PASS' ELSE 'FAIL'
  END AS result;

SELECT
  'enum_portfolio_revision_route' AS check_name,
  CASE
    WHEN (
      SELECT array_agg(e.enumlabel::text ORDER BY e.enumsortorder)
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public' AND t.typname = 'portfolio_revision_route'
    ) = ARRAY['educator', 'admin']::text[]
    THEN 'PASS' ELSE 'FAIL'
  END AS result;

-- 2. Table exists
SELECT
  'portfolio_reviews_table_exists' AS check_name,
  CASE WHEN to_regclass('public.portfolio_reviews') IS NOT NULL
    THEN 'PASS' ELSE 'FAIL' END AS result;

-- 3. Columns
SELECT
  'portfolio_reviews_columns' AS check_name,
  CASE WHEN count(*) = 8 THEN 'PASS' ELSE 'FAIL' END AS result,
  string_agg(column_name, ', ' ORDER BY column_name) AS columns_found
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'portfolio_reviews'
  AND column_name IN (
    'id',
    'portfolio_submission_id',
    'reviewer_stage',
    'reviewer_user_id',
    'decision',
    'comments',
    'created_by',
    'created_at'
  );

-- 4. Foreign keys
SELECT
  'portfolio_reviews_foreign_keys' AS check_name,
  CASE WHEN count(*) >= 3 THEN 'PASS' ELSE 'FAIL' END AS result,
  string_agg(conname, ', ' ORDER BY conname) AS foreign_keys_found
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'public'
  AND t.relname = 'portfolio_reviews'
  AND c.contype = 'f';

-- 5. Unique submission + reviewer_stage
SELECT
  'portfolio_reviews_unique_submission_stage' AS check_name,
  CASE WHEN count(*) >= 1 THEN 'PASS' ELSE 'FAIL' END AS result
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'public'
  AND t.relname = 'portfolio_reviews'
  AND c.contype = 'u'
  AND pg_get_constraintdef(c.oid) ILIKE '%portfolio_submission_id%'
  AND pg_get_constraintdef(c.oid) ILIKE '%reviewer_stage%';

-- 6–8. CHECK constraints
SELECT
  'portfolio_reviews_reviewer_created_by_check' AS check_name,
  CASE WHEN count(*) >= 1 THEN 'PASS' ELSE 'FAIL' END AS result
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'public'
  AND t.relname = 'portfolio_reviews'
  AND c.contype = 'c'
  AND pg_get_constraintdef(c.oid) ILIKE '%reviewer_user_id%'
  AND pg_get_constraintdef(c.oid) ILIKE '%created_by%';

SELECT
  'portfolio_reviews_revision_comments_check' AS check_name,
  CASE WHEN count(*) >= 1 THEN 'PASS' ELSE 'FAIL' END AS result
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'public'
  AND t.relname = 'portfolio_reviews'
  AND c.contype = 'c'
  AND pg_get_constraintdef(c.oid) ILIKE '%revision_required%';

SELECT
  'portfolio_reviews_comments_length_check' AS check_name,
  CASE WHEN count(*) >= 1 THEN 'PASS' ELSE 'FAIL' END AS result
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'public'
  AND t.relname = 'portfolio_reviews'
  AND c.contype = 'c'
  AND pg_get_constraintdef(c.oid) ILIKE '%2000%';

-- 9–10. revision_return_to
SELECT
  'portfolio_outputs_revision_return_to_column' AS check_name,
  CASE WHEN count(*) = 1 THEN 'PASS' ELSE 'FAIL' END AS result
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'portfolio_outputs'
  AND column_name = 'revision_return_to';

SELECT
  'portfolio_outputs_revision_return_to_check' AS check_name,
  CASE WHEN count(*) >= 1 THEN 'PASS' ELSE 'FAIL' END AS result
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'public'
  AND t.relname = 'portfolio_outputs'
  AND c.contype = 'c'
  AND c.conname = 'portfolio_outputs_revision_return_to_check';

-- 11–12. RLS + no write policies
SELECT
  'portfolio_reviews_rls_enabled' AS check_name,
  CASE WHEN c.relrowsecurity THEN 'PASS' ELSE 'FAIL' END AS result
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'portfolio_reviews';

SELECT
  'portfolio_reviews_no_write_policies' AS check_name,
  CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS result,
  coalesce(string_agg(policyname || ':' || cmd, ', '), 'none') AS policies_found
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'portfolio_reviews'
  AND cmd IN ('INSERT', 'UPDATE', 'DELETE');

-- 13–15. SELECT policies
SELECT
  'portfolio_reviews_select_admin_policy' AS check_name,
  CASE WHEN count(*) = 1 THEN 'PASS' ELSE 'FAIL' END AS result
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'portfolio_reviews'
  AND policyname = 'portfolio_reviews_select_admin'
  AND cmd = 'SELECT'
  AND roles = ARRAY['authenticated']::name[];

SELECT
  'portfolio_reviews_select_student_policy' AS check_name,
  CASE WHEN count(*) = 1 THEN 'PASS' ELSE 'FAIL' END AS result
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'portfolio_reviews'
  AND policyname = 'portfolio_reviews_select_student_own_team'
  AND cmd = 'SELECT'
  AND roles = ARRAY['authenticated']::name[];

SELECT
  'portfolio_reviews_select_matching_educator_policy' AS check_name,
  CASE
    WHEN count(*) = 1
     AND bool_and(qual ILIKE '%is_matching_portfolio_leader_educator%')
    THEN 'PASS' ELSE 'FAIL'
  END AS result
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'portfolio_reviews'
  AND policyname = 'portfolio_reviews_select_matching_educator'
  AND cmd = 'SELECT'
  AND roles = ARRAY['authenticated']::name[];

-- Matching educator helper
SELECT
  'helper_is_matching_portfolio_leader_educator_signature' AS check_name,
  CASE
    WHEN to_regprocedure('public.is_matching_portfolio_leader_educator(uuid)') IS NOT NULL
    THEN 'PASS' ELSE 'FAIL'
  END AS result;

SELECT
  'helper_is_matching_portfolio_leader_educator_security_definer' AS check_name,
  CASE
    WHEN (
      SELECT p.prosecdef
      FROM pg_proc p
      WHERE p.oid = to_regprocedure('public.is_matching_portfolio_leader_educator(uuid)')
    ) THEN 'PASS' ELSE 'FAIL'
  END AS result;

SELECT
  'helper_is_matching_portfolio_leader_educator_safe_search_path' AS check_name,
  CASE
    WHEN (
      SELECT
        p.proconfig IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM unnest(p.proconfig) AS cfg(value)
          WHERE cfg.value ~* '^search_path='
            AND cfg.value ~* 'public'
            AND cfg.value !~* '\$user'
        )
      FROM pg_proc p
      WHERE p.oid = to_regprocedure('public.is_matching_portfolio_leader_educator(uuid)')
    ) THEN 'PASS' ELSE 'FAIL'
  END AS result;

SELECT
  'helper_is_matching_portfolio_leader_educator_execute_grants' AS check_name,
  CASE
    WHEN to_regprocedure('public.is_matching_portfolio_leader_educator(uuid)') IS NOT NULL
     AND has_function_privilege(
       'authenticated',
       'public.is_matching_portfolio_leader_educator(uuid)',
       'EXECUTE'
     )
     AND NOT has_function_privilege(
       'anon',
       'public.is_matching_portfolio_leader_educator(uuid)',
       'EXECUTE'
     )
     AND NOT has_function_privilege(
       'public',
       'public.is_matching_portfolio_leader_educator(uuid)',
       'EXECUTE'
     )
    THEN 'PASS' ELSE 'FAIL'
  END AS result;

SELECT
  'helper_referenced_by_matching_educator_policy' AS check_name,
  CASE
    WHEN count(*) = 1
     AND bool_and(qual ILIKE '%is_matching_portfolio_leader_educator%')
    THEN 'PASS' ELSE 'FAIL'
  END AS result
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'portfolio_reviews'
  AND policyname = 'portfolio_reviews_select_matching_educator'
  AND cmd = 'SELECT';

-- 16. External excluded
SELECT
  'portfolio_reviews_no_external_policy' AS check_name,
  CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS result
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'portfolio_reviews'
  AND (
    policyname ILIKE '%external%'
    OR coalesce(qual, '') ILIKE '%external%'
  );

-- 17–18. Table privileges
SELECT
  'portfolio_reviews_authenticated_select_only' AS check_name,
  CASE
    WHEN has_table_privilege('authenticated', 'public.portfolio_reviews', 'SELECT')
     AND NOT has_table_privilege('authenticated', 'public.portfolio_reviews', 'INSERT')
     AND NOT has_table_privilege('authenticated', 'public.portfolio_reviews', 'UPDATE')
     AND NOT has_table_privilege('authenticated', 'public.portfolio_reviews', 'DELETE')
    THEN 'PASS' ELSE 'FAIL'
  END AS result;

SELECT
  'portfolio_reviews_anon_no_privileges' AS check_name,
  CASE
    WHEN NOT has_table_privilege('anon', 'public.portfolio_reviews', 'SELECT')
     AND NOT has_table_privilege('anon', 'public.portfolio_reviews', 'INSERT')
     AND NOT has_table_privilege('anon', 'public.portfolio_reviews', 'UPDATE')
     AND NOT has_table_privilege('anon', 'public.portfolio_reviews', 'DELETE')
    THEN 'PASS' ELSE 'FAIL'
  END AS result;

-- 19–23. RPCs
SELECT
  'rpc_review_portfolio_as_educator_signature' AS check_name,
  CASE
    WHEN to_regprocedure('public.review_portfolio_as_educator(uuid,uuid,text,text)') IS NOT NULL
    THEN 'PASS' ELSE 'FAIL'
  END AS result;

SELECT
  'rpc_review_portfolio_as_admin_signature' AS check_name,
  CASE
    WHEN to_regprocedure('public.review_portfolio_as_admin(uuid,uuid,text,text)') IS NOT NULL
    THEN 'PASS' ELSE 'FAIL'
  END AS result;

SELECT
  'rpc_resubmit_portfolio_signature' AS check_name,
  CASE
    WHEN to_regprocedure('public.resubmit_portfolio(uuid,text,text,text)') IS NOT NULL
    THEN 'PASS' ELSE 'FAIL'
  END AS result;

SELECT
  'rpc_all_security_definer' AS check_name,
  CASE
    WHEN (
      SELECT count(*) = 3 AND bool_and(p.prosecdef)
      FROM pg_proc p
      WHERE p.oid IN (
        to_regprocedure('public.review_portfolio_as_educator(uuid,uuid,text,text)'),
        to_regprocedure('public.review_portfolio_as_admin(uuid,uuid,text,text)'),
        to_regprocedure('public.resubmit_portfolio(uuid,text,text,text)')
      )
    ) THEN 'PASS' ELSE 'FAIL'
  END AS result;

SELECT
  'rpc_all_safe_search_path' AS check_name,
  CASE
    WHEN (
      SELECT count(*) = 3 AND bool_and(
        p.proconfig IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM unnest(p.proconfig) AS cfg(value)
          WHERE cfg.value ~* '^search_path='
            AND cfg.value ~* 'public'
            AND cfg.value !~* '\$user'
        )
      )
      FROM pg_proc p
      WHERE p.oid IN (
        to_regprocedure('public.review_portfolio_as_educator(uuid,uuid,text,text)'),
        to_regprocedure('public.review_portfolio_as_admin(uuid,uuid,text,text)'),
        to_regprocedure('public.resubmit_portfolio(uuid,text,text,text)')
      )
    ) THEN 'PASS' ELSE 'FAIL'
  END AS result;

SELECT
  'rpc_execute_authenticated_only' AS check_name,
  CASE
    WHEN has_function_privilege('authenticated', 'public.review_portfolio_as_educator(uuid,uuid,text,text)', 'EXECUTE')
     AND has_function_privilege('authenticated', 'public.review_portfolio_as_admin(uuid,uuid,text,text)', 'EXECUTE')
     AND has_function_privilege('authenticated', 'public.resubmit_portfolio(uuid,text,text,text)', 'EXECUTE')
     AND NOT has_function_privilege('anon', 'public.review_portfolio_as_educator(uuid,uuid,text,text)', 'EXECUTE')
     AND NOT has_function_privilege('anon', 'public.review_portfolio_as_admin(uuid,uuid,text,text)', 'EXECUTE')
     AND NOT has_function_privilege('anon', 'public.resubmit_portfolio(uuid,text,text,text)', 'EXECUTE')
     AND NOT has_function_privilege('public', 'public.review_portfolio_as_educator(uuid,uuid,text,text)', 'EXECUTE')
     AND NOT has_function_privilege('public', 'public.review_portfolio_as_admin(uuid,uuid,text,text)', 'EXECUTE')
     AND NOT has_function_privilege('public', 'public.resubmit_portfolio(uuid,text,text,text)', 'EXECUTE')
    THEN 'PASS' ELSE 'FAIL'
  END AS result;

-- 24. Active portfolio uniqueness still present
SELECT
  'uq_team_one_active_portfolio_exists' AS check_name,
  CASE WHEN count(*) = 1 THEN 'PASS' ELSE 'FAIL' END AS result
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname = 'uq_team_one_active_portfolio';

-- 25. Legacy portfolio_approvals mutation path closed
SELECT
  'legacy_portfolio_approvals_no_mutation_policies' AS check_name,
  CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS result,
  coalesce(string_agg(policyname, ', '), 'none') AS policies_found
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'portfolio_approvals'
  AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL');

SELECT
  'legacy_portfolio_approvals_authenticated_no_writes' AS check_name,
  CASE
    WHEN NOT has_table_privilege('authenticated', 'public.portfolio_approvals', 'INSERT')
     AND NOT has_table_privilege('authenticated', 'public.portfolio_approvals', 'UPDATE')
     AND NOT has_table_privilege('authenticated', 'public.portfolio_approvals', 'DELETE')
    THEN 'PASS' ELSE 'FAIL'
  END AS result;

-- 26. Storage scope (manual if buckets schema exists)
SELECT
  'package_d1_storage_scope' AS check_name,
  CASE
    WHEN to_regclass('storage.buckets') IS NULL THEN 'PASS'
    ELSE 'MANUAL_CHECK_REQUIRED'
  END AS result,
  'Migration 011 creates no Storage objects.' AS guidance;
