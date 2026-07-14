-- ============================================================================
-- 002_workflow_integrity_audit.sql
-- Read-only workflow integrity checks. Every query returns VIOLATION rows;
-- an empty result for a section means that check passed.
--
-- Schema columns validated against local migrations and src/types/database.ts.
-- Repaired 2026-07-14: teams.team_name, students.student_category,
-- team_members.member_status.
--
-- SAFETY: SELECT-only. No mutations, no RPC calls.
-- ============================================================================

-- 1. Orphan profiles (profile without auth user)
SELECT 'orphan_profiles' AS violation, p.id, p.email, p.role
FROM profiles p
LEFT JOIN auth.users u ON u.id = p.id
WHERE u.id IS NULL;

-- 2. Orphan student/educator/external records (no matching profile)
SELECT 'orphan_students' AS violation, s.id, s.user_id
FROM students s
LEFT JOIN profiles p ON p.id = s.user_id
WHERE p.id IS NULL;

SELECT 'orphan_educators' AS violation, e.id, e.user_id
FROM educators e
LEFT JOIN profiles p ON p.id = e.user_id
WHERE p.id IS NULL;

SELECT 'orphan_external_members' AS violation, x.id, x.user_id
FROM external_members x
LEFT JOIN profiles p ON p.id = x.user_id
WHERE p.id IS NULL;

-- 3. Active team without exactly 3 active members
SELECT 'team_member_count' AS violation, t.id AS team_id, t.team_name,
       COUNT(tm.id) FILTER (WHERE tm.member_status = 'active') AS active_members
FROM teams t
LEFT JOIN team_members tm ON tm.team_id = t.id
WHERE t.status = 'active'
GROUP BY t.id, t.team_name
HAVING COUNT(tm.id) FILTER (WHERE tm.member_status = 'active') <> 3;

-- 4. Active team without one member per discipline category
SELECT 'team_discipline_balance' AS violation, t.id AS team_id, t.team_name,
       array_agg(DISTINCT tm.student_category::text ORDER BY tm.student_category::text)
         AS active_categories
FROM teams t
JOIN team_members tm ON tm.team_id = t.id AND tm.member_status = 'active'
WHERE t.status = 'active'
GROUP BY t.id, t.team_name
HAVING COUNT(DISTINCT tm.student_category) <> 3
    OR array_agg(DISTINCT tm.student_category::text ORDER BY tm.student_category::text)
       <> ARRAY['hairstylist', 'makeup_artist', 'photographer'];

-- 5. Duplicate active team membership for one student
SELECT 'duplicate_active_membership' AS violation, tm.student_id,
       COUNT(*) AS active_teams
FROM team_members tm
WHERE tm.member_status = 'active'
GROUP BY tm.student_id
HAVING COUNT(*) > 1;

-- 6. Active team without exactly 3 active educator mappings
SELECT 'team_educator_count' AS violation, t.id AS team_id, t.team_name,
       COUNT(te.id) FILTER (WHERE te.status = 'active') AS active_educator_mappings
FROM teams t
LEFT JOIN team_educators te ON te.team_id = t.id
WHERE t.status = 'active'
GROUP BY t.id, t.team_name
HAVING COUNT(te.id) FILTER (WHERE te.status = 'active') <> 3;

-- 7. Active educator mapping without student_id (required since migration 005)
SELECT 'team_educator_missing_student' AS violation, te.id AS team_educator_id,
       t.team_name, te.educator_type, te.status
FROM team_educators te
JOIN teams t ON t.id = te.team_id
WHERE te.status = 'active'
  AND te.student_id IS NULL;

-- 8. Active team without any active educator mapping
SELECT 'missing_team_educators' AS violation, t.id AS team_id, t.team_name
FROM teams t
WHERE t.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM team_educators te
    WHERE te.team_id = t.id AND te.status = 'active'
  );

-- 9. Teams past stage 0 without stage-progress rows
SELECT 'missing_stage_progress' AS violation, t.id AS team_id, t.team_name,
       t.current_stage_number
FROM teams t
WHERE t.status = 'active'
  AND t.current_stage_number > 0
  AND NOT EXISTS (
    SELECT 1 FROM team_stage_progress tsp WHERE tsp.team_id = t.id
  );

-- 10. Team vs member stage mismatch
SELECT 'team_student_stage_mismatch' AS violation, t.id AS team_id, t.team_name,
       t.current_stage_number AS team_stage,
       s.id AS student_id, s.current_stage_number AS student_stage
FROM teams t
JOIN team_members tm ON tm.team_id = t.id AND tm.member_status = 'active'
JOIN students s ON s.id = tm.student_id
WHERE t.status = 'active'
  AND s.current_stage_number <> t.current_stage_number;

-- 11. Malformed portfolio sequences: sequence 1/2/3 with correct types
SELECT 'malformed_portfolio_sequence' AS violation, po.team_id, t.team_name,
       array_agg(po.sequence_order ORDER BY po.sequence_order) AS sequences,
       array_agg(po.portfolio_type::text ORDER BY po.sequence_order) AS types
FROM portfolio_outputs po
JOIN teams t ON t.id = po.team_id
GROUP BY po.team_id, t.team_name
HAVING array_agg(
  po.sequence_order
  ORDER BY po.sequence_order
) <> ARRAY[1, 2, 3]::smallint[]
    OR array_agg(po.portfolio_type::text ORDER BY po.sequence_order)
       <> ARRAY['photographer', 'makeup_artist', 'hairstylist'];

-- 12. More than one active (not locked/completed) portfolio per team
SELECT 'multiple_active_portfolios' AS violation, po.team_id, t.team_name,
       COUNT(*) AS active_count
FROM portfolio_outputs po
JOIN teams t ON t.id = po.team_id
WHERE po.workflow_status NOT IN ('locked', 'completed')
GROUP BY po.team_id, t.team_name
HAVING COUNT(*) > 1;

-- 13. Portfolio leader/category mismatch
SELECT 'leader_category_mismatch' AS violation, po.id AS portfolio_output_id,
       t.team_name, po.portfolio_type, s.student_category AS leader_category
FROM portfolio_outputs po
JOIN teams t ON t.id = po.team_id
JOIN students s ON s.id = po.leader_student_id
WHERE po.portfolio_type::text <> s.student_category::text;

-- 14. Portfolio leader is not the active team member for that discipline
SELECT 'leader_not_active_team_member' AS violation, po.id AS portfolio_output_id,
       t.team_name, po.portfolio_type, po.leader_student_id
FROM portfolio_outputs po
JOIN teams t ON t.id = po.team_id
WHERE NOT EXISTS (
  SELECT 1 FROM team_members tm
  WHERE tm.team_id = po.team_id
    AND tm.student_id = po.leader_student_id
    AND tm.student_category = po.portfolio_type
    AND tm.member_status = 'active'
);

-- 15. Booking exists while the portfolio is still locked
SELECT 'booking_before_unlock' AS violation, sb.id AS booking_id,
       t.team_name, sb.portfolio_output_id, po.workflow_status
FROM studio_bookings sb
JOIN portfolio_outputs po ON po.id = sb.portfolio_output_id
JOIN teams t ON t.id = po.team_id
WHERE po.workflow_status = 'locked';

-- 16. Submission without any booking on the same portfolio
SELECT 'submission_without_booking' AS violation, ps.id AS submission_id,
       t.team_name, ps.portfolio_output_id, ps.version_number
FROM portfolio_submissions ps
JOIN portfolio_outputs po ON po.id = ps.portfolio_output_id
JOIN teams t ON t.id = po.team_id
WHERE NOT EXISTS (
  SELECT 1 FROM studio_bookings sb
  WHERE sb.portfolio_output_id = ps.portfolio_output_id
);

--- 17. Non-contiguous submission version numbers per portfolio
WITH submission_version_sets AS (
  SELECT
    ps.portfolio_output_id,
    array_agg(
      ps.version_number::integer
      ORDER BY ps.version_number
    ) AS actual_versions,
    count(*)::integer AS version_count
  FROM portfolio_submissions ps
  GROUP BY ps.portfolio_output_id
),
submission_version_checks AS (
  SELECT
    svs.portfolio_output_id,
    svs.actual_versions,
    ARRAY(
      SELECT generate_series(1, svs.version_count)
    )::integer[] AS expected_versions
  FROM submission_version_sets svs
)
SELECT
  'non_contiguous_versions' AS violation,
  svc.portfolio_output_id,
  t.team_name,
  svc.actual_versions,
  svc.expected_versions
FROM submission_version_checks svc
JOIN portfolio_outputs po
  ON po.id = svc.portfolio_output_id
JOIN teams t
  ON t.id = po.team_id
WHERE svc.actual_versions IS DISTINCT FROM svc.expected_versions
ORDER BY t.team_name, po.sequence_order;

-- 18. Review linked to a missing submission row
SELECT 'review_orphan_submission' AS violation, pr.id AS review_id,
       pr.portfolio_submission_id, pr.reviewer_stage, pr.decision
FROM portfolio_reviews pr
LEFT JOIN portfolio_submissions ps ON ps.id = pr.portfolio_submission_id
WHERE ps.id IS NULL;

-- 19. Duplicate reviews per (submission, reviewer_stage)
SELECT 'duplicate_stage_reviews' AS violation, pr.portfolio_submission_id,
       pr.reviewer_stage, COUNT(*) AS review_count
FROM portfolio_reviews pr
GROUP BY pr.portfolio_submission_id, pr.reviewer_stage
HAVING COUNT(*) > 1;

-- 20. pending_admin without a valid entry path
WITH latest AS (
  SELECT DISTINCT ON (portfolio_output_id)
         id, portfolio_output_id, version_number
  FROM portfolio_submissions
  ORDER BY portfolio_output_id, version_number DESC
)
SELECT 'pending_admin_invalid_entry' AS violation,
       po.id AS portfolio_output_id, t.team_name,
       l.version_number AS latest_version, po.workflow_status
FROM portfolio_outputs po
JOIN teams t ON t.id = po.team_id
JOIN latest l ON l.portfolio_output_id = po.id
WHERE po.workflow_status = 'pending_admin'
  AND NOT EXISTS (
    SELECT 1 FROM portfolio_reviews pr
    WHERE pr.portfolio_submission_id = l.id
      AND pr.reviewer_stage = 'educator'
      AND pr.decision = 'approved'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM portfolio_submissions prev
    JOIN portfolio_reviews pr ON pr.portfolio_submission_id = prev.id
    WHERE prev.portfolio_output_id = po.id
      AND prev.version_number = l.version_number - 1
      AND pr.reviewer_stage = 'admin'
      AND pr.decision = 'revision_required'
  );

-- 21. Completed portfolio without both Educator and Admin approvals
SELECT 'completed_without_approvals' AS violation, po.id AS portfolio_output_id,
       t.team_name, po.portfolio_type, po.workflow_status
FROM portfolio_outputs po
JOIN teams t ON t.id = po.team_id
WHERE po.workflow_status = 'completed'
  AND (
    NOT EXISTS (
      SELECT 1 FROM portfolio_submissions ps
      JOIN portfolio_reviews pr ON pr.portfolio_submission_id = ps.id
      WHERE ps.portfolio_output_id = po.id
        AND pr.reviewer_stage = 'educator'
        AND pr.decision = 'approved'
    )
    OR NOT EXISTS (
      SELECT 1 FROM portfolio_submissions ps
      JOIN portfolio_reviews pr ON pr.portfolio_submission_id = ps.id
      WHERE ps.portfolio_output_id = po.id
        AND pr.reviewer_stage = 'admin'
        AND pr.decision = 'approved'
    )
  );

-- 22. Next portfolio unlocked while the previous one is not completed
SELECT 'premature_unlock' AS violation, nxt.id AS portfolio_output_id,
       t.team_name, nxt.sequence_order, nxt.workflow_status AS next_status,
       prev.workflow_status AS previous_status
FROM portfolio_outputs nxt
JOIN portfolio_outputs prev
  ON prev.team_id = nxt.team_id
 AND prev.sequence_order = nxt.sequence_order - 1
JOIN teams t ON t.id = nxt.team_id
WHERE nxt.workflow_status <> 'locked'
  AND prev.workflow_status <> 'completed';

-- 23. Stage 4 entered before all three portfolios completed
SELECT 'stage4_before_portfolios' AS violation, t.id AS team_id, t.team_name,
       t.current_stage_number
FROM teams t
WHERE t.current_stage_number >= 4
  AND EXISTS (
    SELECT 1 FROM portfolio_outputs po
    WHERE po.team_id = t.id
      AND po.workflow_status <> 'completed'
  );
