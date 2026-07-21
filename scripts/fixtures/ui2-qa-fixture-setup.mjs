#!/usr/bin/env node
/**
 * IncluHub — DEVELOPMENT-ONLY disposable Stage 3 fixture for UI-2B QA.
 *
 * Creates: UI2 QA TEAM + three dedicated students.
 * Does NOT modify TEST TEAM ALPHA or TEST TEAM BETA.
 *
 * Usage:
 *   node scripts/fixtures/ui2-qa-fixture-setup.mjs
 *
 * Cleanup:
 *   node scripts/fixtures/ui2-qa-fixture-cleanup.mjs
 *
 * NEVER run against production.
 */

import { createClient } from "@supabase/supabase-js";
import nextEnv from "@next/env";
import { assertFixtureMutationAllowed } from "./fixture-safety.mjs";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const TEAM_NAME = "UI2 QA TEAM";
const EMAILS = {
  photo: "ui2.photo.student@incluhub.test",
  makeup: "ui2.makeup.student@incluhub.test",
  hair: "ui2.hair.student@incluhub.test",
};

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env ${name}`);
  return value;
}

function getYesterdayInAsiaKolkata() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const y = parts.find((p) => p.type === "year").value;
  const m = parts.find((p) => p.type === "month").value;
  const d = parts.find((p) => p.type === "day").value;
  return `${y}-${m}-${d}`;
}

function createAdmin() {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false } }
  );
}

function createAnon() {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    { auth: { persistSession: false } }
  );
}

async function rpcCall(client, fn, args) {
  const { data, error } = await client.rpc(fn, args);
  if (error) throw new Error(`${fn} failed: ${error.message}`);
  return data;
}

async function createStudent(admin, { email, fullName, category, instituteId, createdBy, password }) {
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role: "student" },
  });
  if (authError || !authData.user) {
    throw new Error(`Auth create failed for ${email}: ${authError?.message}`);
  }
  const userId = authData.user.id;

  const { error: profileError } = await admin.from("profiles").insert({
    id: userId,
    full_name: fullName,
    email,
    phone: null,
    role: "student",
    status: "active",
    created_by: createdBy,
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(userId);
    throw new Error(`Profile create failed for ${email}: ${profileError.message}`);
  }

  const { data: student, error: studentError } = await admin
    .from("students")
    .insert({
      user_id: userId,
      institute_id: instituteId,
      student_category: category,
      payment_status: "not_required",
      status: "active",
      current_stage_number: 0,
      created_by: createdBy,
    })
    .select("id")
    .single();
  if (studentError) {
    await admin.from("profiles").delete().eq("id", userId);
    await admin.auth.admin.deleteUser(userId);
    throw new Error(`Student create failed for ${email}: ${studentError.message}`);
  }

  return { userId, studentId: student.id };
}

async function main() {
  assertFixtureMutationAllowed({
    confirmationFlag: "--confirm-fixture",
    label: "UI2 QA fixture setup",
  });
  console.log("=== UI-2B disposable Stage 3 fixture setup ===");
  console.log("Team:", TEAM_NAME);
  console.log("Will NOT modify TEST TEAM ALPHA or TEST TEAM BETA.");

  const password = requireEnv("TEST_ACCOUNT_PASSWORD");
  const admin = createAdmin();
  const anon = createAnon();

  // Guard: refuse if Alpha/Beta staging would be confused — only check existence
  const { data: existingQa } = await admin
    .from("teams")
    .select("id, team_name")
    .eq("team_name", TEAM_NAME)
    .maybeSingle();
  if (existingQa) {
    throw new Error(
      `${TEAM_NAME} already exists (id=${existingQa.id}). Run cleanup first.`
    );
  }

  for (const email of Object.values(EMAILS)) {
    const { data: existingAuth } = await admin.auth.admin.listUsers({ perPage: 200 });
    const hit = (existingAuth?.users ?? []).find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );
    if (hit) {
      throw new Error(
        `Auth user ${email} already exists. Run ui2-qa-fixture-cleanup.mjs first.`
      );
    }
  }

  const { data: institutes, error: instituteError } = await admin
    .from("institutes")
    .select("id, name, address")
    .eq("status", "active");
  if (instituteError) throw new Error(instituteError.message);

  const photography = institutes.find((i) => /photography/i.test(i.name));
  const makeup = institutes.find((i) => /makeup/i.test(i.name));
  const hair = institutes.find((i) => /hair/i.test(i.name));
  if (!photography || !makeup || !hair) {
    throw new Error("Required test institutes not found (photography/makeup/hair).");
  }

  const { data: program, error: programError } = await admin
    .from("programs")
    .select("id, name")
    .eq("name", "IncluHub Test Portfolio Program")
    .eq("status", "active")
    .maybeSingle();
  if (programError || !program) {
    throw new Error("IncluHub Test Portfolio Program not found.");
  }

  const { data: educators, error: educatorError } = await admin
    .from("educators")
    .select("id, educator_type, status, user_id")
    .eq("status", "active");
  if (educatorError) throw new Error(educatorError.message);

  const photoEducator = educators.find((e) => e.educator_type === "photography_educator");
  const makeupEducator = educators.find((e) => e.educator_type === "makeup_educator");
  const hairEducator = educators.find((e) => e.educator_type === "hairstyling_educator");
  if (!photoEducator || !makeupEducator || !hairEducator) {
    throw new Error("Required test educators not found.");
  }

  const { data: adminProfile, error: adminProfileError } = await admin
    .from("profiles")
    .select("id")
    .eq("email", "admin@incluhub.test")
    .maybeSingle();
  if (adminProfileError || !adminProfile) {
    throw new Error("admin@incluhub.test profile not found.");
  }

  console.log("Creating three UI2 QA students…");
  const photo = await createStudent(admin, {
    email: EMAILS.photo,
    fullName: "UI2 QA Photography Student",
    category: "photographer",
    instituteId: photography.id,
    createdBy: adminProfile.id,
    password,
  });
  const makeupStudent = await createStudent(admin, {
    email: EMAILS.makeup,
    fullName: "UI2 QA Makeup Student",
    category: "makeup_artist",
    instituteId: makeup.id,
    createdBy: adminProfile.id,
    password,
  });
  const hairStudent = await createStudent(admin, {
    email: EMAILS.hair,
    fullName: "UI2 QA Hairstyling Student",
    category: "hairstylist",
    instituteId: hair.id,
    createdBy: adminProfile.id,
    password,
  });

  console.log("Enrolling students in program…");
  const { error: enrollError } = await admin.from("program_enrollments").insert([
    {
      program_id: program.id,
      student_id: photo.studentId,
      status: "active",
      created_by: adminProfile.id,
    },
    {
      program_id: program.id,
      student_id: makeupStudent.studentId,
      status: "active",
      created_by: adminProfile.id,
    },
    {
      program_id: program.id,
      student_id: hairStudent.studentId,
      status: "active",
      created_by: adminProfile.id,
    },
  ]);
  if (enrollError) throw new Error(`Enrollment failed: ${enrollError.message}`);

  console.log("Signing in as Admin for team RPCs…");
  const { error: signInError } = await anon.auth.signInWithPassword({
    email: "admin@incluhub.test",
    password,
  });
  if (signInError) throw new Error(`Admin sign-in failed: ${signInError.message}`);

  console.log(`Creating ${TEAM_NAME} via create_balanced_team…`);
  const teamId = await rpcCall(anon, "create_balanced_team", {
    p_team_name: TEAM_NAME,
    p_program_id: program.id,
    p_makeup_artist_student_id: makeupStudent.studentId,
    p_photographer_student_id: photo.studentId,
    p_hairstylist_student_id: hairStudent.studentId,
    p_makeup_educator_id: makeupEducator.id,
    p_photography_educator_id: photoEducator.id,
    p_hairstyling_educator_id: hairEducator.id,
  });

  console.log("Starting stage journey…");
  await rpcCall(anon, "start_team_stage_journey", { p_team_id: teamId });

  const bmsDate = getYesterdayInAsiaKolkata();
  console.log(`Completing BMS session (${bmsDate})…`);
  await rpcCall(anon, "complete_bms_session", {
    p_team_id: teamId,
    p_session_date: bmsDate,
    p_remarks: "UI-2B disposable QA fixture BMS completion",
  });

  await anon.auth.signOut();

  const { data: team } = await admin
    .from("teams")
    .select("id, team_name, current_stage_number, stage_status")
    .eq("id", teamId)
    .single();

  const { data: portfolios } = await admin
    .from("portfolio_outputs")
    .select("sequence_order, portfolio_type, workflow_status")
    .eq("team_id", teamId)
    .order("sequence_order");

  // Verify Alpha/Beta untouched
  const { data: alphaBeta } = await admin
    .from("teams")
    .select("team_name, current_stage_number")
    .in("team_name", ["TEST TEAM ALPHA", "TEST TEAM BETA"]);

  console.log("\n=== Fixture ready ===");
  console.log(JSON.stringify({ team, portfolios, alphaBetaUnchanged: alphaBeta }, null, 2));
  console.log("\nAccounts (password from TEST_ACCOUNT_PASSWORD):");
  console.log(" ", EMAILS.photo, "— Photography leader (expect awaiting_booking)");
  console.log(" ", EMAILS.makeup, "— Makeup (expect locked)");
  console.log(" ", EMAILS.hair, "— Hairstyling (expect locked)");
  console.log("\nCleanup: node scripts/fixtures/ui2-qa-fixture-cleanup.mjs");
}

main().catch((error) => {
  console.error("UI2 QA fixture setup FAILED:", error.message ?? error);
  process.exit(1);
});
