-- =============================================================================
-- IncluHub Dashboard — Package B verification (008_studio_bookings)
-- =============================================================================
--
-- READ-ONLY static checks for schema, grants, RPCs, RLS, and Realtime.
-- Does not modify live data.
--
-- For simulated-auth RPC mutation tests (BEGIN … ROLLBACK), use:
--   supabase/scripts/verify_package_b_rpc.sql
--
-- Browser/manual UI tests are NOT covered here — see IMPLEMENTATION_PROGRESS.md.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Tables exist
-- ---------------------------------------------------------------------------
SELECT
  'tables_exist' AS check_name,
  CASE
    WHEN count(*) = 2 THEN 'PASS'
    ELSE 'FAIL'
  END AS result,
  string_agg(table_name, ', ' ORDER BY table_name) AS tables_found
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('studio_slot_occupancy', 'studio_bookings');

-- ---------------------------------------------------------------------------
-- 2. studio_slot_occupancy columns
-- ---------------------------------------------------------------------------
SELECT
  'studio_slot_occupancy_columns' AS check_name,
  CASE
    WHEN count(*) = 4 THEN 'PASS'
    ELSE 'FAIL'
  END AS result,
  string_agg(column_name, ', ' ORDER BY column_name) AS columns_found
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'studio_slot_occupancy'
  AND column_name IN ('id', 'booking_date', 'slot_code', 'created_at');

-- ---------------------------------------------------------------------------
-- 3. studio_bookings columns
-- ---------------------------------------------------------------------------
SELECT
  'studio_bookings_columns' AS check_name,
  CASE
    WHEN count(*) = 7 THEN 'PASS'
    ELSE 'FAIL'
  END AS result,
  string_agg(column_name, ', ' ORDER BY column_name) AS columns_found
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'studio_bookings'
  AND column_name IN (
    'id',
    'portfolio_output_id',
    'team_id',
    'leader_student_id',
    'occupancy_id',
    'created_by',
    'booked_at'
  );

-- ---------------------------------------------------------------------------
-- 4. Foreign keys on studio_bookings
-- ---------------------------------------------------------------------------
SELECT
  'studio_bookings_foreign_keys' AS check_name,
  CASE
    WHEN count(*) = 5 THEN 'PASS'
    ELSE 'FAIL'
  END AS result,
  string_agg(
    conname || ' -> ' || confrelid::regclass::text,
    ', ' ORDER BY conname
  ) AS foreign_keys_found
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'public'
  AND t.relname = 'studio_bookings'
  AND c.contype = 'f';

-- ---------------------------------------------------------------------------
-- 5. Slot CHECK constraint — all five exact slot codes
-- ---------------------------------------------------------------------------
WITH expected_slots AS (
  SELECT unnest(ARRAY[
    'slot_06_09',
    'slot_09_12',
    'slot_12_15',
    'slot_15_18',
    'slot_18_21'
  ]) AS slot_code
),
constraint_defs AS (
  SELECT pg_get_constraintdef(c.oid) AS def
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public'
    AND t.relname = 'studio_slot_occupancy'
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) LIKE '%slot_%'
)
SELECT
  'studio_slot_occupancy_slot_check' AS check_name,
  CASE
    WHEN (
      SELECT count(*)
      FROM expected_slots es
      WHERE EXISTS (
        SELECT 1
        FROM constraint_defs cd
        WHERE cd.def LIKE '%' || es.slot_code || '%'
      )
    ) = 5
    AND (SELECT count(*) FROM constraint_defs) >= 1
    THEN 'PASS'
    ELSE 'FAIL'
  END AS result,
  coalesce((SELECT string_agg(def, ' | ') FROM constraint_defs), 'missing') AS constraint_defs;

-- ---------------------------------------------------------------------------
-- 6. Unique booking_date + slot_code
-- ---------------------------------------------------------------------------
SELECT
  'studio_slot_occupancy_unique_date_slot' AS check_name,
  CASE
    WHEN count(*) = 1 THEN 'PASS'
    ELSE 'FAIL'
  END AS result,
  string_agg(conname, ', ') AS constraints_found
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'public'
  AND t.relname = 'studio_slot_occupancy'
  AND c.contype = 'u'
  AND pg_get_constraintdef(c.oid) LIKE '%booking_date%'
  AND pg_get_constraintdef(c.oid) LIKE '%slot_code%';

-- ---------------------------------------------------------------------------
-- 7. Unique portfolio_output_id and occupancy_id
-- ---------------------------------------------------------------------------
SELECT
  'studio_bookings_unique_portfolio_output_id' AS check_name,
  CASE
    WHEN count(*) = 1 THEN 'PASS'
    ELSE 'FAIL'
  END AS result,
  string_agg(conname, ', ') AS constraints_found
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'public'
  AND t.relname = 'studio_bookings'
  AND c.contype = 'u'
  AND pg_get_constraintdef(c.oid) LIKE '%portfolio_output_id%';

SELECT
  'studio_bookings_unique_occupancy_id' AS check_name,
  CASE
    WHEN count(*) = 1 THEN 'PASS'
    ELSE 'FAIL'
  END AS result,
  string_agg(conname, ', ') AS constraints_found
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'public'
  AND t.relname = 'studio_bookings'
  AND c.contype = 'u'
  AND pg_get_constraintdef(c.oid) LIKE '%occupancy_id%';

-- ---------------------------------------------------------------------------
-- 8. RLS enabled — both tables must have relrowsecurity = true
-- ---------------------------------------------------------------------------
SELECT
  'rls_enabled' AS check_name,
  CASE
    WHEN count(*) = 2
     AND bool_and(c.relrowsecurity)
    THEN 'PASS'
    ELSE 'FAIL'
  END AS result,
  string_agg(c.relname || '=' || c.relrowsecurity::text, ', ' ORDER BY c.relname) AS rls_status
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('studio_slot_occupancy', 'studio_bookings');

-- ---------------------------------------------------------------------------
-- 9–11. No INSERT, UPDATE or DELETE policies on either table
-- ---------------------------------------------------------------------------
SELECT
  'no_insert_policy' AS check_name,
  CASE
    WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL'
  END AS result,
  coalesce(string_agg(policyname, ', '), 'none') AS insert_policies_found
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('studio_slot_occupancy', 'studio_bookings')
  AND cmd = 'INSERT';

SELECT
  'no_update_policy' AS check_name,
  CASE
    WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL'
  END AS result,
  coalesce(string_agg(policyname, ', '), 'none') AS update_policies_found
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('studio_slot_occupancy', 'studio_bookings')
  AND cmd = 'UPDATE';

SELECT
  'no_delete_policy' AS check_name,
  CASE
    WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL'
  END AS result,
  coalesce(string_agg(policyname, ', '), 'none') AS delete_policies_found
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('studio_slot_occupancy', 'studio_bookings')
  AND cmd = 'DELETE';

-- ---------------------------------------------------------------------------
-- 12. external_member has no occupancy SELECT policy
-- ---------------------------------------------------------------------------
SELECT
  'no_external_member_occupancy_policy' AS check_name,
  CASE
    WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL'
  END AS result,
  coalesce(string_agg(policyname, ', '), 'none') AS external_policies_found
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'studio_slot_occupancy'
  AND cmd = 'SELECT'
  AND (
    policyname ILIKE '%external%'
    OR qual::text ILIKE '%external_member%'
  );

SELECT
  'no_external_member_booking_policy' AS check_name,
  CASE
    WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL'
  END AS result,
  coalesce(string_agg(policyname, ', '), 'none') AS external_policies_found
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'studio_bookings'
  AND cmd = 'SELECT'
  AND (
    policyname ILIKE '%external%'
    OR qual::text ILIKE '%external_member%'
  );

-- ---------------------------------------------------------------------------
-- 13–14. RPC exact signatures exist
-- ---------------------------------------------------------------------------
SELECT
  'get_studio_slot_availability_signature' AS check_name,
  CASE
    WHEN to_regprocedure('public.get_studio_slot_availability(date)') IS NOT NULL
    THEN 'PASS'
    ELSE 'FAIL'
  END AS result,
  coalesce(
    to_regprocedure('public.get_studio_slot_availability(date)')::text,
    'missing'
  ) AS function_signature;

SELECT
  'book_studio_slot_signature' AS check_name,
  CASE
    WHEN to_regprocedure('public.book_studio_slot(uuid,date,text)') IS NOT NULL
    THEN 'PASS'
    ELSE 'FAIL'
  END AS result,
  coalesce(
    to_regprocedure('public.book_studio_slot(uuid,date,text)')::text,
    'missing'
  ) AS function_signature;

-- ---------------------------------------------------------------------------
-- 15. SECURITY DEFINER configuration
-- ---------------------------------------------------------------------------
SELECT
  'rpc_security_definer' AS check_name,
  CASE
    WHEN count(*) = 2
     AND bool_and(p.prosecdef)
    THEN 'PASS'
    ELSE 'FAIL'
  END AS result,
  string_agg(p.proname || '=' || p.prosecdef::text, ', ' ORDER BY p.proname) AS security_definer
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('get_studio_slot_availability', 'book_studio_slot');

-- ---------------------------------------------------------------------------
-- 16–18. EXECUTE permissions
-- ---------------------------------------------------------------------------
SELECT
  'authenticated_execute_permissions' AS check_name,
  CASE
    WHEN count(*) = 2 THEN 'PASS'
    ELSE 'FAIL'
  END AS result,
  string_agg(
    routine_name || ':' || grantee,
    ', ' ORDER BY routine_name
  ) AS grants_found
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name IN ('get_studio_slot_availability', 'book_studio_slot')
  AND grantee = 'authenticated'
  AND privilege_type = 'EXECUTE';

SELECT
  'anon_no_package_b_rpc_execute' AS check_name,
  CASE
    WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL'
  END AS result,
  coalesce(string_agg(routine_name || ':' || grantee, ', '), 'none') AS anon_grants
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name IN ('get_studio_slot_availability', 'book_studio_slot')
  AND grantee = 'anon'
  AND privilege_type = 'EXECUTE';

SELECT
  'public_no_package_b_rpc_execute' AS check_name,
  CASE
    WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL'
  END AS result,
  coalesce(string_agg(routine_name || ':' || grantee, ', '), 'none') AS public_grants
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name IN ('get_studio_slot_availability', 'book_studio_slot')
  AND grantee = 'PUBLIC'
  AND privilege_type = 'EXECUTE';

-- ---------------------------------------------------------------------------
-- 19. anon has no table access
-- ---------------------------------------------------------------------------
SELECT
  'anon_no_table_access' AS check_name,
  CASE
    WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL'
  END AS result,
  coalesce(
    string_agg(table_name || ':' || privilege_type, ', '),
    'none'
  ) AS anon_table_grants
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND table_name IN ('studio_slot_occupancy', 'studio_bookings')
  AND grantee = 'anon';

-- ---------------------------------------------------------------------------
-- 20. Realtime publication status
-- ---------------------------------------------------------------------------
SELECT
  'realtime_publication' AS check_name,
  CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
    ) THEN 'MANUAL_CHECK_REQUIRED'
    WHEN EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'studio_slot_occupancy'
    ) THEN 'PASS'
    ELSE 'MANUAL_CHECK_REQUIRED'
  END AS result,
  coalesce(
    (
      SELECT string_agg(tablename, ', ')
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'studio_slot_occupancy'
    ),
    'not published — enable studio_slot_occupancy in Dashboard → Database → Replication'
  ) AS published_tables;
