import { validateDeploymentEnv } from "./deployment-env.mjs";

const target = process.argv[2];
const errors = validateDeploymentEnv(process.env, target);

if (errors.length > 0) {
  console.error(`Deployment environment validation failed (${target ?? "unknown"}):`);
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Deployment environment validation passed for ${target}.`);
