#!/usr/bin/env node
/**
 * IncluHub — DEVELOPMENT-ONLY disposable Stage 3 fixture for UI-4B QA.
 *
 * Creates: UI4 QA TEAM + three dedicated students.
 * Leaves photography portfolio at awaiting_submission (booked via book_studio_slot).
 * Does NOT modify TEST TEAM ALPHA or TEST TEAM BETA.
 *
 * Usage:
 *   node scripts/ui4-qa-fixture-setup.mjs
 *
 * Cleanup:
 *   node scripts/ui4-qa-fixture-cleanup.mjs
 *
 * NEVER run against production.
 * Credentials come from environment (TEST_ACCOUNT_PASSWORD); never hardcode secrets.
 */

import { createClient } from "@supabase/supabase-js";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const TEAM_NAME = "UI4 QA TEAM";
const EMAILS = {
  photo: "ui4.photo.student@incluhub.test",
  makeup: "ui4.makeup.student@incluhub.test",
  hair: "ui4.hair.student@incluhub.test",
};

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env ${name}`);
  return value;
}

function getDateInAsiaKolkata(date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const y = parts.find((p) => p.type === "year").value;
  const m = parts.find((p) => p.type === "month").value;
  const d = parts.find((p) => p.type === "day").value;
  return `${y}-${m}-${d}`;
}

function getYesterdayInAsiaKolkata() {
  return getDateInAsiaKolkata(new Date(Date.now() - 24 * 60 * 60 * 1000));
}

function getTodayInAsiaKolkata() {
  return getDateInAsiaKolkata(new Date());
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
  console.log("=== UI-4B disposable Stage 3 fixture setup ===");
  console.log("Team:", TEAM_NAME);
  console.log("Will NOT modify TEST TEAM ALPHA or TEST TEAM BETA.");
  console.log("\nFixture plan:");
  console.log("  1. Create 3 UI4 QA students (photo/makeup/hair) + enrollments");
  console.log("  2. create_balanced_team + start_team_stage_journey + complete_bms_session");
  console.log("  3. book_studio_slot as photography student → awaiting_submission");
  console.log("  4. Leave Alpha/Beta untouched");
  console.log("");

  const password = requireEnv("TEST_ACCOUNT_PASSWORD");
  const admin = createAdmin();
  const anon = createAnon();

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

  const { data: listed } = await admin.auth.admin.listUsers({ perPage: 200 });
  for (const email of Object.values(EMAILS)) {
    const hit = (listed?.users ?? []).find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );
    if (hit) {
      throw new Error(
        `Auth user ${email} already exists. Run ui4-qa-fixture-cleanup.mjs first.`
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

  console.log("Creating three UI4 QA students…");
  const photo = await createStudent(admin, {
    email: EMAILS.photo,
    fullName: "UI4 QA Photography Student",
    category: "photographer",
    instituteId: photography.id,
    createdBy: adminProfile.id,
    password,
  });
  const makeupStudent = await createStudent(admin, {
    email: EMAILS.makeup,
    fullName: "UI4 QA Makeup Student",
    category: "makeup_artist",
    instituteId: makeup.id,
    createdBy: adminProfile.id,
    password,
  });
  const hairStudent = await createStudent(admin, {
    email: EMAILS.hair,
    fullName: "UI4 QA Hairstyling Student",
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
    p_remarks: "UI-4B disposable QA fixture BMS completion",
  });

  await anon.auth.signOut();

  const { data: photoPortfolio, error: portfolioError } = await admin
    .from("portfolio_outputs")
    .select("id, workflow_status, sequence_order, portfolio_type")
    .eq("team_id", teamId)
    .eq("portfolio_type", "photographer")
    .maybeSingle();
  if (portfolioError || !photoPortfolio) {
    throw new Error(`Photography portfolio not found: ${portfolioError?.message}`);
  }

  const bookingDate = getTodayInAsiaKolkata();
  const slotCode = "slot_15_18";
  console.log(
    `Booking studio as photography student (${bookingDate} ${slotCode})…`
  );
  const { error: studentSignInError } = await anon.auth.signInWithPassword({
    email: EMAILS.photo,
    password,
  });
  if (studentSignInError) {
    throw new Error(`Photo student sign-in failed: ${studentSignInError.message}`);
  }

  await rpcCall(anon, "book_studio_slot", {
    p_portfolio_output_id: photoPortfolio.id,
    p_booking_date: bookingDate,
    p_slot_code: slotCode,
  });
  await anon.auth.signOut();

  const { data: team } = await admin
    .from("teams")
    .select("id, team_name, current_stage_number, stage_status")
    .eq("id", teamId)
    .single();

  const { data: portfolios } = await admin
    .from("portfolio_outputs")
    .select("id, sequence_order, portfolio_type, workflow_status")
    .eq("team_id", teamId)
    .order("sequence_order");

  const { data: alphaBeta } = await admin
    .from("teams")
    .select("team_name, current_stage_number")
    .in("team_name", ["TEST TEAM ALPHA", "TEST TEAM BETA"]);

  console.log("\n=== Fixture ready ===");
  console.log(
    JSON.stringify(
      {
        team,
        portfolios,
        photoPortfolioId: photoPortfolio.id,
        alphaBetaUnchanged: alphaBeta,
      },
      null,
      2
    )
  );
  console.log("\nAccounts (password from TEST_ACCOUNT_PASSWORD):");
  console.log(" ", EMAILS.photo, "— Photography leader (expect awaiting_submission)");
  console.log(" ", EMAILS.makeup, "— Makeup (expect locked)");
  console.log(" ", EMAILS.hair, "— Hairstyling (expect locked)");
  console.log("  photo.educator@incluhub.test — assigned photo educator");
  console.log("  makeup.educator@incluhub.test — unrelated for permission denial");
  console.log("\nCleanup: node scripts/ui4-qa-fixture-cleanup.mjs");
}

main().catch((error) => {
  console.error("UI4 QA fixture setup FAILED:", error.message ?? error);
  process.exit(1);
});
