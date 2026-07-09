"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { redirectToDashboardByRole } from "@/lib/auth/redirectToDashboardByRole";

export type LoginState = {
  error?: string;
};

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return {
      error:
        "Invalid email or password. Contact IncluHub Admin if you do not have an account.",
    };
  }

  const profile = await getCurrentProfile();

  if (!profile) {
    await supabase.auth.signOut();
    return {
      error:
        "Your account is not fully set up. Please contact IncluHub Admin.",
    };
  }

  if (profile.status !== "active") {
    await supabase.auth.signOut();
    return {
      error: "Your account is not active. Please contact IncluHub Admin.",
    };
  }

  redirectToDashboardByRole(profile.role);
}
