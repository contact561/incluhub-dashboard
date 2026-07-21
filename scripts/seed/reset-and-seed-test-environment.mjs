#!/usr/bin/env node
/**
 * IncluHub — DEVELOPMENT-ONLY test database reset and seed utility.
 *
 * Dry-run (default):
 *   npm run test:reset
 *
 * Destructive reset + seed:
 *   npm run test:reset -- --confirm-reset
 *
 * NEVER run against production.
 */

import { createClient } from "@supabase/supabase-js";
import nextEnv from "@next/env";
import {
  mkdir,
  writeFile,
} from "fs/promises";
import { resolve } from "path";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const CONFIRM_FLAG = "--confirm-reset";
const confirmReset = process.argv.includes(CONFIRM_FLAG);

const INSTITUTES = [
  {
    key: "photography",
    name: "FrameLab Photography Institute",
    address: "Discipline: Photography",
  },
  {
    key: "makeup",
    name: "GlowCraft Makeup Academy",
    address: "Discipline: Makeup",
  },
  {
    key: "hairstyling",
    name: "StyleLab Hair Academy",
    address: "Discipline: Hairstyling",
  },
];

const ACCOUNT_SPECS = [
  {
    key: "admin",
    email: "admin@incluhub.test",
    displayName: "IncluHub Test Admin",
    role: "admin",
    instituteKey: null,
    studentCategory: null,
    educatorType: null,
    team: null,
    expectedState: "Platform administrator for all test fixtures",
  },
  {
    key: "photoEducator",
    email: "photo.educator@incluhub.test",
    displayName: "Test Photography Educator",
    role: "educator",
    instituteKey: "photography",
    studentCategory: null,
    educatorType: "photography_educator",
    team: null,
    expectedState: "Mapped to Photography Student 1 and 2; Team Alpha review queue for Photography",
  },
  {
    key: "makeupEducator",
    email: "makeup.educator@incluhub.test",
    displayName: "Test Makeup Educator",
    role: "educator",
    instituteKey: "makeup",
    studentCategory: null,
    educatorType: "makeup_educator",
    team: null,
    expectedState: "Mapped to Makeup Student 1 and 2; Team Beta review queue for Makeup",
  },
  {
    key: "hairEducator",
    email: "hair.educator@incluhub.test",
    displayName: "Test Hairstyling Educator",
    role: "educator",
    instituteKey: "hairstyling",
    studentCategory: null,
    educatorType: "hairstyling_educator",
    team: null,
    expectedState: "Two mapped students, two teams, zero pending reviews",
  },
  {
    key: "photoStudent1",
    email: "photo.student1@incluhub.test",
    displayName: "Test Photography Student 1",
    role: "student",
    instituteKey: "photography",
    studentCategory: "photographer",
    educatorType: null,
    team: "TEST TEAM ALPHA",
    expectedState: "Team Alpha Photography leader; pending_educator",
  },
  {
    key: "photoStudent2",
    email: "photo.student2@incluhub.test",
    displayName: "Test Photography Student 2",
    role: "student",
    instituteKey: "photography",
    studentCategory: "photographer",
    educatorType: null,
    team: "TEST TEAM BETA",
    expectedState: "Team Beta Photography completed",
  },
  {
    key: "makeupStudent1",
    email: "makeup.student1@incluhub.test",
    displayName: "Test Makeup Student 1",
    role: "student",
    instituteKey: "makeup",
    studentCategory: "makeup_artist",
    educatorType: null,
    team: "TEST TEAM ALPHA",
    expectedState: "Team Alpha Makeup locked",
  },
  {
    key: "makeupStudent2",
    email: "makeup.student2@incluhub.test",
    displayName: "Test Makeup Student 2",
    role: "student",
    instituteKey: "makeup",
    studentCategory: "makeup_artist",
    educatorType: null,
    team: "TEST TEAM BETA",
    expectedState: "Team Beta Makeup pending_educator",
  },
  {
    key: "hairStudent1",
    email: "hair.student1@incluhub.test",
    displayName: "Test Hairstyling Student 1",
    role: "student",
    instituteKey: "hairstyling",
    studentCategory: "hairstylist",
    educatorType: null,
    team: "TEST TEAM ALPHA",
    expectedState: "Team Alpha Hairstyling locked",
  },
  {
    key: "hairStudent2",
    email: "hair.student2@incluhub.test",
    displayName: "Test Hairstyling Student 2",
    role: "student",
    instituteKey: "hairstyling",
    studentCategory: "hairstylist",
    educatorType: null,
    team: "TEST TEAM BETA",
    expectedState: "Team Beta Hairstyling locked",
  },
];

const BACKUP_TABLES = [
  "profiles",
  "institutes",
  "programs",
  "program_institutes",
  "program_enrollments",
  "educators",
  "students",
  "teams",
  "team_members",
  "team_educators",
  "team_stage_progress",
  "studio_bookings",
  "portfolio_outputs",
  "portfolio_submissions",
  "portfolio_reviews",
];

const DELETE_STEPS = [
  { table: "notification_recipients", label: "notification_recipients" },
  { table: "notifications", label: "notifications" },
  { table: "project_approvals", label: "project_approvals" },
  { table: "project_assignments", label: "project_assignments" },
  { table: "projects", label: "projects" },
  { table: "portfolio_reviews", label: "portfolio_reviews" },
  { table: "portfolio_submissions", label: "portfolio_submissions" },
  { table: "studio_bookings", label: "studio_bookings" },
  { table: "portfolio_approvals", label: "portfolio_approvals" },
  { table: "portfolio_participants", label: "portfolio_participants" },
  { table: "portfolio_outputs", label: "portfolio_outputs" },
  { table: "studio_slot_occupancy", label: "studio_slot_occupancy" },
  { table: "team_stage_progress", label: "team_stage_progress" },
  { table: "team_educators", label: "team_educators" },
  { table: "team_members", label: "team_members" },
  { table: "teams", label: "teams" },
  { table: "program_enrollments", label: "program_enrollments" },
  { table: "program_institutes", label: "program_institutes" },
  { table: "programs", label: "programs" },
  { table: "students", label: "students" },
  { table: "educators", label: "educators" },
  { table: "external_members", label: "external_members" },
  { table: "activity_logs", label: "activity_logs" },
  { table: "institutes", label: "institutes" },
  { table: "profiles", label: "profiles" },
];

const REPORT = {
  safety: null,
  projectRef: null,
  beforeCounts: {},
  backupPath: null,
  deletedAuthUsers: 0,
  deletedTables: {},
  loginResults: [],
  assertions: [],
};

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function maskProjectRef(ref) {
  if (!ref || ref.length <= 8) return "****";
  return `${ref.slice(0, 4)}****${ref.slice(-4)}`;
}

function extractProjectRef(url) {
  try {
    const hostname = new URL(url).hostname;
    const ref = hostname.split(".")[0];
    if (!ref) throw new Error("Could not parse project ref from URL.");
    return ref;
  } catch {
    throw new Error("Invalid NEXT_PUBLIC_SUPABASE_URL.");
  }
}

function assertEnv(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

function looksLikeProductionUrl(url, projectRef) {
  const lower = url.toLowerCase();
  const blockedPatterns = [
    "production",
    "-prod.",
    ".prod.",
    "prod.supabase",
  ];
  if (blockedPatterns.some((pattern) => lower.includes(pattern))) {
    return true;
  }
  const documentedProductionRef = process.env.PRODUCTION_SUPABASE_PROJECT_REF;
  if (documentedProductionRef && projectRef === documentedProductionRef.trim()) {
    return true;
  }
  return false;
}

function getDateInTimeZone(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error(`Could not format date for timezone ${timeZone}.`);
  }

  return `${year}-${month}-${day}`;
}

const ASIA_KOLKATA = "Asia/Kolkata";

function getTodayInAsiaKolkata() {
  return getDateInTimeZone(new Date(), ASIA_KOLKATA);
}

function getYesterdayInAsiaKolkata() {
  return getDateInTimeZone(
    new Date(Date.now() - 24 * 60 * 60 * 1000),
    ASIA_KOLKATA
  );
}

function compareIsoDates(left, right) {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

function assertBmsSessionDateValid(bmsSessionDate, todayInAsiaKolkata) {
  if (compareIsoDates(bmsSessionDate, todayInAsiaKolkata) > 0) {
    throw new Error(
      `Script pre-check failed: bmsSessionDate (${bmsSessionDate}) must be <= today in Asia/Kolkata (${todayInAsiaKolkata}).`
    );
  }
}

function logStep(message) {
  console.log(`→ ${message}`);
}

function createServiceClient(url, serviceRoleKey) {
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function createAuthClient(url, anonKey) {
  return createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function countTable(admin, table) {
  const { count, error } = await admin
    .from(table)
    .select("*", { count: "exact", head: true });
  if (error) {
    if (/Could not find the table|schema cache/i.test(error.message)) {
      return 0;
    }
    throw new Error(`Count failed for ${table}: ${error.message}`);
  }
  return count ?? 0;
}

async function listAllAuthUsers(admin) {
  const users = [];
  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`Auth listUsers failed: ${error.message}`);
    users.push(...(data.users ?? []));
    if ((data.users ?? []).length < 200) break;
    page += 1;
  }
  return users;
}

async function collectCurrentCounts(admin) {
  const authUsers = await listAllAuthUsers(admin);
  return {
    authUsers: authUsers.length,
    profiles: await countTable(admin, "profiles"),
    institutes: await countTable(admin, "institutes"),
    educators: await countTable(admin, "educators"),
    students: await countTable(admin, "students"),
    teams: await countTable(admin, "teams"),
  };
}

function printDryRunSummary(projectRef, counts) {
  console.log("");
  console.log("=== DRY RUN — no data will be deleted ===");
  console.log(`Target project ref: ${maskProjectRef(projectRef)}`);
  console.log("");
  console.log("Current counts:");
  console.log(`  auth users:  ${counts.authUsers}`);
  console.log(`  profiles:    ${counts.profiles}`);
  console.log(`  institutes:  ${counts.institutes}`);
  console.log(`  educators:   ${counts.educators}`);
  console.log(`  students:    ${counts.students}`);
  console.log(`  teams:       ${counts.teams}`);
  console.log("");
  console.log("Will create after reset:");
  console.log("  10 auth accounts (1 admin, 3 educators, 6 students)");
  console.log("  3 institutes, 1 multi-institute program, 2 cross-institute teams");
  console.log("  Team Alpha → Photography pending_educator (v1 submission, no reviews)");
  console.log("  Team Beta  → Photography completed, Makeup pending_educator");
  console.log("");
  console.log("Seed workflow dates (Asia/Kolkata):");
  console.log(`  bmsSessionDate (complete_bms_session): ${getYesterdayInAsiaKolkata()}`);
  console.log(`  studioBookingDate (book_studio_slot):    ${getTodayInAsiaKolkata()}`);
  console.log("");
  console.log("To execute destructive reset + seed:");
  console.log("  npm run test:reset -- --confirm-reset");
}

async function exportBackup(admin, backupPath) {
  const snapshot = {
    exportedAt: new Date().toISOString(),
    tables: {},
    authUsers: [],
  };

  for (const table of BACKUP_TABLES) {
    const { data, error } = await admin.from(table).select("*");
    if (error) {
      if (/Could not find the table|schema cache/i.test(error.message)) {
        snapshot.tables[table] = [];
        continue;
      }
      throw new Error(`Backup failed for ${table}: ${error.message}`);
    }
    snapshot.tables[table] = data ?? [];
  }

  const authUsers = await listAllAuthUsers(admin);
  snapshot.authUsers = authUsers.map((user) => ({
    id: user.id,
    email: user.email,
    created_at: user.created_at,
  }));

  await mkdir(resolve(backupPath, ".."), { recursive: true });
  await writeFile(backupPath, JSON.stringify(snapshot, null, 2), "utf8");
}

async function deleteApplicationData(admin) {
  for (const step of DELETE_STEPS) {
    const { error, count } = await admin
      .from(step.table)
      .delete({ count: "exact" })
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (error) {
      if (/Could not find the table|schema cache/i.test(error.message)) {
        REPORT.deletedTables[step.label] = 0;
        continue;
      }
      throw new Error(`Delete failed for ${step.table}: ${error.message}`);
    }
    REPORT.deletedTables[step.label] = count ?? 0;
  }
}

async function deleteAllAuthUsers(admin) {
  const users = await listAllAuthUsers(admin);
  let deleted = 0;
  for (const user of users) {
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) {
      throw new Error(`Failed to delete auth user ${user.email}: ${error.message}`);
    }
    deleted += 1;
  }
  REPORT.deletedAuthUsers = deleted;
}

async function createAuthUser(admin, spec, password, createdBy) {
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: spec.email,
    password,
    email_confirm: true,
    user_metadata: { full_name: spec.displayName, role: spec.role },
  });
  if (authError || !authData.user) {
    throw new Error(`Auth create failed for ${spec.email}: ${authError?.message}`);
  }

  const userId = authData.user.id;
  const { error: profileError } = await admin.from("profiles").insert({
    id: userId,
    full_name: spec.displayName,
    email: spec.email,
    phone: null,
    role: spec.role,
    status: "active",
    created_by: createdBy,
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(userId);
    throw new Error(`Profile create failed for ${spec.email}: ${profileError.message}`);
  }

  return userId;
}

async function signIn(client, email, password) {
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

async function rpcCall(client, fn, args, context = {}) {
  const { data, error } = await client.rpc(fn, args);
  if (error) {
    const details = [`${fn} failed`];
    if (context.teamName) details.push(`team=${context.teamName}`);
    if (context.label) details.push(`step=${context.label}`);
    if (context.dates) details.push(`dates=${context.dates}`);
    details.push(`error=${error.message}`);
    throw new Error(details.join(" | "));
  }
  return data;
}

async function getPortfolioByTeamAndSequence(admin, teamId, sequenceOrder) {
  const { data, error } = await admin
    .from("portfolio_outputs")
    .select("id, workflow_status, leader_student_id, portfolio_type, sequence_order")
    .eq("team_id", teamId)
    .eq("sequence_order", sequenceOrder)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

async function getLatestSubmission(admin, portfolioOutputId) {
  const { data, error } = await admin
    .from("portfolio_submissions")
    .select("id, version_number")
    .eq("portfolio_output_id", portfolioOutputId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

async function seedEnvironment(admin, anonClient, password) {
  const ctx = {
    instituteIds: {},
    userIds: {},
    studentIds: {},
    educatorIds: {},
    teamIds: {},
    programId: null,
  };

  const bmsSessionDate = getYesterdayInAsiaKolkata();
  const studioBookingDate = getTodayInAsiaKolkata();
  const todayInAsiaKolkata = getTodayInAsiaKolkata();

  assertBmsSessionDateValid(bmsSessionDate, todayInAsiaKolkata);

  logStep(
    `Workflow dates (Asia/Kolkata): bmsSessionDate=${bmsSessionDate}, studioBookingDate=${studioBookingDate}, today=${todayInAsiaKolkata}`
  );

  const adminSpec = ACCOUNT_SPECS.find((a) => a.key === "admin");
  logStep("Creating Admin account…");
  ctx.userIds.admin = await createAuthUser(admin, adminSpec, password, null);

  logStep("Creating institutes…");
  for (const institute of INSTITUTES) {
    const { data, error } = await admin
      .from("institutes")
      .insert({
        name: institute.name,
        address: institute.address,
        phone: null,
        email: `${institute.key}@incluhub.test`,
        website_or_social: null,
        authorized_person_name: "Test Authorized Person",
        status: "active",
        created_by: ctx.userIds.admin,
      })
      .select("id")
      .single();
    if (error) throw new Error(`Institute create failed: ${error.message}`);
    ctx.instituteIds[institute.key] = data.id;
  }

  logStep("Creating educators and students…");
  for (const spec of ACCOUNT_SPECS.filter((a) => a.role !== "admin")) {
    const userId = await createAuthUser(admin, spec, password, ctx.userIds.admin);
    ctx.userIds[spec.key] = userId;

    if (spec.role === "student") {
      const { data, error } = await admin
        .from("students")
        .insert({
          user_id: userId,
          institute_id: ctx.instituteIds[spec.instituteKey],
          student_category: spec.studentCategory,
          payment_status: "not_required",
          status: "active",
          current_stage_number: 0,
          created_by: ctx.userIds.admin,
        })
        .select("id")
        .single();
      if (error) throw new Error(`Student create failed for ${spec.email}: ${error.message}`);
      ctx.studentIds[spec.key] = data.id;
    }

    if (spec.role === "educator") {
      const { data, error } = await admin
        .from("educators")
        .insert({
          user_id: userId,
          institute_id: ctx.instituteIds[spec.instituteKey],
          educator_type: spec.educatorType,
          status: "active",
          created_by: ctx.userIds.admin,
        })
        .select("id")
        .single();
      if (error) throw new Error(`Educator create failed for ${spec.email}: ${error.message}`);
      ctx.educatorIds[spec.key] = data.id;
    }
  }

  logStep("Signing in as Admin for program/team RPCs…");
  await signIn(anonClient, adminSpec.email, password);

  logStep("Creating program…");
  ctx.programId = await rpcCall(
    anonClient,
    "create_program_with_institutes",
    {
      p_name: "IncluHub Test Portfolio Program",
      p_description: "Cross-institute development program for portfolio review testing.",
      p_start_date: null,
      p_end_date: null,
      p_status: "active",
      p_institute_ids: [
        ctx.instituteIds.photography,
        ctx.instituteIds.makeup,
        ctx.instituteIds.hairstyling,
      ],
    },
    { label: "create_program_with_institutes" }
  );

  logStep("Enrolling students in program…");
  const enrollmentRows = Object.values(ctx.studentIds).map((studentId) => ({
    program_id: ctx.programId,
    student_id: studentId,
    status: "active",
    created_by: ctx.userIds.admin,
  }));
  const { error: enrollmentError } = await admin
    .from("program_enrollments")
    .insert(enrollmentRows);
  if (enrollmentError) {
    throw new Error(`Program enrollment failed: ${enrollmentError.message}`);
  }

  const teamConfigs = [
    {
      key: "alpha",
      name: "TEST TEAM ALPHA",
      makeupStudent: ctx.studentIds.makeupStudent1,
      photoStudent: ctx.studentIds.photoStudent1,
      hairStudent: ctx.studentIds.hairStudent1,
      makeupEducator: ctx.educatorIds.makeupEducator,
      photoEducator: ctx.educatorIds.photoEducator,
      hairEducator: ctx.educatorIds.hairEducator,
    },
    {
      key: "beta",
      name: "TEST TEAM BETA",
      makeupStudent: ctx.studentIds.makeupStudent2,
      photoStudent: ctx.studentIds.photoStudent2,
      hairStudent: ctx.studentIds.hairStudent2,
      makeupEducator: ctx.educatorIds.makeupEducator,
      photoEducator: ctx.educatorIds.photoEducator,
      hairEducator: ctx.educatorIds.hairEducator,
    },
  ];

  for (const team of teamConfigs) {
    logStep(`Creating ${team.name}…`);
    const teamId = await rpcCall(
      anonClient,
      "create_balanced_team",
      {
        p_team_name: team.name,
        p_program_id: ctx.programId,
        p_makeup_artist_student_id: team.makeupStudent,
        p_photographer_student_id: team.photoStudent,
        p_hairstylist_student_id: team.hairStudent,
        p_makeup_educator_id: team.makeupEducator,
        p_photography_educator_id: team.photoEducator,
        p_hairstyling_educator_id: team.hairEducator,
      },
      { teamName: team.name, label: "create_balanced_team" }
    );
    ctx.teamIds[team.key] = teamId;

    logStep(`Starting ${team.name} stage journey…`);
    await rpcCall(
      anonClient,
      "start_team_stage_journey",
      { p_team_id: teamId },
      { teamName: team.name, label: "start_team_stage_journey" }
    );

    logStep(`Completing ${team.name} BMS (session date ${bmsSessionDate})…`);
    await rpcCall(
      anonClient,
      "complete_bms_session",
      {
        p_team_id: teamId,
        p_session_date: bmsSessionDate,
        p_remarks: "Development seed BMS completion",
      },
      {
        teamName: team.name,
        label: "complete_bms_session",
        dates: `bmsSessionDate=${bmsSessionDate}`,
      }
    );
  }

  await anonClient.auth.signOut();

  async function bookAndSubmit(teamName, studentEmail, portfolioId, title, notes, slotCode) {
    const studentClient = createAuthClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    await signIn(studentClient, studentEmail, password);
    await rpcCall(
      studentClient,
      "book_studio_slot",
      {
        p_portfolio_output_id: portfolioId,
        p_booking_date: studioBookingDate,
        p_slot_code: slotCode,
      },
      {
        teamName,
        label: "book_studio_slot",
        dates: `studioBookingDate=${studioBookingDate}, slot=${slotCode}`,
      }
    );
    await rpcCall(
      studentClient,
      "submit_portfolio",
      {
        p_portfolio_output_id: portfolioId,
        p_title: title,
        p_portfolio_url: "https://drive.google.com/",
        p_notes: notes,
      },
      { teamName, label: "submit_portfolio" }
    );
    await studentClient.auth.signOut();
  }

  const alphaPhotoPortfolio = await getPortfolioByTeamAndSequence(
    admin,
    ctx.teamIds.alpha,
    1
  );
  logStep(
    `Team Alpha Photography booking/submission (studioBookingDate=${studioBookingDate})…`
  );
  await bookAndSubmit(
    "TEST TEAM ALPHA",
    ACCOUNT_SPECS.find((a) => a.key === "photoStudent1").email,
    alphaPhotoPortfolio.id,
    "Team Alpha Photography Portfolio",
    "Initial Photography submission for Educator approval testing.",
    "slot_09_12"
  );

  const betaPhotoPortfolio = await getPortfolioByTeamAndSequence(
    admin,
    ctx.teamIds.beta,
    1
  );
  logStep(
    `Team Beta Photography booking/submission (studioBookingDate=${studioBookingDate})…`
  );
  await bookAndSubmit(
    "TEST TEAM BETA",
    ACCOUNT_SPECS.find((a) => a.key === "photoStudent2").email,
    betaPhotoPortfolio.id,
    "Team Beta Photography Portfolio",
    "Photography submission for Team Beta workflow testing.",
    "slot_12_15"
  );

  const betaPhotoSubmission = await getLatestSubmission(admin, betaPhotoPortfolio.id);

  logStep("Team Beta Photography educator approval…");
  const photoEducatorClient = createAuthClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  await signIn(
    photoEducatorClient,
    ACCOUNT_SPECS.find((a) => a.key === "photoEducator").email,
    password
  );
  await rpcCall(
    photoEducatorClient,
    "review_portfolio_as_educator",
    {
      p_portfolio_output_id: betaPhotoPortfolio.id,
      p_submission_id: betaPhotoSubmission.id,
      p_decision: "approved",
      p_comments: null,
    },
    { teamName: "TEST TEAM BETA", label: "review_portfolio_as_educator" }
  );
  await photoEducatorClient.auth.signOut();

  logStep("Team Beta Photography admin approval…");
  const adminClient = createAuthClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  await signIn(adminClient, adminSpec.email, password);
  await rpcCall(
    adminClient,
    "review_portfolio_as_admin",
    {
      p_portfolio_output_id: betaPhotoPortfolio.id,
      p_submission_id: betaPhotoSubmission.id,
      p_decision: "approved",
      p_comments: null,
    },
    { teamName: "TEST TEAM BETA", label: "review_portfolio_as_admin" }
  );
  await adminClient.auth.signOut();

  const betaMakeupPortfolio = await getPortfolioByTeamAndSequence(
    admin,
    ctx.teamIds.beta,
    2
  );
  logStep(
    `Team Beta Makeup booking/submission (studioBookingDate=${studioBookingDate})…`
  );
  await bookAndSubmit(
    "TEST TEAM BETA",
    ACCOUNT_SPECS.find((a) => a.key === "makeupStudent2").email,
    betaMakeupPortfolio.id,
    "Team Beta Makeup Portfolio",
    "Makeup submission for Educator approval testing.",
    "slot_15_18"
  );

  return ctx;
}

async function verifyLogins(password) {
  for (const spec of ACCOUNT_SPECS) {
    const client = createAuthClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    try {
      await signIn(client, spec.email, password);
      const { data: profile, error } = await client
        .from("profiles")
        .select("role, status")
        .eq("email", spec.email)
        .maybeSingle();
      await client.auth.signOut();

      if (error || !profile) {
        REPORT.loginResults.push({
          email: spec.email,
          pass: false,
          detail: error?.message ?? "Profile missing",
        });
        continue;
      }

      const pass =
        profile.role === spec.role && profile.status === "active";
      REPORT.loginResults.push({
        email: spec.email,
        pass,
        detail: pass
          ? "OK"
          : `Expected role=${spec.role}, status=active; got role=${profile.role}, status=${profile.status}`,
      });
    } catch (error) {
      REPORT.loginResults.push({
        email: spec.email,
        pass: false,
        detail: error.message ?? String(error),
      });
    }
  }
}

function assertCondition(label, pass, detail = "") {
  REPORT.assertions.push({ label, pass, detail });
  if (!pass) {
    throw new Error(`Assertion failed: ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

async function verifyFinalState(admin, ctx) {
  const authUsers = await listAllAuthUsers(admin);
  assertCondition("auth users = 10", authUsers.length === 10, `got ${authUsers.length}`);

  const profiles = await countTable(admin, "profiles");
  assertCondition("active profiles = 10", profiles === 10, `got ${profiles}`);

  const admins = await admin
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "admin")
    .eq("status", "active");
  assertCondition("admins = 1", (admins.count ?? 0) === 1, `got ${admins.count ?? 0}`);

  assertCondition("educators = 3", (await countTable(admin, "educators")) === 3);
  assertCondition("students = 6", (await countTable(admin, "students")) === 6);
  assertCondition("institutes = 3", (await countTable(admin, "institutes")) === 3);
  assertCondition("programs = 1", (await countTable(admin, "programs")) === 1);
  assertCondition("teams = 2", (await countTable(admin, "teams")) === 2);

  for (const teamKey of ["alpha", "beta"]) {
    const teamId = ctx.teamIds[teamKey];
    const members = await admin
      .from("team_members")
      .select("*", { count: "exact", head: true })
      .eq("team_id", teamId)
      .eq("member_status", "active");
    assertCondition(
      `${teamKey} active members = 3`,
      (members.count ?? 0) === 3,
      `got ${members.count ?? 0}`
    );

    const mappings = await admin
      .from("team_educators")
      .select("*", { count: "exact", head: true })
      .eq("team_id", teamId)
      .eq("status", "active");
    assertCondition(
      `${teamKey} educator mappings = 3`,
      (mappings.count ?? 0) === 3,
      `got ${mappings.count ?? 0}`
    );
  }

  for (const educatorKey of ["photoEducator", "makeupEducator", "hairEducator"]) {
    const educatorId = ctx.educatorIds[educatorKey];
    const studentMappings = await admin
      .from("team_educators")
      .select("*", { count: "exact", head: true })
      .eq("educator_id", educatorId)
      .eq("status", "active");
    assertCondition(
      `${educatorKey} mapped students = 2`,
      (studentMappings.count ?? 0) === 2,
      `got ${studentMappings.count ?? 0}`
    );

    const { data: teamRows, error } = await admin
      .from("team_educators")
      .select("team_id")
      .eq("educator_id", educatorId)
      .eq("status", "active");
    if (error) throw new Error(error.message);
    const uniqueTeams = new Set((teamRows ?? []).map((row) => row.team_id));
    assertCondition(
      `${educatorKey} mapped teams = 2`,
      uniqueTeams.size === 2,
      `got ${uniqueTeams.size}`
    );
  }

  async function assertPortfolio(teamKey, sequenceOrder, expectedStatus) {
    const portfolio = await getPortfolioByTeamAndSequence(
      admin,
      ctx.teamIds[teamKey],
      sequenceOrder
    );
    assertCondition(
      `${teamKey} seq ${sequenceOrder} = ${expectedStatus}`,
      portfolio?.workflow_status === expectedStatus,
      `got ${portfolio?.workflow_status ?? "missing"}`
    );
    return portfolio;
  }

  await assertPortfolio("alpha", 1, "pending_educator");
  await assertPortfolio("alpha", 2, "locked");
  await assertPortfolio("alpha", 3, "locked");

  await assertPortfolio("beta", 1, "completed");
  await assertPortfolio("beta", 2, "pending_educator");
  await assertPortfolio("beta", 3, "locked");

  for (const teamKey of ["alpha", "beta"]) {
    const { data: team, error } = await admin
      .from("teams")
      .select("current_stage_number")
      .eq("id", ctx.teamIds[teamKey])
      .single();
    if (error) throw new Error(error.message);
    assertCondition(
      `${teamKey} team stage = 3`,
      team.current_stage_number === 3,
      `got ${team.current_stage_number}`
    );
  }

  for (const teamKey of ["alpha", "beta"]) {
    const { data: portfolios, error } = await admin
      .from("portfolio_outputs")
      .select("workflow_status")
      .eq("team_id", ctx.teamIds[teamKey]);
    if (error) throw new Error(error.message);
    const activeCount = (portfolios ?? []).filter((row) =>
      [
        "awaiting_booking",
        "awaiting_submission",
        "pending_educator",
        "pending_admin",
        "revision_required",
      ].includes(row.workflow_status)
    ).length;
    assertCondition(
      `${teamKey} one active portfolio`,
      activeCount === 1,
      `got ${activeCount}`
    );
  }

  const alphaPhoto = await getPortfolioByTeamAndSequence(admin, ctx.teamIds.alpha, 1);
  const { data: alphaSubRows, error: alphaSubError } = await admin
    .from("portfolio_submissions")
    .select("id")
    .eq("portfolio_output_id", alphaPhoto.id);
  if (alphaSubError) throw new Error(alphaSubError.message);
  const alphaSubIds = (alphaSubRows ?? []).map((row) => row.id);
  if (alphaSubIds.length > 0) {
    const alphaReviews = await admin
      .from("portfolio_reviews")
      .select("*", { count: "exact", head: true })
      .in("portfolio_submission_id", alphaSubIds);
    assertCondition(
      "Team Alpha Photography has no reviews",
      (alphaReviews.count ?? 0) === 0,
      `got ${alphaReviews.count ?? 0}`
    );
  }

  const hairStudentIds = [
    ctx.studentIds.hairStudent1,
    ctx.studentIds.hairStudent2,
  ];
  const { data: hairPending, error: hairPendingError } = await admin
    .from("portfolio_outputs")
    .select("id")
    .in("leader_student_id", hairStudentIds)
    .eq("workflow_status", "pending_educator");
  if (hairPendingError) throw new Error(hairPendingError.message);
  assertCondition(
    "Hairstyling Educator has zero pending reviews",
    (hairPending ?? []).length === 0,
    `got ${(hairPending ?? []).length}`
  );

  const { data: stage3Students, error: studentStageError } = await admin
    .from("students")
    .select("current_stage_number");
  if (studentStageError) throw new Error(studentStageError.message);
  const allStage3 = (stage3Students ?? []).every(
    (row) => row.current_stage_number === 3
  );
  assertCondition("all six students are Stage 3", allStage3);
}

function buildCredentialMarkdown(password) {
  const lines = [
    "# IncluHub Test Credentials (local only)",
    "",
    "Email is the login username.",
    "",
    `Common password: ${password}`,
    "",
    "| Role | Display name | Email | Institute | Team | Expected state |",
    "|------|--------------|-------|-----------|------|----------------|",
  ];

  for (const spec of ACCOUNT_SPECS) {
    lines.push(
      `| ${spec.role} | ${spec.displayName} | ${spec.email} | ${spec.instituteKey ?? "—"} | ${spec.team ?? "—"} | ${spec.expectedState} |`
    );
  }

  lines.push("");
  lines.push("Generated by `npm run test:reset -- --confirm-reset`.");
  lines.push("Do not commit this file.");
  return lines.join("\n");
}

function printCredentialTable(password) {
  console.log("");
  console.log("=== Test credentials (email is username) ===");
  console.log(`Common password: ${password}`);
  console.log("");
  console.log("| Role | Display name | Email | Team | Expected state |");
  console.log("|------|--------------|-------|------|----------------|");
  for (const spec of ACCOUNT_SPECS) {
    console.log(
      `| ${spec.role} | ${spec.displayName} | ${spec.email} | ${spec.team ?? "—"} | ${spec.expectedState} |`
    );
  }
}

async function runSafetyChecks() {
  const url = assertEnv("NEXT_PUBLIC_SUPABASE_URL");
  assertEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  assertEnv("SUPABASE_SERVICE_ROLE_KEY");
  const expectedRef = assertEnv("EXPECTED_SUPABASE_PROJECT_REF");
  const password = assertEnv("TEST_ACCOUNT_PASSWORD");
  const allowDestructive = process.env.ALLOW_DESTRUCTIVE_TEST_RESET;

  if (allowDestructive !== "true") {
    throw new Error(
      "ALLOW_DESTRUCTIVE_TEST_RESET must be exactly true for this utility."
    );
  }

  const projectRef = extractProjectRef(url);
  REPORT.projectRef = projectRef;

  if (expectedRef === "YOUR_DEVELOPMENT_PROJECT_REF") {
    throw new Error(
      "EXPECTED_SUPABASE_PROJECT_REF is still a placeholder. Set it to your development project ref in .env.local."
    );
  }

  if (projectRef !== expectedRef) {
    throw new Error(
      `Project ref mismatch. URL ref=${maskProjectRef(projectRef)} expected=${maskProjectRef(expectedRef)}`
    );
  }

  if (looksLikeProductionUrl(url, projectRef)) {
    throw new Error(
      "Target URL appears to reference a production Supabase project. Aborting."
    );
  }

  REPORT.safety = "PASS";
  return { url, password, projectRef };
}

async function main() {
  const { url, password, projectRef } = await runSafetyChecks();
  const admin = createServiceClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const anonClient = createAuthClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  REPORT.beforeCounts = await collectCurrentCounts(admin);

  if (!confirmReset) {
    printDryRunSummary(projectRef, REPORT.beforeCounts);
    REPORT.safety = "PASS (dry-run)";
    return;
  }

  console.log("");
  console.log("=== DESTRUCTIVE RESET + SEED ===");
  console.log(`Target project ref: ${maskProjectRef(projectRef)}`);
  console.log("");
  console.log(
    "Rerun policy: always backup current state (including partial failed seeds), delete all application data and auth users, then recreate the fixture from zero."
  );
  console.log("");

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = resolve(process.cwd(), "tmp/test-reset-backups", `${timestamp}.json`);
  REPORT.backupPath = backupPath;

  logStep("Exporting backup of current database state…");
  await exportBackup(admin, backupPath);

  logStep("Deleting all application data (including partial seed residue)…");
  await deleteApplicationData(admin);

  logStep("Deleting all auth users…");
  await deleteAllAuthUsers(admin);

  logStep("Seeding fixed test environment from zero…");
  const ctx = await seedEnvironment(admin, anonClient, password);

  logStep("Verifying logins for all 10 accounts…");
  await verifyLogins(password);

  logStep("Running final data assertions…");
  await verifyFinalState(admin, ctx);

  const credentialPath = resolve(process.cwd(), "TEST_CREDENTIALS.local.md");
  await writeFile(credentialPath, buildCredentialMarkdown(password), "utf8");

  printCredentialTable(password);

  console.log("");
  console.log("Login verification:");
  for (const result of REPORT.loginResults) {
    console.log(`  ${result.pass ? "PASS" : "FAIL"} ${result.email} — ${result.detail}`);
  }

  console.log("");
  console.log(`Backup written: ${backupPath}`);
  console.log(`Credentials written: ${credentialPath}`);
  console.log("");
  console.log("Reset + seed completed successfully.");
}

main().catch((error) => {
  console.error("");
  console.error("Reset utility failed:");
  console.error(error.message ?? error);
  process.exit(1);
});
