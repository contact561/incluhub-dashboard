import Link from "next/link";
import { CreateTeamForm } from "@/components/forms/CreateTeamForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { QueryErrorState } from "@/components/status";
import { buttonVariants } from "@/components/ui/button";
import { getTeamCreateOptions } from "@/lib/data/admin/teams";
import { cn } from "@/lib/utils";

export default async function AdminCreateTeamPage() {
  const { options, error } = await getTeamCreateOptions();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Team"
        description="Create one balanced team from students enrolled in a shared Program / Batch."
        secondaryActions={
          <Link
            href="/admin/teams"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Back to Teams
          </Link>
        }
      />
      {error ? (
        <QueryErrorState title="Could not load create options" message={error} />
      ) : (
        <div className="max-w-2xl rounded-[var(--radius-card)] border border-border-default bg-surface-card p-4 sm:p-5">
          <CreateTeamForm options={options} />
        </div>
      )}
    </div>
  );
}
