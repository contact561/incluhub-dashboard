-- =============================================================================
-- Stage 3 schema inventory — read-only table/column report
-- Run in Supabase SQL editor after migrations 014, 015/021, 018, 019, 020.
-- Every row in the first result should show status = PASS.
-- The second result should show missing_objects = NULL.
-- =============================================================================

WITH required_tables AS (
  SELECT *
  FROM (
    VALUES
      ('notifications', '014 notifications'),
      ('notification_recipients', '014 notifications'),
      ('portfolio_outputs', 'Stage 3 portfolios'),
      ('portfolio_participants', 'Stage 3 team roles'),
      ('portfolio_submissions', '010 portfolio submit'),
      ('studio_slot_occupancy', '008 studio booking'),
      ('studio_bookings', '008 studio booking'),
      ('studio_availability_responses', '015/021 availability'),
      ('studio_checkin_tokens', '015/021 QR check-in')
  ) AS t(table_name, purpose)
),
required_columns AS (
  SELECT *
  FROM (
    VALUES
      ('studio_bookings', 'verification_status'),
      ('studio_bookings', 'online_confirmed_at'),
      ('studio_bookings', 'physically_verified_at'),
      ('studio_bookings', 'physically_verified_by'),
      ('studio_bookings', 'no_show_at'),
      ('studio_bookings', 'no_show_by'),
      ('studio_bookings', 'no_show_remarks')
  ) AS c(table_name, column_name)
),
table_checks AS (
  SELECT
    'table' AS check_type,
    rt.table_name AS object_name,
    rt.purpose,
    CASE
      WHEN to_regclass('public.' || rt.table_name) IS NOT NULL THEN 'PASS'
      ELSE 'FAIL'
    END AS status
  FROM required_tables rt
),
column_checks AS (
  SELECT
    'column' AS check_type,
    rc.table_name || '.' || rc.column_name AS object_name,
    '015/021 studio verification' AS purpose,
    CASE
      WHEN EXISTS (
        SELECT 1
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
          AND c.table_name = rc.table_name
          AND c.column_name = rc.column_name
      ) THEN 'PASS'
      ELSE 'FAIL'
    END AS status
  FROM required_columns rc
),
all_checks AS (
  SELECT * FROM table_checks
  UNION ALL
  SELECT * FROM column_checks
)
SELECT * FROM all_checks ORDER BY check_type, object_name;

-- Summary row (run as second statement in editor, or scroll to second result set)
WITH required_tables AS (
  SELECT table_name
  FROM (
    VALUES
      ('notifications'),
      ('notification_recipients'),
      ('portfolio_outputs'),
      ('portfolio_participants'),
      ('portfolio_submissions'),
      ('studio_slot_occupancy'),
      ('studio_bookings'),
      ('studio_availability_responses'),
      ('studio_checkin_tokens')
  ) AS t(table_name)
),
required_columns AS (
  SELECT table_name, column_name
  FROM (
    VALUES
      ('studio_bookings', 'verification_status'),
      ('studio_bookings', 'online_confirmed_at'),
      ('studio_bookings', 'physically_verified_at'),
      ('studio_bookings', 'physically_verified_by'),
      ('studio_bookings', 'no_show_at'),
      ('studio_bookings', 'no_show_by'),
      ('studio_bookings', 'no_show_remarks')
  ) AS c(table_name, column_name)
)
SELECT string_agg(failures.object_name, ', ' ORDER BY failures.object_name) AS missing_objects
FROM (
  SELECT rt.table_name AS object_name
  FROM required_tables rt
  WHERE to_regclass('public.' || rt.table_name) IS NULL

  UNION ALL

  SELECT rc.table_name || '.' || rc.column_name AS object_name
  FROM required_columns rc
  WHERE NOT EXISTS (
    SELECT 1
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = rc.table_name
      AND c.column_name = rc.column_name
  )
) AS failures;
