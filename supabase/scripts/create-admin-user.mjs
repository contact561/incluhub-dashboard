import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";
import { assertFixtureMutationAllowed } from "../../scripts/fixture-safety.mjs";


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

async function main() {
  const env = loadEnvLocal();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const email = env.TEST_ADMIN_EMAIL;
  const password = env.TEST_ADMIN_PASSWORD;
  const fullName = env.TEST_ADMIN_FULL_NAME;

  if (!url || !serviceRoleKey || !email || !password || !fullName) {
    console.error(
      "Missing Supabase credentials or TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD, TEST_ADMIN_FULL_NAME in .env.local"
    );
    process.exit(1);
  }

  assertFixtureMutationAllowed({
    confirmationFlag: "--confirm-create-admin",
    label: "Admin fixture creation",
    values: env,
  });

  const admin = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    console.error(`Profile already exists for ${email}. Use a different email or delete the user first.`);
    process.exit(1);
  }

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role: "admin" },
  });

  if (authError || !authData.user) {
    console.error("Auth create failed:", authError?.message ?? "unknown error");
    process.exit(1);
  }

  const userId = authData.user.id;

  const { error: profileError } = await admin.from("profiles").insert({
    id: userId,
    full_name: fullName,
    email,
    phone: null,
    role: "admin",
    status: "active",
    created_by: null,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(userId);
    console.error("Profile create failed:", profileError.message);
    process.exit(1);
  }

  console.log("Admin user created successfully.");
  console.log("EMAIL:", email);
  console.log("Password was read from TEST_ADMIN_PASSWORD and is not printed.");
  console.log("USER_ID:", userId);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
