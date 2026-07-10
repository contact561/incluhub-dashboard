import Link from "next/link";
import { getAdminUsers } from "@/lib/data/admin/users";
import { EmptyState } from "@/components/status/EmptyState";
import { QueryErrorState } from "@/components/status/QueryErrorState";
import { RecordPageHeader } from "@/components/tables/RecordPageHeader";
import { UsersTable } from "@/components/tables/UsersTable";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function AdminUsersPage() {
  const { users, error } = await getAdminUsers();

  return (
    <div className="flex min-h-full flex-col">
      <RecordPageHeader
        title="Users"
        description="Create and manage all user accounts across roles."
        count={error ? undefined : users.length}
        actions={
          <Link
            href="/admin/users/create"
            className={cn(buttonVariants({ size: "sm" }))}
          >
            Create User
          </Link>
        }
      />
      <div className="p-6">
        {error ? (
          <QueryErrorState message={error} />
        ) : users.length === 0 ? (
          <EmptyState
            title="No users yet"
            description="User accounts will appear here after you create them in profiles."
          />
        ) : (
          <UsersTable users={users} />
        )}
      </div>
    </div>
  );
}
