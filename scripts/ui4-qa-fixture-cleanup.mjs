#!/usr/bin/env node
/**
 * IncluHub — DEVELOPMENT-ONLY cleanup for UI-4B disposable Stage 3 fixture.
 *
 * Removes only UI4 QA TEAM and its three dedicated students/auth users.
 * Does NOT modify TEST TEAM ALPHA or TEST TEAM BETA.
 *
 * Usage:
 *   node scripts/ui4-qa-fixture-cleanup.mjs
 *
 * NEVER run against production.
 */

import { createClient } from "@supabase/supabase-js";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const TEAM_NAME = "UI4 QA TEAM";
const EMAILS = [
  "ui4.photo.student@incluhub.test",
  "ui4.makeup.student@incluhub.test",
  "ui4.hair.student@incluhub.test",
];

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env ${name}`);
  return value;
}

function createAdmin() {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false } }
  );
}

async function deleteByEq(admin, table, column, values) {
  if (!values.length) return;
  const { error } = await admin.from(table).delete().in(column, values);
  if (error) throw new Error(`Delete ${table} failed: ${error.message}`);
}

async function main() {
  console.log("=== UI-4B disposable fixture cleanup ===");
  console.log("Target team:", TEAM_NAME);
  console.log("Will NOT modify TEST TEAM ALPHA or TEST TEAM BETA.");

  const admin = createAdmin();

  const { data: team } = await admin
    .from("teams")
    .select("id")
    .eq("team_name", TEAM_NAME)
    .maybeSingle();

  if (team?.id) {
    const teamId = team.id;
    console.log("Found team", teamId);

    const { data: portfolios } = await admin
      .from("portfolio_outputs")
      .select("id")
      .eq("team_id", teamId);
    const portfolioIds = (portfolios ?? []).map((p) => p.id);

    let submissionIds = [];
    if (portfolioIds.length) {
      const { data: submissions } = await admin
        .from("portfolio_submissions")
        .select("id")
        .in("portfolio_output_id", portfolioIds);
      submissionIds = (submissions ?? []).map((s) => s.id);
    }

    if (submissionIds.length) {
      await deleteByEq(admin, "portfolio_reviews", "portfolio_submission_id", submissionIds);
      await deleteByEq(admin, "portfolio_submissions", "id", submissionIds);
    }
    if (portfolioIds.length) {
      await deleteByEq(admin, "studio_bookings", "portfolio_output_id", portfolioIds);
      await deleteByEq(admin, "portfolio_participants", "portfolio_output_id", portfolioIds);
      await deleteByEq(admin, "portfolio_outputs", "id", portfolioIds);
    }

    await deleteByEq(admin, "team_stage_progress", "team_id", [teamId]);
    await deleteByEq(admin, "team_educators", "team_id", [teamId]);
    await deleteByEq(admin, "team_members", "team_id", [teamId]);
    await deleteByEq(admin, "teams", "id", [teamId]);
    console.log("Removed team graph for", TEAM_NAME);
  } else {
    console.log("No team named", TEAM_NAME, "— continuing with user cleanup.");
  }

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, email")
    .in("email", EMAILS);
  const userIds = (profiles ?? []).map((p) => p.id);

  if (userIds.length) {
    const { data: students } = await admin
      .from("students")
      .select("id")
      .in("user_id", userIds);
    const studentIds = (students ?? []).map((s) => s.id);

    if (studentIds.length) {
      await deleteByEq(admin, "program_enrollments", "student_id", studentIds);
      await admin
        .from("students")
        .update({ current_team_id: null })
        .in("id", studentIds);
      await deleteByEq(admin, "students", "id", studentIds);
    }

    await deleteByEq(admin, "profiles", "id", userIds);

    for (const userId of userIds) {
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) {
        console.warn(`Auth delete warning for ${userId}: ${error.message}`);
      }
    }
    console.log("Removed", userIds.length, "UI4 QA auth users/profiles/students.");
  } else {
    console.log("No UI4 QA profiles found.");
  }

  const { data: alphaBeta } = await admin
    .from("teams")
    .select("team_name, current_stage_number")
    .in("team_name", ["TEST TEAM ALPHA", "TEST TEAM BETA"]);

  const { data: remainingQa } = await admin
    .from("teams")
    .select("id")
    .eq("team_name", TEAM_NAME);

  console.log("\n=== Cleanup complete ===");
  console.log("Alpha/Beta unchanged:", JSON.stringify(alphaBeta, null, 2));
  console.log("UI4 QA TEAM remaining:", remainingQa?.length ?? 0);
}

main().catch((error) => {
  console.error("UI4 QA fixture cleanup FAILED:", error.message ?? error);
  process.exit(1);
});
