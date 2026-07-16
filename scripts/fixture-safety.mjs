const PLACEHOLDER_RE = /^(your_|replace_|example|placeholder)/i;

function required(values, name) {
  const value = values[name];
  if (!value || PLACEHOLDER_RE.test(value)) {
    throw new Error(`${name} must be set to a non-placeholder value.`);
  }
  return value;
}

function projectRefFromUrl(url) {
  const parsed = new URL(url);
  if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
    return "local";
  }
  const match = parsed.hostname.match(/^([a-z0-9-]+)\.supabase\.co$/i);
  if (!match) {
    throw new Error("Supabase URL is not a recognized local or hosted project URL.");
  }
  return match[1];
}

export function maskProjectRef(value) {
  if (value === "local") return value;
  if (value.length <= 6) return "***";
  return `${value.slice(0, 3)}…${value.slice(-3)}`;
}

export function assertFixtureMutationAllowed({
  confirmationFlag,
  label,
  values = process.env,
}) {
  if (!process.argv.includes(confirmationFlag)) {
    throw new Error(
      `${label} requires the explicit ${confirmationFlag} command-line flag.`
    );
  }

  if (values.ALLOW_DESTRUCTIVE_TEST_RESET !== "true") {
    throw new Error(
      "ALLOW_DESTRUCTIVE_TEST_RESET must be exactly true for fixture mutations."
    );
  }

  const url = required(values, "NEXT_PUBLIC_SUPABASE_URL");
  const expectedRef = required(values, "EXPECTED_SUPABASE_PROJECT_REF");
  const actualRef = projectRefFromUrl(url);

  if (actualRef !== expectedRef) {
    throw new Error(
      `Project ref mismatch (actual=${maskProjectRef(actualRef)}, expected=${maskProjectRef(expectedRef)}).`
    );
  }

  const productionRef = values.PRODUCTION_SUPABASE_PROJECT_REF;
  if (productionRef && actualRef === productionRef) {
    throw new Error("The target matches PRODUCTION_SUPABASE_PROJECT_REF. Aborting.");
  }

  if (/prod(uction)?/i.test(url) || /prod(uction)?/i.test(actualRef)) {
    throw new Error("The target appears to be production. Aborting.");
  }

  return { projectRef: actualRef, url };
}
