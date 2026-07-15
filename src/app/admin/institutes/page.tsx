import Link from "next/link";
import { DataTable } from "@/components/admin/DataTable";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, QueryErrorState } from "@/components/status";
import { InstitutesTable } from "@/components/tables/InstitutesTable";
import { getAdminInstitutes } from "@/lib/data/admin/institutes";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function AdminInstitutesPage() {
  const { institutes, error } = await getAdminInstitutes();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Institutes"
        description="Manage academy and institute records used by students and educators."
        metadata={
          error ? undefined : (
            <span>
              {institutes.length}{" "}
              {institutes.length === 1 ? "institute" : "institutes"}
            </span>
          )
        }
        primaryAction={
          <Link
            href="/admin/institutes/create"
            className={cn(buttonVariants({ size: "sm" }))}
          >
            Create Institute
          </Link>
        }
      />

      {error ? (
        <QueryErrorState title="Could not load institutes" message={error} />
      ) : institutes.length === 0 ? (
        <EmptyState
          title="No institutes yet"
          description="Create an institute before adding students, educators, or programs."
        />
      ) : (
        <DataTable>
          <div className="p-2">
            <InstitutesTable institutes={institutes} />
          </div>
        </DataTable>
      )}
    </div>
  );
}
