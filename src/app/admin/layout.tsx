import { requireRole } from "@/lib/auth/requireRole";
import { RoleLayout } from "@/components/layout/RoleLayout";
import { ADMIN_NAV_ITEMS, ROLE_LABELS } from "@/lib/permissions/roles";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireRole("admin");

  return (
    <RoleLayout
      profile={profile}
      portalTitle={ROLE_LABELS.admin}
      navItems={ADMIN_NAV_ITEMS}
    >
      {children}
    </RoleLayout>
  );
}
