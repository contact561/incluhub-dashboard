import { requireRole } from "@/lib/auth/requireRole";
import { RoleLayout } from "@/components/layout/RoleLayout";
import { EXTERNAL_NAV_ITEMS, ROLE_LABELS } from "@/lib/permissions/roles";

export default async function ExternalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireRole("external_member");

  return (
    <RoleLayout
      profile={profile}
      portalTitle={ROLE_LABELS.external_member}
      navItems={EXTERNAL_NAV_ITEMS}
    >
      {children}
    </RoleLayout>
  );
}
