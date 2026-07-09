import { redirect } from "next/navigation";
import type { UserRole } from "@/types/database";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { getDashboardPathForRole } from "@/lib/auth/getDashboardPathForRole";
import type { Profile } from "@/types/database";

export async function requireRole(requiredRole: UserRole): Promise<Profile> {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  if (profile.status !== "active") {
    redirect("/login?error=account_not_active");
  }

  if (profile.role !== requiredRole) {
    redirect(getDashboardPathForRole(profile.role));
  }

  return profile;
}
