import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";
import { assertFixtureMutationAllowed } from "../../../scripts/fixtures/fixture-safety.mjs";


function loadEnvLocal() {
  const envPath = resolve(process.cwd(), ".env.local");
  const content = readFileSync(envPath, "utf8");
  const env = {};

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }

  return env;
}

const TEST_USERS = [
  {
    email: "makeup.student@incluhub.test",
    fullName: "Test Makeup Artist",
    role: "student",
    studentCategory: "makeup_artist",
    educatorType: null,
    instituteIndex: 0,
  },
  {
    email: "photo.student@incluhub.test",
    fullName: "Test Photographer",
    role: "student",
    studentCategory: "photographer",
    educatorType: null,
    instituteIndex: 1,
  },
  {
    email: "hair.student@incluhub.test",
    fullName: "Test Hairstylist",
    role: "student",
    studentCategory: "hairstylist",
    educatorType: null,
    instituteIndex: 2,
  },
  {
    email: "makeup.educator@incluhub.test",
    fullName: "Test Makeup Educator",
    role: "educator",
    studentCategory: null,
    educatorType: "makeup_educator",
    instituteIndex: 0,
  },
  {
    email: "photo.educator@incluhub.test",
    fullName: "Test Photography Educator",
    role: "educator",
    studentCategory: null,
    educatorType: "photography_educator",
    instituteIndex: 1,
  },
  {
    email: "hair.educator@incluhub.test",
    fullName: "Test Hairstyling Educator",
    role: "educator",
    studentCategory: null,
    educatorType: "hairstyling_educator",
    instituteIndex: 2,
  },
];

async function getAdminId(admin) {
  const { data, error } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "admin")
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    throw new Error("No active admin profile found for created_by.");
  }

  return data.id;
}

async function createUser(admin, adminId, instituteId, user, password) {
  const { data: existing } = await admin
    .from("profiles")
    .select("id, email")
    .eq("email", user.email)
    .maybeSingle();

  if (existing) {
    console.log(`SKIP (exists): ${user.email}`);
    return { email: user.email, skipped: true };
  }

  const { data: authData, error: authError } = await admin.auth.admin.createUser(
    {
      email: user.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: user.fullName, role: user.role },
    }
  );

  if (authError || !authData.user) {
    throw new Error(`Auth create failed for ${user.email}: ${authError?.message}`);
  }

  const userId = authData.user.id;

  const { error: profileError } = await admin.from("profiles").insert({
    id: userId,
    full_name: user.fullName,
    email: user.email,
    phone: null,
    role: user.role,
    status: "active",
    created_by: adminId,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(userId);
    throw new Error(`Profile create failed for ${user.email}: ${profileError.message}`);
  }

  if (user.role === "student") {
    const { error } = await admin.from("students").insert({
      user_id: userId,
      institute_id: instituteId,
      student_category: user.studentCategory,
      payment_status: "not_required",
      status: "active",
      current_stage_number: 0,
      created_by: adminId,
    });

    if (error) {
      await admin.auth.admin.deleteUser(userId);
      throw new Error(`Student create failed for ${user.email}: ${error.message}`);
    }
  }

  if (user.role === "educator") {
    const { error } = await admin.from("educators").insert({
      user_id: userId,
      institute_id: instituteId,
      educator_type: user.educatorType,
      status: "active",
      created_by: adminId,
    });

    if (error) {
      await admin.auth.admin.deleteUser(userId);
      throw new Error(`Educator create failed for ${user.email}: ${error.message}`);
    }
  }

  console.log(`CREATED: ${user.email} (${user.role})`);
  return { email: user.email, created: true };
}

async function main() {
  const env = loadEnvLocal();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const password = env.TEST_ACCOUNT_PASSWORD;

  if (!url || !serviceRoleKey || !password) {
    console.error("Missing Supabase credentials or TEST_ACCOUNT_PASSWORD in .env.local");
    process.exit(1);
  }

  assertFixtureMutationAllowed({
    confirmationFlag: "--confirm-seed-users",
    label: "Stage test-user seed",
    values: env,
  });

  const admin = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: institutes, error: instituteError } = await admin
    .from("institutes")
    .select("id, name")
    .eq("status", "active")
    .order("name", { ascending: true });

  if (instituteError) {
    console.error("Failed to load institutes:", instituteError.message);
    process.exit(1);
  }

  if (!institutes || institutes.length < 3) {
    console.error(
      `Need at least 3 active institutes. Found ${institutes?.length ?? 0}.`
    );
    process.exit(1);
  }

  const adminId = await getAdminId(admin);

  console.log("Using institutes:");
  institutes.slice(0, 3).forEach((institute, index) => {
    console.log(`  [${index}] ${institute.name} (${institute.id})`);
  });
  console.log("");

  const results = [];
  for (const user of TEST_USERS) {
    const instituteId = institutes[user.instituteIndex].id;
    results.push(await createUser(admin, adminId, instituteId, user, password));
  }

  console.log("");
  console.log("Done. Shared password was read from TEST_ACCOUNT_PASSWORD and is not printed.");
  console.log("");
  console.log("Students:");
  console.log("  makeup.student@incluhub.test — Makeup Artist");
  console.log("  photo.student@incluhub.test — Photographer");
  console.log("  hair.student@incluhub.test — Hairstylist");
  console.log("");
  console.log("Educators:");
  console.log("  makeup.educator@incluhub.test — Makeup Educator");
  console.log("  photo.educator@incluhub.test — Photography Educator");
  console.log("  hair.educator@incluhub.test — Hairstyling Educator");
  console.log("");
  console.log(
    "Next: enrol students in a program, link institutes, create team, start stage journey."
  );
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
