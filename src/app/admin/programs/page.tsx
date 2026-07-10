import Link from "next/link";
import { getAdminPrograms } from "@/lib/data/admin/programs";
import { EmptyState } from "@/components/status/EmptyState";
import { QueryErrorState } from "@/components/status/QueryErrorState";
import { ProgramsTable } from "@/components/tables/ProgramsTable";
import { RecordPageHeader } from "@/components/tables/RecordPageHeader";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function AdminProgramsPage() {
  const { programs, error } = await getAdminPrograms();

  return (
    <div className="flex min-h-full flex-col">
      <RecordPageHeader
        title="Programs"
        description="Manage post-academic programs linked to institutes."
        count={error ? undefined : programs.length}
        actions={
          <Link
            href="/admin/programs/create"
            className={cn(buttonVariants({ size: "sm" }))}
          >
            Create Program
          </Link>
        }
      />
      <div className="p-6">
        {error ? (
          <QueryErrorState message={error} />
        ) : programs.length === 0 ? (
          <EmptyState
            title="No programs yet"
            description="Create a program after adding at least one institute."
          />
        ) : (
          <ProgramsTable programs={programs} />
        )}
      </div>
    </div>
  );
}
