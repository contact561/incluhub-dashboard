const REQUIRED_SHARED_VARIABLES = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_APP_URL",
  "EXPECTED_SUPABASE_PROJECT_REF",
];

function decodeJwtPayload(value) {
  try {
    const [, payload] = value.split(".");
    if (!payload) return null;

    return JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    );
  } catch {
    return null;
  }
}

function parseHttpsUrl(value, variable, errors) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") {
      errors.push(`${variable} must use HTTPS.`);
    }
    return url;
  } catch {
    errors.push(`${variable} must be a valid absolute URL.`);
    return null;
  }
}

export function validateDeploymentEnv(env, target) {
  const errors = [];

  if (target !== "preview" && target !== "production") {
    return ["Deployment target must be preview or production."];
  }

  for (const variable of REQUIRED_SHARED_VARIABLES) {
    if (!env[variable]?.trim()) {
      errors.push(`${variable} is required.`);
    }
  }

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
    ? parseHttpsUrl(
        env.NEXT_PUBLIC_SUPABASE_URL,
        "NEXT_PUBLIC_SUPABASE_URL",
        errors
      )
    : null;
  const appUrl = env.NEXT_PUBLIC_APP_URL
    ? parseHttpsUrl(env.NEXT_PUBLIC_APP_URL, "NEXT_PUBLIC_APP_URL", errors)
    : null;

  const expectedRef = env.EXPECTED_SUPABASE_PROJECT_REF?.trim();
  const urlRef = supabaseUrl?.hostname.endsWith(".supabase.co")
    ? supabaseUrl.hostname.slice(0, -".supabase.co".length)
    : null;

  if (supabaseUrl && !urlRef) {
    errors.push(
      "NEXT_PUBLIC_SUPABASE_URL must use the project-ref.supabase.co hostname."
    );
  } else if (urlRef && expectedRef && urlRef !== expectedRef) {
    errors.push(
      "NEXT_PUBLIC_SUPABASE_URL does not match EXPECTED_SUPABASE_PROJECT_REF."
    );
  }

  const anonPayload = decodeJwtPayload(env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "");
  if (env.NEXT_PUBLIC_SUPABASE_ANON_KEY && anonPayload?.role !== "anon") {
    errors.push("NEXT_PUBLIC_SUPABASE_ANON_KEY must contain an anon-role JWT.");
  }

  const servicePayload = decodeJwtPayload(env.SUPABASE_SERVICE_ROLE_KEY ?? "");
  if (
    env.SUPABASE_SERVICE_ROLE_KEY &&
    servicePayload?.role !== "service_role"
  ) {
    errors.push(
      "SUPABASE_SERVICE_ROLE_KEY must contain a service_role JWT."
    );
  }

  for (const [label, payload] of [
    ["NEXT_PUBLIC_SUPABASE_ANON_KEY", anonPayload],
    ["SUPABASE_SERVICE_ROLE_KEY", servicePayload],
  ]) {
    if (payload?.ref && expectedRef && payload.ref !== expectedRef) {
      errors.push(`${label} does not match EXPECTED_SUPABASE_PROJECT_REF.`);
    }
  }

  if (target === "production") {
    if (env.ALLOW_DESTRUCTIVE_TEST_RESET === "true") {
      errors.push("ALLOW_DESTRUCTIVE_TEST_RESET must not be true in production.");
    }

    const productionRef = env.PRODUCTION_SUPABASE_PROJECT_REF?.trim();
    if (!productionRef) {
      errors.push("PRODUCTION_SUPABASE_PROJECT_REF is required in production.");
    } else if (expectedRef && productionRef !== expectedRef) {
      errors.push(
        "EXPECTED_SUPABASE_PROJECT_REF must match PRODUCTION_SUPABASE_PROJECT_REF."
      );
    }

    const ecosystemUrl = env.NEXT_PUBLIC_ECOSYSTEM_APP_URL?.trim();
    if (!ecosystemUrl) {
      errors.push("NEXT_PUBLIC_ECOSYSTEM_APP_URL is required in production.");
    } else {
      const parsed = parseHttpsUrl(
        ecosystemUrl,
        "NEXT_PUBLIC_ECOSYSTEM_APP_URL",
        errors
      );
      if (
        parsed?.hostname.endsWith(".invalid") ||
        /placeholder/i.test(ecosystemUrl)
      ) {
        errors.push(
          "NEXT_PUBLIC_ECOSYSTEM_APP_URL must be a reviewed, non-placeholder URL."
        );
      }
    }
  }

  if (appUrl?.hostname.endsWith(".invalid")) {
    errors.push("NEXT_PUBLIC_APP_URL must not use an invalid placeholder host.");
  }

  return errors;
}
