#!/usr/bin/env node
/**
 * Purge all teams, students, educators, and workflow data.
 * Keeps ONE admin account (default: admin@incluhub.test).
 *
 * Usage:
 *   node scripts/reset/purge-keep-admin-only.mjs --confirm-purge
 *   node scripts/reset/purge-keep-admin-only.mjs --confirm-purge --keep-email you@example.com
 *
 * Keeps: institutes, programs, program_institutes (reference catalog).
 * NEVER run against production.
 */

import { createClient } from "@supabase/supabase-js";
import nextEnv from "@next/env";
import { assertFixtureMutationAllowed } from "../fixtures/fixture-safety.mjs";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const DEFAULT_KEEP_EMAIL = "admin@incluhub.test";

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

async function deleteAllRows(admin, table) {
  const { error, count } = await admin
    .from(table)
    .delete({ count: "exact" })
    .neq("id", "00000000-0000-0000-0000-000000000000");
  if (error) {
    if (/Could not find the table|schema cache/i.test(error.message)) {
      return 0;
    }
    throw new Error(`Delete ${table}: ${error.message}`);
  }
  return count ?? 0;
}

async function listAllAuthUsers(admin) {
  const users = [];
  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    users.push(...(data?.users ?? []));
    if ((data?.users ?? []).length < 200) break;
    page += 1;
  }
  return users;
}

async function main() {
  assertFixtureMutationAllowed({
    confirmationFlag: "--confirm-purge",
    label: "Admin-only database purge",
  });

  const keepEmailArg = process.argv.find((arg) => arg.startsWith("--keep-email="));
  const keepEmail = keepEmailArg
    ? keepEmailArg.slice("--keep-email=".length).trim().toLowerCase()
    : DEFAULT_KEEP_EMAIL;

  const admin = createAdmin();
  const report = {};

  const { data: keepProfile, error: keepError } = await admin
    .from("profiles")
    .select("id, email, full_name, role")
    .ilike("email", keepEmail)
    .maybeSingle();

  if (keepError) throw new Error(keepError.message);
  if (!keepProfile || keepProfile.role !== "admin") {
    throw new Error(
      `Keep target ${keepEmail} was not found as an active admin profile. Create or fix it first.`
    );
  }

  console.log("=== Purge: keep admin only ===");
  console.log(`Keeping admin: ${keepProfile.email} (${keepProfile.full_name})`);
  console.log("Removing: all teams, students, educators, workflow data, other users.\n");

  const deleteTables = [
    "notification_recipients",
    "notifications",
    "brand_work_submission_files",
    "brand_work_submissions",
    "brand_opportunity_files",
    "brand_opportunities",
    "portfolio_reviews",
    "portfolio_submissions",
    "studio_bookings",
    "portfolio_approvals",
    "portfolio_participants",
    "portfolio_outputs",
    "studio_slot_occupancy",
    "team_stage_progress",
    "team_educators",
    "team_members",
    "teams",
    "program_enrollments",
    "project_approvals",
    "project_assignments",
    "projects",
    "students",
    "educators",
    "external_members",
    "activity_logs",
  ];

  for (const table of deleteTables) {
    report[table] = await deleteAllRows(admin, table);
    if (report[table] > 0) console.log(`  deleted ${table}: ${report[table]}`);
  }

  const { data: otherProfiles, error: profilesError } = await admin
    .from("profiles")
    .select("id, email, role")
    .neq("id", keepProfile.id);
  if (profilesError) throw new Error(profilesError.message);

  const removeProfileIds = (otherProfiles ?? []).map((row) => row.id);
  if (removeProfileIds.length) {
    const { error } = await admin.from("profiles").delete().in("id", removeProfileIds);
    if (error) throw new Error(`Delete profiles: ${error.message}`);
    report.profiles = removeProfileIds.length;
    console.log(`  deleted profiles: ${removeProfileIds.length}`);
  }

  const authUsers = await listAllAuthUsers(admin);
  let deletedAuth = 0;
  for (const user of authUsers) {
    if (user.id === keepProfile.id) continue;
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) {
      console.warn(`  auth delete warning ${user.email}: ${error.message}`);
      continue;
    }
    deletedAuth += 1;
  }
  report.auth_users = deletedAuth;
  console.log(`  deleted auth users: ${deletedAuth}`);

  const { count: teamCount } = await admin
    .from("teams")
    .select("id", { count: "exact", head: true });
  const { count: studentCount } = await admin
    .from("students")
    .select("id", { count: "exact", head: true });
  const { count: educatorCount } = await admin
    .from("educators")
    .select("id", { count: "exact", head: true });
  const { count: profileCount } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true });

  console.log("\n=== After purge ===");
  console.log(`teams: ${teamCount ?? 0}`);
  console.log(`students: ${studentCount ?? 0}`);
  console.log(`educators: ${educatorCount ?? 0}`);
  console.log(`profiles: ${profileCount ?? 0}`);
  console.log(`remaining admin: ${keepProfile.email}`);
  console.log("\nInstitutes and programs were kept (empty catalog is ready for new users).");
  console.log("Log in with the kept admin to create students, educators, and teams.");
}

main().catch((error) => {
  console.error("\nPURGE FAILED:", error.message);
  process.exit(1);
});
