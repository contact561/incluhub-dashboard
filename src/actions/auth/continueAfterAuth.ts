"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getDashboardPathForRole } from "@/lib/auth/getDashboardPathForRole";
import type { UserRole } from "@/types/database";

/**
 * After OAuth/code exchange, ensure a profile exists and route correctly.
 * New Google users become students with pending_onboarding.
 */
export async function continueAfterAuth(): Promise<never> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?error=auth_callback_failed");
  }

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("profiles")
    .select("id, role, status")
    .eq("id", user.id)
    .maybeSingle();

  if (!existing) {
    const fullName =
      (typeof user.user_metadata?.full_name === "string" &&
        user.user_metadata.full_name) ||
      (typeof user.user_metadata?.name === "string" && user.user_metadata.name) ||
      user.email?.split("@")[0] ||
      "Student";

    const { error: insertError } = await admin.from("profiles").insert({
      id: user.id,
      email: user.email ?? `${user.id}@users.incluhub.local`,
      full_name: fullName,
      phone: null,
      role: "student",
      status: "pending_onboarding",
      created_by: null,
    });

    if (insertError) {
      await supabase.auth.signOut();
      redirect("/login?error=account_not_setup");
    }

    redirect("/student/onboarding");
  }

  if (existing.status === "pending_onboarding" && existing.role === "student") {
    redirect("/student/onboarding");
  }

  if (existing.status !== "active") {
    await supabase.auth.signOut();
    redirect("/login?error=account_not_active");
  }

  redirect(getDashboardPathForRole(existing.role as UserRole));
}
