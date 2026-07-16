import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { assertFixtureMutationAllowed } from "./fixture-safety.mjs";

function parseEnvFile(path) {
  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const separator = line.indexOf("=");
        const key = line.slice(0, separator).trim();
        let value = line.slice(separator + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        return [key, value];
      })
  );
}

function parseCredentials(path) {
  const contents = readFileSync(path, "utf8");
  const password = contents.match(/^Common password:\s*(.+)$/m)?.[1]?.trim();
  const accounts = contents
    .split(/\r?\n/)
    .filter((line) => /^\|\s*(admin|educator|student|external_member)\s*\|/.test(line))
    .map((line) => {
      const [role, displayName, email] = line
        .split("|")
        .slice(1, -1)
        .map((cell) => cell.trim());
      return { role, displayName, email };
    });

  if (!password || accounts.length === 0) {
    throw new Error("TEST_CREDENTIALS.local.md is missing or invalid.");
  }

  return { accounts, password };
}

function requiredAccount(accounts, role, namePattern) {
  const account = accounts.find(
    (candidate) =>
      candidate.role === role && namePattern.test(candidate.displayName)
  );
  if (!account) {
    throw new Error(`Required ${role} fixture account was not found.`);
  }
  return account;
}

function publicClient(url, anonKey) {
  return createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function authenticatedClient(url, anonKey, account, password) {
  const client = publicClient(url, anonKey);
  const { error } = await client.auth.signInWithPassword({
    email: account.email,
    password,
  });
  if (error) {
    throw new Error(`Could not authenticate the ${account.role} fixture.`);
  }
  return client;
}

function expectDenied(label, error) {
  if (!error || !/permission|not authorized|not allowed|jwt/i.test(error.message)) {
    throw new Error(`${label} was not denied by the database.`);
  }
  console.log(`PASS: ${label}`);
}

async function main() {
  const root = process.cwd();
  const env = parseEnvFile(resolve(root, ".env.local"));
  const { accounts, password } = parseCredentials(
    resolve(root, "TEST_CREDENTIALS.local.md")
  );

  assertFixtureMutationAllowed({
    confirmationFlag: "--confirm-release-authz",
    label: "Package F authorization check",
    values: env,
  });

  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceRoleKey) {
    throw new Error("Required Supabase environment values are missing.");
  }

  const adminAccount = requiredAccount(accounts, "admin", /admin/i);
  const studentAccount = requiredAccount(
    accounts,
    "student",
    /Photography Student 1/i
  );
  const educatorAccount = requiredAccount(
    accounts,
    "educator",
    /Photography Educator/i
  );

  const service = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: teams, error: teamsError } = await service
    .from("teams")
    .select("id, team_name, current_stage_number")
    .in("team_name", ["TEST TEAM ALPHA", "TEST TEAM BETA"]);
  if (teamsError) throw new Error("Could not load release fixture teams.");

  const alpha = teams?.find((team) => team.team_name === "TEST TEAM ALPHA");
  const beta = teams?.find((team) => team.team_name === "TEST TEAM BETA");
  if (!alpha || !beta) throw new Error("Alpha/Beta release fixtures are required.");

  const { data: beforeRows, error: beforeError } = await service
    .from("team_stage_progress")
    .select(
      "team_id, stage_number, status, brand_works_date, brand_works_remarks, brand_works_scheduled_at, brand_works_scheduled_by, brand_works_completed_at, brand_works_completed_by"
    )
    .in("team_id", [alpha.id, beta.id])
    .in("stage_number", [3, 4, 5]);
  if (beforeError) throw new Error("Could not load release fixture stage state.");

  const beforeJson = JSON.stringify(beforeRows);
  const alphaStage3 = beforeRows.find(
    (row) => row.team_id === alpha.id && row.stage_number === 3
  );
  const alphaStage4 = beforeRows.find(
    (row) => row.team_id === alpha.id && row.stage_number === 4
  );
  const alphaStage5 = beforeRows.find(
    (row) => row.team_id === alpha.id && row.stage_number === 5
  );
  const betaStage4 = beforeRows.find(
    (row) => row.team_id === beta.id && row.stage_number === 4
  );
  const betaStage5 = beforeRows.find(
    (row) => row.team_id === beta.id && row.stage_number === 5
  );

  if (
    alpha.current_stage_number !== 4 ||
    alphaStage3?.status !== "completed" ||
    alphaStage4?.status !== "in_progress" ||
    alphaStage5?.status !== "locked"
  ) {
    throw new Error("Team Alpha does not prove the completed Stage 3 to Stage 4 path.");
  }
  console.log("PASS: persisted Stage 3 to Stage 4 transition is consistent");

  if (
    beta.current_stage_number !== 5 ||
    betaStage4?.status !== "completed" ||
    !betaStage4.brand_works_date ||
    !betaStage4.brand_works_scheduled_at ||
    !betaStage4.brand_works_scheduled_by ||
    !betaStage4.brand_works_completed_at ||
    !betaStage4.brand_works_completed_by ||
    betaStage5?.status !== "completed"
  ) {
    throw new Error("Team Beta does not prove the audited Stage 4 to Stage 5 transition.");
  }

  const { data: activeStudents, error: activeStudentsError } = await service
    .from("students")
    .select("current_team_id, current_stage_number")
    .in("current_team_id", [alpha.id, beta.id])
    .eq("status", "active");
  if (activeStudentsError) {
    throw new Error("Could not verify active student stage synchronization.");
  }
  const alphaStudents = activeStudents.filter(
    (student) => student.current_team_id === alpha.id
  );
  const betaStudents = activeStudents.filter(
    (student) => student.current_team_id === beta.id
  );
  if (
    alphaStudents.length !== 3 ||
    alphaStudents.some((student) => student.current_stage_number !== 4) ||
    betaStudents.length !== 3 ||
    betaStudents.some((student) => student.current_stage_number !== 5)
  ) {
    throw new Error("Active student stages are not synchronized with their teams.");
  }
  console.log("PASS: audited Stage 4 to Stage 5 transition is consistent");

  const today = new Date().toISOString().slice(0, 10);
  const anon = publicClient(url, anonKey);
  const student = await authenticatedClient(
    url,
    anonKey,
    studentAccount,
    password
  );
  const educator = await authenticatedClient(
    url,
    anonKey,
    educatorAccount,
    password
  );
  const admin = await authenticatedClient(
    url,
    anonKey,
    adminAccount,
    password
  );

  const deniedCalls = [
    [
      "anonymous Brand Works scheduling",
      anon.rpc("schedule_brand_works", {
        p_team_id: alpha.id,
        p_brand_works_date: today,
        p_remarks: "blocked",
      }),
    ],
    [
      "student Brand Works scheduling",
      student.rpc("schedule_brand_works", {
        p_team_id: alpha.id,
        p_brand_works_date: today,
        p_remarks: "blocked",
      }),
    ],
    [
      "student Brand Works completion",
      student.rpc("complete_brand_works", { p_team_id: alpha.id }),
    ],
    [
      "educator Brand Works scheduling",
      educator.rpc("schedule_brand_works", {
        p_team_id: alpha.id,
        p_brand_works_date: today,
        p_remarks: "blocked",
      }),
    ],
    [
      "educator Brand Works completion",
      educator.rpc("complete_brand_works", { p_team_id: alpha.id }),
    ],
  ];

  for (const [label, operation] of deniedCalls) {
    const { error } = await operation;
    expectDenied(label, error);
  }

  const { error: studentWriteError } = await student
    .from("team_stage_progress")
    .update({ brand_works_remarks: "blocked direct write" })
    .eq("team_id", alpha.id)
    .eq("stage_number", 4);
  expectDenied("student direct stage-progress update", studentWriteError);

  const { data: studentRows, error: studentRowsError } = await student
    .from("team_stage_progress")
    .select("team_id");
  if (studentRowsError) throw new Error("Student RLS read check failed.");
  if (
    studentRows.length === 0 ||
    studentRows.some((row) => row.team_id !== alpha.id)
  ) {
    throw new Error("Student RLS returned an unrelated team.");
  }
  console.log("PASS: student RLS is limited to the active team");

  const { data: educatorProfile, error: educatorProfileError } = await service
    .from("profiles")
    .select("id")
    .eq("email", educatorAccount.email)
    .single();
  if (educatorProfileError) throw new Error("Educator fixture profile is missing.");

  const { data: educatorRecord, error: educatorRecordError } = await service
    .from("educators")
    .select("id")
    .eq("user_id", educatorProfile.id)
    .single();
  if (educatorRecordError) throw new Error("Educator fixture record is missing.");

  const { data: assignments, error: assignmentsError } = await service
    .from("team_educators")
    .select("team_id")
    .eq("educator_id", educatorRecord.id)
    .eq("status", "active");
  if (assignmentsError) throw new Error("Educator assignments could not be read.");
  const assignedTeamIds = new Set(assignments.map((row) => row.team_id));

  const { data: educatorRows, error: educatorRowsError } = await educator
    .from("team_stage_progress")
    .select("team_id");
  if (educatorRowsError) throw new Error("Educator RLS read check failed.");
  if (
    educatorRows.length === 0 ||
    educatorRows.some((row) => !assignedTeamIds.has(row.team_id))
  ) {
    throw new Error("Educator RLS returned an unassigned team.");
  }
  console.log("PASS: educator RLS is limited to assigned teams");

  if (beta.current_stage_number !== 5 || betaStage4?.status !== "completed") {
    throw new Error("Team Beta must be completed at Stage 5 for idempotency QA.");
  }

  const { error: adminCompleteError } = await admin.rpc("complete_brand_works", {
    p_team_id: beta.id,
  });
  if (adminCompleteError) {
    throw new Error("Admin completion idempotency check failed.");
  }
  console.log("PASS: Admin completion retry is idempotent");

  if (alphaStage4?.brand_works_date && alphaStage4.brand_works_scheduled_at) {
    const { error: adminScheduleError } = await admin.rpc(
      "schedule_brand_works",
      {
        p_team_id: alpha.id,
        p_brand_works_date: alphaStage4.brand_works_date,
        p_remarks: alphaStage4.brand_works_remarks,
      }
    );
    if (adminScheduleError) {
      throw new Error("Admin scheduling idempotency check failed.");
    }
    console.log("PASS: Admin scheduling retry is idempotent");
  } else {
    console.log("SKIP: Team Alpha has no existing schedule for idempotency QA");
  }

  const { data: afterRows, error: afterError } = await service
    .from("team_stage_progress")
    .select(
      "team_id, stage_number, status, brand_works_date, brand_works_remarks, brand_works_scheduled_at, brand_works_scheduled_by, brand_works_completed_at, brand_works_completed_by"
    )
    .in("team_id", [alpha.id, beta.id])
    .in("stage_number", [3, 4, 5]);
  if (afterError) throw new Error("Could not verify final release fixture state.");
  if (JSON.stringify(afterRows) !== beforeJson) {
    throw new Error("Release authorization checks changed fixture workflow state.");
  }

  console.log("PASS: Package F authorization checks changed no workflow state");
}

main().catch((error) => {
  console.error(`FAIL: ${error.message}`);
  process.exitCode = 1;
});
