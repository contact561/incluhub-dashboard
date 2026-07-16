-- ============================================================================
-- 001_schema_security_audit.sql
-- Read-only schema + security audit for the IncluHub development database.
-- Repaired 2026-07-14: no dependency on supabase_migrations.schema_migrations.
--
-- SAFETY: SELECT-only. No INSERT/UPDATE/DELETE/TRUNCATE/DROP/ALTER/CREATE.
-- Run in the Supabase SQL editor (or psql) as a privileged role.
-- ============================================================================

-- 1. Optional CLI migration-history table (may be absent when migrations
--    were applied manually through the SQL editor).
--
-- When migration_history_table is NULL, no SQL-visible Supabase CLI migration
-- ledger is present. Reconcile local migration files against actual schema
-- objects using sections 2–12 below. A NULL result is NOT by itself proof that
-- migrations were not applied.
SELECT 'migration_history_table' AS section,
       to_regclass('supabase_migrations.schema_migrations') AS migration_history_table;

-- 2. Expected runtime tables (present / missing relative to local migrations)
WITH expected(table_name) AS (
  VALUES
    ('profiles'),
    ('institutes'),
    ('programs'),
    ('program_institutes'),
    ('program_enrollments'),
    ('students'),
    ('educators'),
    ('external_members'),
    ('teams'),
    ('team_members'),
    ('team_educators'),
    ('stages'),
    ('team_stage_progress'),
    ('portfolio_outputs'),
    ('portfolio_participants'),
    ('portfolio_submissions'),
    ('portfolio_reviews'),
    ('portfolio_approvals'),
    ('studio_slot_occupancy'),
    ('studio_bookings'),
    ('projects'),
    ('project_assignments'),
    ('project_approvals'),
    ('notifications'),
    ('notification_recipients'),
    ('activity_logs')
)
SELECT 'expected_tables' AS section,
       e.table_name,
       CASE
         WHEN to_regclass('public.' || e.table_name) IS NOT NULL THEN 'present'
         ELSE 'missing'
       END AS status
FROM expected e
ORDER BY e.table_name;

-- 3. All public tables
SELECT 'tables' AS section, tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 4. Columns for every public table
SELECT 'columns' AS section, table_name, column_name, data_type,
       is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- 5. Enums and values
SELECT 'enums' AS section, t.typname AS enum_name,
       e.enumlabel AS value, e.enumsortorder
FROM pg_type t
JOIN pg_enum e ON e.enumtypid = t.oid
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
ORDER BY t.typname, e.enumsortorder;

-- 6. Constraints (PK, FK, UNIQUE, CHECK)
SELECT 'constraints' AS section, conrelid::regclass AS table_name,
       conname, contype, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE connamespace = 'public'::regnamespace
ORDER BY conrelid::regclass::text, conname;

-- 7. Indexes
SELECT 'indexes' AS section, tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 8. RLS enabled per table (every runtime table should show rowsecurity = true)
SELECT 'rls_enabled' AS section, relname AS table_name,
       relrowsecurity AS rls_enabled, relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
ORDER BY relname;

-- 9. All RLS policies
SELECT 'policies' AS section, tablename, policyname, permissive, roles,
       cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 10. Table grants per role (look for unexpected broad INSERT/UPDATE/DELETE)
SELECT 'table_grants' AS section, table_name, grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND grantee IN ('anon', 'authenticated', 'PUBLIC', 'service_role')
ORDER BY table_name, grantee, privilege_type;

-- 11. Functions: security mode + search_path configuration
SELECT 'functions' AS section, p.proname AS function_name,
       CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END AS security,
       p.proconfig AS config_settings,
       pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
ORDER BY p.proname;

-- 12. Function execute grants (anon/PUBLIC must NOT have execute on workflow RPCs)
SELECT 'function_grants' AS section, p.proname AS function_name,
       a.grantee::regrole::text AS grantee, a.privilege_type
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
WHERE n.nspname = 'public'
ORDER BY p.proname, grantee;

-- 13. Realtime publication membership
-- (studio_slot_occupancy should be present for useStudioAvailability Realtime)
SELECT 'realtime_publication' AS section, pubname, schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;
