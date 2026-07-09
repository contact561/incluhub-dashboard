import { requireRole } from "@/lib/auth/requireRole";
import { logoutAction } from "@/actions/auth/logout";
import { Button } from "@/components/ui/button";

export default async function ExternalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireRole("external_member");

  return (
    <div className="flex min-h-screen bg-zinc-50">
      <header className="fixed right-0 top-0 z-10 flex items-center gap-4 p-4">
        <span className="text-sm text-zinc-600">{profile.full_name}</span>
        <form action={logoutAction}>
          <Button type="submit" variant="outline" size="sm">
            Sign out
          </Button>
        </form>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
