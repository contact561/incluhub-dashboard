#!/usr/bin/env node
/**
 * Create Program 1 + 3 educators + 9 students + enrollments (no teams).
 *
 *   node scripts/seed-program1-accounts.mjs --confirm-seed
 */

import { createClient } from "@supabase/supabase-js";
import nextEnv from "@next/env";
import { assertFixtureMutationAllowed } from "./fixture-safety.mjs";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const PROGRAM_NAME = "Program 1";
const PASSWORD_ENV = "TEST_ACCOUNT_PASSWORD";

const EDUCATORS = [
  {
    email: "ep@incluhub.test",
    fullName: "Photo Educator",
    educatorType: "photography_educator",
    institutePattern: /photography/i,
  },
  {
    email: "em@incluhub.test",
    fullName: "Makeup Educator",
    educatorType: "makeup_educator",
    institutePattern: /makeup/i,
  },
  {
    email: "eh@incluhub.test",
    fullName: "Hair Educator",
    educatorType: "hairstyling_educator",
    institutePattern: /hair/i,
  },
];

const STUDENTS = [
  { email: "p1@incluhub.test", fullName: "Photo Student 1", category: "photographer", institutePattern: /photography/i },
  { email: "p2@incluhub.test", fullName: "Photo Student 2", category: "photographer", institutePattern: /photography/i },
  { email: "p3@incluhub.test", fullName: "Photo Student 3", category: "photographer", institutePattern: /photography/i },
  { email: "m1@incluhub.test", fullName: "Makeup Student 1", category: "makeup_artist", institutePattern: /makeup/i },
  { email: "m2@incluhub.test", fullName: "Makeup Student 2", category: "makeup_artist", institutePattern: /makeup/i },
  { email: "m3@incluhub.test", fullName: "Makeup Student 3", category: "makeup_artist", institutePattern: /makeup/i },
  { email: "h1@incluhub.test", fullName: "Hair Student 1", category: "hairstylist", institutePattern: /hair/i },
  { email: "h2@incluhub.test", fullName: "Hair Student 2", category: "hairstylist", institutePattern: /hair/i },
  { email: "h3@incluhub.test", fullName: "Hair Student 3", category: "hairstylist", institutePattern: /hair/i },
];

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env ${name}`);
  return value;
}

function pickInstitute(institutes, pattern) {
  const match = institutes.find((row) => pattern.test(row.name));
  if (!match) throw new Error(`No active institute matching ${pattern}`);
  return match.id;
}

async function deleteAuthByEmail(admin, email) {
  const { data } = await admin.auth.admin.listUsers({ perPage: 200 });
  const user = (data?.users ?? []).find(
    (row) => row.email?.toLowerCase() === email.toLowerCase()
  );
  if (!user) return;
  await admin.from("program_enrollments").delete().eq("student_id", (
    await admin.from("students").select("id").eq("user_id", user.id).maybeSingle()
  ).data?.id ?? "00000000-0000-0000-0000-000000000000");
  await admin.from("students").delete().eq("user_id", user.id);
  await admin.from("educators").delete().eq("user_id", user.id);
  await admin.from("profiles").delete().eq("id", user.id);
  await admin.auth.admin.deleteUser(user.id);
}

async function createAuthUser(admin, { email, fullName, role }, password, createdBy) {
  await deleteAuthByEmail(admin, email);
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role },
  });
  if (error || !data.user) throw new Error(`Auth create failed for ${email}: ${error?.message}`);
  const userId = data.user.id;
  const { error: profileError } = await admin.from("profiles").insert({
    id: userId,
    full_name: fullName,
    email,
    role,
    status: "active",
    created_by: createdBy,
  });
  if (profileError) throw new Error(`Profile create failed for ${email}: ${profileError.message}`);
  return userId;
}

async function main() {
  assertFixtureMutationAllowed({
    confirmationFlag: "--confirm-seed",
    label: "Program 1 account seed",
  });

  const password = requireEnv(PASSWORD_ENV);
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const anon = createClient(url, anonKey, { auth: { persistSession: false } });

  const { data: adminProfile } = await admin
    .from("profiles")
    .select("id, email")
    .eq("email", "admin@incluhub.test")
    .maybeSingle();
  if (!adminProfile) throw new Error("admin@incluhub.test not found.");

  const { data: institutes, error: instituteError } = await admin
    .from("institutes")
    .select("id, name")
    .eq("status", "active");
  if (instituteError) throw new Error(instituteError.message);

  const photoInstituteId = pickInstitute(institutes, /^FrameLab Photography/i);
  const makeupInstituteId = pickInstitute(institutes, /^GlowCraft Makeup/i);
  const hairInstituteId = pickInstitute(institutes, /^StyleLab Hair/i);

  const instituteByPattern = (pattern) => pickInstitute(institutes, pattern);

  console.log("=== Program 1 seed (no teams) ===\n");

  const { data: existingProgram } = await admin
    .from("programs")
    .select("id")
    .eq("name", PROGRAM_NAME)
    .maybeSingle();

  let programId = existingProgram?.id ?? null;

  if (!programId) {
    const { error: signInError } = await anon.auth.signInWithPassword({
      email: "admin@incluhub.test",
      password,
    });
    if (signInError) throw new Error(signInError.message);

    const { data: newProgramId, error: programError } = await anon.rpc(
      "create_program_with_institutes",
      {
        p_name: PROGRAM_NAME,
        p_description: "Short-name test cohort for manual team creation.",
        p_start_date: null,
        p_end_date: null,
        p_status: "active",
        p_institute_ids: [photoInstituteId, makeupInstituteId, hairInstituteId],
      }
    );
    if (programError) throw new Error(programError.message);
    programId = newProgramId;
    await anon.auth.signOut();
    console.log(`Created program: ${PROGRAM_NAME} (${programId})`);
  } else {
    console.log(`Using existing program: ${PROGRAM_NAME} (${programId})`);
  }

  const educatorIds = {};
  for (const spec of EDUCATORS) {
    const userId = await createAuthUser(
      admin,
      { email: spec.email, fullName: spec.fullName, role: "educator" },
      password,
      adminProfile.id
    );
    const { data: educator, error } = await admin
      .from("educators")
      .insert({
        user_id: userId,
        institute_id: instituteByPattern(spec.institutePattern),
        educator_type: spec.educatorType,
        status: "active",
        created_by: adminProfile.id,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    educatorIds[spec.email] = educator.id;
    console.log(`Educator: ${spec.email} → ${spec.fullName}`);
  }

  const studentIds = [];
  for (const spec of STUDENTS) {
    const userId = await createAuthUser(
      admin,
      { email: spec.email, fullName: spec.fullName, role: "student" },
      password,
      adminProfile.id
    );
    const { data: student, error } = await admin
      .from("students")
      .insert({
        user_id: userId,
        institute_id: instituteByPattern(spec.institutePattern),
        student_category: spec.category,
        payment_status: "not_required",
        status: "active",
        current_stage_number: 0,
        created_by: adminProfile.id,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    studentIds.push(student.id);
    console.log(`Student: ${spec.email} → ${spec.fullName}`);
  }

  const enrollmentRows = studentIds.map((studentId) => ({
    program_id: programId,
    student_id: studentId,
    status: "active",
    created_by: adminProfile.id,
  }));

  for (const row of enrollmentRows) {
    await admin
      .from("program_enrollments")
      .delete()
      .eq("program_id", row.program_id)
      .eq("student_id", row.student_id);
  }

  const { error: enrollError } = await admin.from("program_enrollments").insert(enrollmentRows);
  if (enrollError) throw new Error(enrollError.message);

  console.log("\n=== Done ===");
  console.log(`Program: ${PROGRAM_NAME}`);
  console.log(`Password (all accounts): ${password}`);
  console.log("\nEducators (use when creating each team):");
  console.log("  ep@incluhub.test  — Photo Educator");
  console.log("  em@incluhub.test  — Makeup Educator");
  console.log("  eh@incluhub.test  — Hair Educator");
  console.log("\nStudents (Team 1 = p1+m1+h1, Team 2 = p2+m2+h2, Team 3 = p3+m3+h3):");
  console.log("  p1 p2 p3  — photographers");
  console.log("  m1 m2 m3  — makeup artists");
  console.log("  h1 h2 h3  — hairstylists");
  console.log("\nEnrolled in Program 1. Create teams in Admin when ready.");
}

main().catch((error) => {
  console.error("SEED FAILED:", error.message);
  process.exit(1);
});
