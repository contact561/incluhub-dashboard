"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirectToDashboardByRole } from "@/lib/auth/redirectToDashboardByRole";
import type { Profile } from "@/types/database";

export type LoginState = {
  error?: string;
};

async function getProfileForAuthUser(userId: string): Promise<Profile | null> {
  // Use service role server-side only — password already verified by Supabase Auth.
  // Avoids RLS/session timing issues immediately after signInWithPassword.
  const admin = createAdminClient();
  const { data: profile, error } = await admin
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error || !profile) {
    return null;
  }

  return profile;
}

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
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      error:
        "Invalid email or password. Contact IncluHub Admin if you do not have an account.",
    };
  }

  const user = data.user;

  if (!user) {
    await supabase.auth.signOut();
    return {
      error:
        "Your account is not fully set up. Please contact IncluHub Admin.",
    };
  }

  const profile = await getProfileForAuthUser(user.id);

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
