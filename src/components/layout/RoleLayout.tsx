import { logoutAction } from "@/actions/auth/logout";
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
    <div className="flex min-h-screen bg-zinc-50">
      <Sidebar title={portalTitle} navItems={navItems} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-6">
          <p className="text-sm text-zinc-500">
            Signed in as{" "}
            <span className="font-medium text-zinc-900">{profile.full_name}</span>
          </p>
          <form action={logoutAction}>
            <Button type="submit" variant="outline" size="sm">
              Sign out
            </Button>
          </form>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
