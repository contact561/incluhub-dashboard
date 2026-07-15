import { logoutAction } from "@/actions/auth/logout";
import { AppShell } from "@/components/layout/AppShell";
import { MobileNavigation } from "@/components/layout/MobileNavigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import type { NavItem } from "@/lib/permissions/roles";
import type { Profile } from "@/types/database";

type RoleLayoutProps = {
  profile: Profile;
  portalTitle: string;
  navItems: NavItem[];
  children: React.ReactNode;
};

export function RoleLayout({
  profile,
  portalTitle,
  navItems,
  children,
}: RoleLayoutProps) {
  return (
    <AppShell
      sidebar={<Sidebar title={portalTitle} navItems={navItems} />}
      mobileHeader={
        <MobileNavigation
          title={portalTitle}
          navItems={navItems}
          userName={profile.full_name}
        />
      }
      header={
        <header className="hidden h-14 items-center justify-between border-b border-border-default bg-surface-card px-6 md:flex">
          <p className="text-sm text-text-muted">
            Signed in as{" "}
            <span className="font-medium text-text-primary">
              {profile.full_name}
            </span>
          </p>
          <form action={logoutAction}>
            <Button type="submit" variant="outline" size="sm">
              Sign out
            </Button>
          </form>
        </header>
      }
    >
      {children}
    </AppShell>
  );
}
