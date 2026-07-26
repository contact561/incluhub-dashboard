import { continueAfterAuth } from "@/actions/auth/continueAfterAuth";

/** Server redirect hub after OAuth session is established. */
export default async function AuthContinuePage() {
  await continueAfterAuth();
}
