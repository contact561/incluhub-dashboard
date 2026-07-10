import { requireRole } from "@/lib/auth/requireRole";
import { RoleLayout } from "@/components/layout/RoleLayout";
import { EDUCATOR_NAV_ITEMS, ROLE_LABELS } from "@/lib/permissions/roles";

export default async function EducatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireRole("educator");

  return (
    <RoleLayout
      profile={profile}
      portalTitle={ROLE_LABELS.educator}
      navItems={EDUCATOR_NAV_ITEMS}
    >
      {children}
    </RoleLayout>
  );
}
