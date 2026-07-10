import { requireRole } from "@/lib/auth/requireRole";
import { RoleLayout } from "@/components/layout/RoleLayout";
import { ROLE_LABELS, STUDENT_NAV_ITEMS } from "@/lib/permissions/roles";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireRole("student");

  return (
    <RoleLayout
      profile={profile}
      portalTitle={ROLE_LABELS.student}
      navItems={STUDENT_NAV_ITEMS}
    >
      {children}
    </RoleLayout>
  );
}
