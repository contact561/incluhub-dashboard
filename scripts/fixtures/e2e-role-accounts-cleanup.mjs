#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import nextEnv from "@next/env";
import { assertFixtureMutationAllowed, maskProjectRef } from "./fixture-safety.mjs";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const EMAILS = [
  "e2e.admin@incluhub.test",
  "e2e.student@incluhub.test",
  "e2e.educator@incluhub.test",
];

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

async function main() {
  const { projectRef } = assertFixtureMutationAllowed({
    confirmationFlag: "--confirm-e2e-account-cleanup",
    label: "E2E role account cleanup",
  });

  const admin = createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  for (const email of EMAILS) {
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (profileError) {
      throw new Error(`Profile lookup failed for ${email}: ${profileError.message}`);
    }

    if (!profile) {
      console.log(`SKIP ${email}: not present`);
      continue;
    }

    const { error } = await admin.auth.admin.deleteUser(profile.id);
    if (error) throw new Error(`Could not delete ${email}: ${error.message}`);
    console.log(`REMOVED ${email}`);
  }

  console.log(`Target project: ${maskProjectRef(projectRef)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "E2E cleanup failed.");
  process.exit(1);
});
