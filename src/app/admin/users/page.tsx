import Link from "next/link";
import { DataTable } from "@/components/admin/DataTable";
import { getAdminUsers } from "@/lib/data/admin/users";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, QueryErrorState } from "@/components/status";
import { UsersTable } from "@/components/tables/UsersTable";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function AdminUsersPage() {
  const { users, error } = await getAdminUsers();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Create and manage all user accounts across roles."
        metadata={
          error ? undefined : (
            <span>
              {users.length} {users.length === 1 ? "user" : "users"}
            </span>
          )
        }
        primaryAction={
          <Link
            href="/admin/users/create"
            className={cn(buttonVariants({ size: "sm" }))}
          >
            Create User
          </Link>
        }
      />

      {error ? (
        <QueryErrorState title="Could not load users" message={error} />
      ) : users.length === 0 ? (
        <EmptyState
          title="No users yet"
          description="User accounts will appear here after you create them in profiles."
        />
      ) : (
        <DataTable>
          <div className="p-2">
            <UsersTable users={users} />
          </div>
        </DataTable>
      )}
    </div>
  );
}
