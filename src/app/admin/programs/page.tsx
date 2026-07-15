import Link from "next/link";
import { DataTable } from "@/components/admin/DataTable";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, QueryErrorState } from "@/components/status";
import { ProgramsTable } from "@/components/tables/ProgramsTable";
import { getAdminPrograms } from "@/lib/data/admin/programs";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function AdminProgramsPage() {
  const { programs, error } = await getAdminPrograms();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Programs"
        description="Manage Program / Batch records that can include multiple institutes."
        metadata={
          error ? undefined : (
            <span>
              {programs.length}{" "}
              {programs.length === 1 ? "program" : "programs"}
            </span>
          )
        }
        primaryAction={
          <Link
            href="/admin/programs/create"
            className={cn(buttonVariants({ size: "sm" }))}
          >
            Create Program
          </Link>
        }
      />

      {error ? (
        <QueryErrorState title="Could not load programs" message={error} />
      ) : programs.length === 0 ? (
        <EmptyState
          title="No programs yet"
          description="Create a program after adding at least one institute."
        />
      ) : (
        <DataTable>
          <div className="p-2">
            <ProgramsTable programs={programs} />
          </div>
        </DataTable>
      )}
    </div>
  );
}
