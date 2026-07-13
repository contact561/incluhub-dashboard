import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

const EMAIL = "admin.new@incluhub.test";
const PASSWORD = "IncluHubAdmin2026!";
const FULL_NAME = "Demo Admin New";

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

  if (!url || !serviceRoleKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  const admin = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .eq("email", EMAIL)
    .maybeSingle();

  if (existing) {
    console.error(`Profile already exists for ${EMAIL}. Use a different email or delete the user first.`);
    process.exit(1);
  }

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: FULL_NAME, role: "admin" },
  });

  if (authError || !authData.user) {
    console.error("Auth create failed:", authError?.message ?? "unknown error");
    process.exit(1);
  }

  const userId = authData.user.id;

  const { error: profileError } = await admin.from("profiles").insert({
    id: userId,
    full_name: FULL_NAME,
    email: EMAIL,
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
  console.log("EMAIL:", EMAIL);
  console.log("PASSWORD:", PASSWORD);
  console.log("USER_ID:", userId);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
