import assert from "node:assert/strict";
import test from "node:test";
import { validateDeploymentEnv } from "./deployment-env.mjs";

function jwt(payload) {
  return [
    Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url"),
    Buffer.from(JSON.stringify(payload)).toString("base64url"),
    "test-signature",
  ].join(".");
}

function validEnv() {
  const ref = "abcdefghijklmnopqrst";
  return {
    NEXT_PUBLIC_SUPABASE_URL: `https://${ref}.supabase.co`,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: jwt({ role: "anon", ref }),
    SUPABASE_SERVICE_ROLE_KEY: jwt({ role: "service_role", ref }),
    NEXT_PUBLIC_APP_URL: "https://dashboard.incluhub.in",
    EXPECTED_SUPABASE_PROJECT_REF: ref,
    PRODUCTION_SUPABASE_PROJECT_REF: ref,
    NEXT_PUBLIC_ECOSYSTEM_APP_URL: "https://ecosystem.incluhub.in",
    ALLOW_DESTRUCTIVE_TEST_RESET: "false",
  };
}

test("accepts a complete production environment", () => {
  assert.deepEqual(validateDeploymentEnv(validEnv(), "production"), []);
});

test("allows preview without a final ecosystem destination", () => {
  const env = validEnv();
  delete env.NEXT_PUBLIC_ECOSYSTEM_APP_URL;
  delete env.PRODUCTION_SUPABASE_PROJECT_REF;

  assert.deepEqual(validateDeploymentEnv(env, "preview"), []);
});

test("rejects mismatched Supabase projects and key roles", () => {
  const env = validEnv();
  env.NEXT_PUBLIC_SUPABASE_URL = "https://wrongprojectref.supabase.co";
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY = jwt({
    role: "service_role",
    ref: "wrongprojectref",
  });

  const errors = validateDeploymentEnv(env, "production");
  assert(errors.some((error) => error.includes("URL does not match")));
  assert(errors.some((error) => error.includes("anon-role JWT")));
  assert(errors.some((error) => error.includes("ANON_KEY does not match")));
});

test("rejects unsafe production-only values", () => {
  const env = validEnv();
  env.ALLOW_DESTRUCTIVE_TEST_RESET = "true";
  env.NEXT_PUBLIC_ECOSYSTEM_APP_URL =
    "https://example.invalid/ecosystem-placeholder";

  const errors = validateDeploymentEnv(env, "production");
  assert(errors.some((error) => error.includes("must not be true")));
  assert(errors.some((error) => error.includes("non-placeholder URL")));
});

test("never accepts an unknown deployment target", () => {
  assert.deepEqual(validateDeploymentEnv(validEnv(), "staging"), [
    "Deployment target must be preview or production.",
  ]);
});
