-- ============================================================================
-- 003_fixture_state_audit.sql
-- Read-only snapshot of the current test fixture state.
-- Never prints passwords, tokens, or secrets (emails only).
--
-- Schema columns validated against local migrations and src/types/database.ts.
-- Repaired 2026-07-14: teams.team_name, students.student_category,
-- team_members.member_status, studio_bookings via studio_slot_occupancy.
--
-- SAFETY: SELECT-only.
-- ============================================================================

-- 1. All test accounts (profiles for @incluhub.test)
SELECT 'test_accounts' AS section, p.email, p.role, p.full_name, p.status
FROM profiles p
WHERE p.email LIKE '%@incluhub.test'
ORDER BY p.role, p.email;

-- 2. Institutes
SELECT 'institutes' AS section, id, name, status
FROM institutes
ORDER BY name;

-- 3. Programs and institute links
SELECT 'programs' AS section, pr.id, pr.name, pr.status,
       array_agg(i.name ORDER BY i.name) AS institutes
FROM programs pr
LEFT JOIN program_institutes pi ON pi.program_id = pr.id
LEFT JOIN institutes i ON i.id = pi.institute_id
GROUP BY pr.id, pr.name, pr.status
ORDER BY pr.name;

-- 4. Program enrolments
SELECT 'program_enrollments' AS section, pr.name AS program,
       p.email AS student_email, pe.status, pe.enrolled_at
FROM program_enrollments pe
JOIN programs pr ON pr.id = pe.program_id
JOIN students s ON s.id = pe.student_id
JOIN profiles p ON p.id = s.user_id
ORDER BY pr.name, p.email;

-- 5. Teams with stage
SELECT 'teams' AS section, t.id, t.team_name, t.status,
       t.current_stage_number, t.stage_status
FROM teams t
ORDER BY t.team_name;

-- 6. Team members with category
SELECT 'team_members' AS section, t.team_name AS team,
       p.email AS student_email, tm.student_category, tm.member_status
FROM team_members tm
JOIN teams t ON t.id = tm.team_id
JOIN students s ON s.id = tm.student_id
JOIN profiles p ON p.id = s.user_id
ORDER BY t.team_name, tm.student_category;

-- 7. Educator mappings (team_educators.student_id = mapped discipline leader)
SELECT 'team_educators' AS section, t.team_name AS team,
       pe.email AS educator_email,
       ps.email AS mapped_student_email,
       te.educator_type, te.status
FROM team_educators te
JOIN teams t ON t.id = te.team_id
JOIN educators e ON e.id = te.educator_id
JOIN profiles pe ON pe.id = e.user_id
JOIN students s ON s.id = te.student_id
JOIN profiles ps ON ps.id = s.user_id
ORDER BY t.team_name, pe.email;

-- 8. Portfolio statuses
SELECT 'portfolio_outputs' AS section, t.team_name AS team, po.sequence_order,
       po.portfolio_type, po.workflow_status, po.revision_return_to,
       pl.email AS leader_email
FROM portfolio_outputs po
JOIN teams t ON t.id = po.team_id
JOIN students ls ON ls.id = po.leader_student_id
JOIN profiles pl ON pl.id = ls.user_id
ORDER BY t.team_name, po.sequence_order;

-- 9. Studio bookings (date/slot from studio_slot_occupancy)
SELECT 'studio_bookings' AS section, t.team_name AS team, po.portfolio_type,
       sso.booking_date, sso.slot_code, sb.booked_at
FROM studio_bookings sb
JOIN studio_slot_occupancy sso ON sso.id = sb.occupancy_id
JOIN portfolio_outputs po ON po.id = sb.portfolio_output_id
JOIN teams t ON t.id = po.team_id
ORDER BY t.team_name, sso.booking_date, sso.slot_code;

-- 10. Submissions per portfolio
SELECT 'portfolio_submissions' AS section, t.team_name AS team,
       po.portfolio_type, ps.version_number, ps.title, ps.created_at
FROM portfolio_submissions ps
JOIN portfolio_outputs po ON po.id = ps.portfolio_output_id
JOIN teams t ON t.id = po.team_id
ORDER BY t.team_name, po.sequence_order, ps.version_number;

-- 11. Reviews per submission
SELECT 'portfolio_reviews' AS section, t.team_name AS team, po.portfolio_type,
       ps.version_number, pr.reviewer_stage, pr.decision, pr.created_at
FROM portfolio_reviews pr
JOIN portfolio_submissions ps ON ps.id = pr.portfolio_submission_id
JOIN portfolio_outputs po ON po.id = ps.portfolio_output_id
JOIN teams t ON t.id = po.team_id
ORDER BY t.team_name, po.sequence_order, ps.version_number, pr.reviewer_stage;

-- 12. Stage progress per team
SELECT 'team_stage_progress' AS section, t.team_name AS team,
       tsp.stage_number, tsp.status, tsp.started_at, tsp.completed_at
FROM team_stage_progress tsp
JOIN teams t ON t.id = tsp.team_id
ORDER BY t.team_name, tsp.stage_number;
