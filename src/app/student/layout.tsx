import { requireRole } from "@/lib/auth/requireRole";
import { RoleLayout } from "@/components/layout/RoleLayout";
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
  const profile = await requireRole("student");
  const ecosystemAccess = await getStudentEcosystemAccess();
  const navItems = [
    ...STUDENT_NAV_ITEMS,
    ...(ecosystemAccess.status === "granted" ||
    ecosystemAccess.status === "under_review"
      ? [STUDENT_ECOSYSTEM_NAV_ITEM]
      : []),
  ];

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
