#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import nextEnv from "@next/env";
import { assertFixtureMutationAllowed, maskProjectRef } from "./fixture-safety.mjs";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const ACCOUNT_SPECS = [
  {
    role: "admin",
    email: "e2e.admin@incluhub.test",
    fullName: "E2E Admin",
  },
  {
    role: "student",
    email: "e2e.student@incluhub.test",
    fullName: "E2E Student",
    studentCategory: "photographer",
  },
  {
    role: "educator",
    email: "e2e.educator@incluhub.test",
    fullName: "E2E Educator",
    educatorType: "photography_educator",
  },
];

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function createServiceClient() {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

function createAnonClient() {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function findAuthUserByEmail(admin, email) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 100,
    });
    if (error) throw new Error(`Could not list Auth users: ${error.message}`);

    const hit = data.users.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase()
    );
    if (hit) return hit;
    if (data.users.length < 100) return null;
  }

  throw new Error("Auth user search exceeded the safety page limit.");
}

async function ensureProfile(admin, userId, spec, createdBy) {
  const { data: existing, error: readError } = await admin
    .from("profiles")
    .select("id, email, role")
    .eq("id", userId)
    .maybeSingle();
  if (readError) throw new Error(`Profile lookup failed: ${readError.message}`);

  if (existing && (existing.email !== spec.email || existing.role !== spec.role)) {
    throw new Error(
      `Reserved Auth user ${spec.email} is attached to a conflicting profile.`
    );
  }

  const values = {
    id: userId,
    full_name: spec.fullName,
    email: spec.email,
    phone: null,
    role: spec.role,
    status: "active",
    created_by: createdBy,
  };

  const { error } = existing
    ? await admin
        .from("profiles")
        .update({
          full_name: values.full_name,
          status: values.status,
        })
        .eq("id", userId)
    : await admin.from("profiles").insert(values);

  if (error) throw new Error(`Profile upsert failed: ${error.message}`);
}

async function ensureStudent(admin, userId, instituteId, createdBy, spec) {
  const { data: existing, error: readError } = await admin
    .from("students")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (readError) throw new Error(`Student lookup failed: ${readError.message}`);

  const values = {
    institute_id: instituteId,
    student_category: spec.studentCategory,
    payment_status: "not_required",
    status: "active",
    current_stage_number: 0,
  };

  const { error } = existing
    ? await admin.from("students").update(values).eq("user_id", userId)
    : await admin.from("students").insert({
        user_id: userId,
        ...values,
        created_by: createdBy,
      });
  if (error) throw new Error(`Student record upsert failed: ${error.message}`);
}

async function ensureEducator(admin, userId, instituteId, createdBy, spec) {
  const { data: existing, error: readError } = await admin
    .from("educators")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (readError) throw new Error(`Educator lookup failed: ${readError.message}`);

  const values = {
    institute_id: instituteId,
    educator_type: spec.educatorType,
    status: "active",
  };

  const { error } = existing
    ? await admin.from("educators").update(values).eq("user_id", userId)
    : await admin.from("educators").insert({
        user_id: userId,
        ...values,
        created_by: createdBy,
      });
  if (error) throw new Error(`Educator record upsert failed: ${error.message}`);
}

async function ensureAccount(admin, spec, password, creatorId, instituteId) {
  let authUser = await findAuthUserByEmail(admin, spec.email);
  let createdNow = false;

  if (authUser) {
    const { data, error } = await admin.auth.admin.updateUserById(authUser.id, {
      password,
      email_confirm: true,
      user_metadata: { full_name: spec.fullName, role: spec.role },
    });
    if (error || !data.user) {
      throw new Error(`Auth update failed for ${spec.email}: ${error?.message}`);
    }
    authUser = data.user;
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: spec.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: spec.fullName, role: spec.role },
    });
    if (error || !data.user) {
      throw new Error(`Auth creation failed for ${spec.email}: ${error?.message}`);
    }
    authUser = data.user;
    createdNow = true;
  }

  try {
    await ensureProfile(admin, authUser.id, spec, creatorId);
    if (spec.role === "student") {
      await ensureStudent(admin, authUser.id, instituteId, creatorId, spec);
    }
    if (spec.role === "educator") {
      await ensureEducator(admin, authUser.id, instituteId, creatorId, spec);
    }
  } catch (error) {
    if (createdNow) await admin.auth.admin.deleteUser(authUser.id);
    throw error;
  }
}

async function verifyAccount(spec, password) {
  const client = createAnonClient();
  const { data, error } = await client.auth.signInWithPassword({
    email: spec.email,
    password,
  });
  if (error || !data.user) {
    throw new Error(`Login verification failed for ${spec.email}.`);
  }

  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("role, status")
    .eq("id", data.user.id)
    .single();
  await client.auth.signOut();

  if (
    profileError ||
    profile?.role !== spec.role ||
    profile?.status !== "active"
  ) {
    throw new Error(`Profile verification failed for ${spec.email}.`);
  }
}

async function main() {
  const { projectRef } = assertFixtureMutationAllowed({
    confirmationFlag: "--confirm-e2e-accounts",
    label: "E2E role account setup",
  });

  if (process.env.ALLOW_E2E_ACCOUNT_SETUP !== "true") {
    throw new Error("ALLOW_E2E_ACCOUNT_SETUP must be exactly true.");
  }
  if (requireEnv("E2E_FIXTURE_PROJECT_REF") !== projectRef) {
    throw new Error("E2E_FIXTURE_PROJECT_REF does not match the target project.");
  }

  const password = requireEnv("E2E_ACCOUNT_PASSWORD");
  if (password.length < 16) {
    throw new Error("E2E account password must contain at least 16 characters.");
  }

  const admin = createServiceClient();
  const { data: creator, error: creatorError } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "admin")
    .eq("status", "active")
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (creatorError || !creator) {
    throw new Error("An existing active Admin profile is required.");
  }

  const { data: institute, error: instituteError } = await admin
    .from("institutes")
    .select("id")
    .eq("status", "active")
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (instituteError || !institute) {
    throw new Error("An active institute is required.");
  }

  for (const spec of ACCOUNT_SPECS) {
    await ensureAccount(admin, spec, password, creator.id, institute.id);
    await verifyAccount(spec, password);
    console.log(`PASS ${spec.role}: ${spec.email}`);
  }

  console.log(`Target project: ${maskProjectRef(projectRef)}`);
  console.log("Dedicated E2E role accounts are ready. Password was not printed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "E2E setup failed.");
  process.exit(1);
});
