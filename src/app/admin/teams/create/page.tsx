import Link from "next/link";
import { CreateTeamForm } from "@/components/forms/CreateTeamForm";
import { QueryErrorState } from "@/components/status/QueryErrorState";
import { RecordPageHeader } from "@/components/tables/RecordPageHeader";
import { buttonVariants } from "@/components/ui/button";
import { getTeamCreateOptions } from "@/lib/data/admin/teams";
import { cn } from "@/lib/utils";

export default async function AdminCreateTeamPage() {
  const { options, error } = await getTeamCreateOptions();

  return (
    <div className="flex min-h-full flex-col">
      <RecordPageHeader
        title="Create Team"
        description="Create one balanced team from students enrolled in a shared Program / Batch."
        actions={
          <Link
            href="/admin/teams"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Back to Teams
          </Link>
        }
      />
      <div className="p-6">
        {error ? (
          <QueryErrorState message={error} />
        ) : (
          <CreateTeamForm options={options} />
        )}
      </div>
    </div>
  );
}
