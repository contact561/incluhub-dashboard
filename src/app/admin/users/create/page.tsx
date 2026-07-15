import Link from "next/link";
import { CreateUserForm } from "@/components/forms/CreateUserForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { buttonVariants } from "@/components/ui/button";
import { getActiveInstituteOptions } from "@/lib/data/admin/institutes";
import { cn } from "@/lib/utils";

export default async function AdminCreateUserPage() {
  const institutes = await getActiveInstituteOptions();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create User"
        description="Create a login account and matching profile / role records."
        secondaryActions={
          <Link
            href="/admin/users"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Back to Users
          </Link>
        }
      />
      <div className="max-w-2xl rounded-[var(--radius-card)] border border-border-default bg-surface-card p-4 sm:p-5">
        <CreateUserForm institutes={institutes} />
      </div>
    </div>
  );
}
