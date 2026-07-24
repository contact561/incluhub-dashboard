import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { RoleLayout } from "@/components/layout/RoleLayout";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { getDashboardPathForRole } from "@/lib/auth/getDashboardPathForRole";
import { getStudentEcosystemAccess } from "@/lib/data/student/ecosystem";
import {
  ROLE_LABELS,
  STUDENT_ECOSYSTEM_NAV_ITEM,
  STUDENT_NAV_ITEMS,
} from "@/lib/permissions/roles";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  if (profile.role !== "student") {
    redirect(getDashboardPathForRole(profile.role));
  }

  const headerList = await headers();
  const pathname =
    headerList.get("x-pathname") ??
    headerList.get("x-invoke-path") ??
    headerList.get("next-url") ??
    "";

  const onOnboarding =
    pathname.includes("/student/onboarding") ||
    // Fallback when pathname header missing: only onboarding page uses bare shell.
    false;

  if (profile.status === "pending_onboarding") {
    // Proxy should keep pending students on /student/onboarding.
    // Render children without portal chrome so the onboarding page can be full-screen.
    return <>{children}</>;
  }

  if (profile.status !== "active") {
    redirect("/login?error=account_not_active");
  }

  if (onOnboarding) {
    redirect("/student/dashboard");
  }

  const ecosystemAccess = await getStudentEcosystemAccess();
  const navItems =
    ecosystemAccess.status === "granted"
      ? [...STUDENT_NAV_ITEMS, STUDENT_ECOSYSTEM_NAV_ITEM]
      : STUDENT_NAV_ITEMS;

  return (
    <RoleLayout
      profile={profile}
      portalTitle={ROLE_LABELS.student}
      navItems={navItems}
    >
      {children}
    </RoleLayout>
  );
}
