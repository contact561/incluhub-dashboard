import Link from "next/link";
import { getAdminInstitutes } from "@/lib/data/admin/institutes";
import { EmptyState } from "@/components/status/EmptyState";
import { QueryErrorState } from "@/components/status/QueryErrorState";
import { InstitutesTable } from "@/components/tables/InstitutesTable";
import { RecordPageHeader } from "@/components/tables/RecordPageHeader";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function AdminInstitutesPage() {
  const { institutes, error } = await getAdminInstitutes();

  return (
    <div className="flex min-h-full flex-col">
      <RecordPageHeader
        title="Institutes"
        description="Manage academy and institute records used by students and educators."
        count={error ? undefined : institutes.length}
        actions={
          <Link
            href="/admin/institutes/create"
            className={cn(buttonVariants({ size: "sm" }))}
          >
            Create Institute
          </Link>
        }
      />
      <div className="p-6">
        {error ? (
          <QueryErrorState message={error} />
        ) : institutes.length === 0 ? (
          <EmptyState
            title="No institutes yet"
            description="Create an institute before adding students, educators, or programs."
          />
        ) : (
          <InstitutesTable institutes={institutes} />
        )}
      </div>
    </div>
  );
}
