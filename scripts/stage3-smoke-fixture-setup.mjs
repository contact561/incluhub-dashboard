#!/usr/bin/env node
/**
 * Creates a disposable Stage 3 team with photography at awaiting_booking.
 * Usage: node scripts/stage3-smoke-fixture-setup.mjs --confirm-fixture
 */

import { createClient } from "@supabase/supabase-js";
import nextEnv from "@next/env";
import { assertFixtureMutationAllowed } from "./fixture-safety.mjs";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const TEAM_NAME = "STAGE3 SMOKE TEAM";
const EMAILS = {
  photo: "stage3.smoke.photo@incluhub.test",
  makeup: "stage3.smoke.makeup@incluhub.test",
  hair: "stage3.smoke.hair@incluhub.test",
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
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const parts = formatter.formatToParts(yesterday);
  return `${parts.find((p) => p.type === "year").value}-${parts.find((p) => p.type === "month").value}-${parts.find((p) => p.type === "day").value}`;
}

async function rpc(client, fn, args) {
  const { data, error } = await client.rpc(fn, args);
  if (error) throw new Error(`${fn}: ${error.message}`);
  return data;
}

async function deleteAuthUser(admin, email) {
  const { data } = await admin.auth.admin.listUsers({ perPage: 200 });
  const user = (data?.users ?? []).find(
    (row) => row.email?.toLowerCase() === email.toLowerCase()
  );
  if (user) await admin.auth.admin.deleteUser(user.id);
}

async function createStudent(admin, { email, fullName, category, instituteId, createdBy, password }) {
  await deleteAuthUser(admin, email);
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role: "student" },
  });
  if (authError || !authData.user) throw new Error(authError?.message ?? "auth create failed");
  const userId = authData.user.id;
  await admin.from("profiles").delete().eq("id", userId);
  await admin.from("profiles").insert({
    id: userId,
    full_name: fullName,
    email,
    role: "student",
    status: "active",
    created_by: createdBy,
  });
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
  if (studentError) throw new Error(studentError.message);
  return { userId, studentId: student.id };
}

async function cleanupExisting(admin) {
  const { data: team } = await admin
    .from("teams")
    .select("id")
    .eq("team_name", TEAM_NAME)
    .maybeSingle();
  if (team) {
    await admin.from("teams").delete().eq("id", team.id);
  }
  for (const email of Object.values(EMAILS)) {
    await deleteAuthUser(admin, email);
  }
}

async function main() {
  assertFixtureMutationAllowed({
    confirmationFlag: "--confirm-fixture",
    label: "Stage 3 smoke fixture setup",
  });

  const password = requireEnv("TEST_ACCOUNT_PASSWORD");
  const admin = createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false } }
  );
  const anon = createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    { auth: { persistSession: false } }
  );

  console.log(`=== ${TEAM_NAME} setup ===`);
  await cleanupExisting(admin);

  const { data: institutes } = await admin.from("institutes").select("id, name").eq("status", "active");
  const photography = institutes.find((i) => /photography/i.test(i.name));
  const makeup = institutes.find((i) => /makeup/i.test(i.name));
  const hair = institutes.find((i) => /hair/i.test(i.name));
  const { data: program } = await admin
    .from("programs")
    .select("id")
    .eq("name", "IncluHub Test Portfolio Program")
    .eq("status", "active")
    .maybeSingle();
  const { data: educators } = await admin
    .from("educators")
    .select("id, educator_type")
    .eq("status", "active");
  const { data: adminProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", "admin@incluhub.test")
    .maybeSingle();

  const photoEducator = educators.find((e) => e.educator_type === "photography_educator");
  const makeupEducator = educators.find((e) => e.educator_type === "makeup_educator");
  const hairEducator = educators.find((e) => e.educator_type === "hairstyling_educator");

  const photo = await createStudent(admin, {
    email: EMAILS.photo,
    fullName: "Stage3 Smoke Photographer",
    category: "photographer",
    instituteId: photography.id,
    createdBy: adminProfile.id,
    password,
  });
  const makeupStudent = await createStudent(admin, {
    email: EMAILS.makeup,
    fullName: "Stage3 Smoke Makeup",
    category: "makeup_artist",
    instituteId: makeup.id,
    createdBy: adminProfile.id,
    password,
  });
  const hairStudent = await createStudent(admin, {
    email: EMAILS.hair,
    fullName: "Stage3 Smoke Hair",
    category: "hairstylist",
    instituteId: hair.id,
    createdBy: adminProfile.id,
    password,
  });

  await admin.from("program_enrollments").insert([
    { program_id: program.id, student_id: photo.studentId, status: "active", created_by: adminProfile.id },
    { program_id: program.id, student_id: makeupStudent.studentId, status: "active", created_by: adminProfile.id },
    { program_id: program.id, student_id: hairStudent.studentId, status: "active", created_by: adminProfile.id },
  ]);

  await anon.auth.signInWithPassword({ email: "admin@incluhub.test", password });
  const teamId = await rpc(anon, "create_balanced_team", {
    p_team_name: TEAM_NAME,
    p_program_id: program.id,
    p_makeup_artist_student_id: makeupStudent.studentId,
    p_photographer_student_id: photo.studentId,
    p_hairstylist_student_id: hairStudent.studentId,
    p_makeup_educator_id: makeupEducator.id,
    p_photography_educator_id: photoEducator.id,
    p_hairstyling_educator_id: hairEducator.id,
  });
  await rpc(anon, "start_team_stage_journey", { p_team_id: teamId });
  await rpc(anon, "complete_bms_session", {
    p_team_id: teamId,
    p_session_date: getYesterdayInAsiaKolkata(),
    p_remarks: "Stage 3 smoke fixture",
  });
  await anon.auth.signOut();

  const { data: portfolio } = await admin
    .from("portfolio_outputs")
    .select("id, workflow_status")
    .eq("team_id", teamId)
    .eq("portfolio_type", "photographer")
    .single();

  console.log("PASS: fixture ready");
  console.log(JSON.stringify({ teamId, portfolio, emails: EMAILS }, null, 2));
}

main().catch((error) => {
  console.error("FAIL:", error.message);
  process.exit(1);
});
