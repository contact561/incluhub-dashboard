import Link from "next/link";
import { DataTable } from "@/components/admin/DataTable";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, QueryErrorState } from "@/components/status";
import { TeamsTable } from "@/components/tables/TeamsTable";
import { getAdminTeams } from "@/lib/data/admin/teams";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function AdminTeamsPage() {
  const { teams, error } = await getAdminTeams();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Teams"
        description="Create balanced student teams and assign educators."
        metadata={
          error ? undefined : (
            <span>
              {teams.length} {teams.length === 1 ? "team" : "teams"}
            </span>
          )
        }
        primaryAction={
          <Link
            href="/admin/teams/create"
            className={cn(buttonVariants({ size: "sm" }))}
          >
            Create Team
          </Link>
        }
      />

      {error ? (
        <QueryErrorState title="Could not load teams" message={error} />
      ) : teams.length === 0 ? (
        <EmptyState
          title="No teams yet"
          description="Create your first balanced team with one student and educator per category."
        />
      ) : (
        <DataTable>
          <div className="p-2">
            <TeamsTable teams={teams} />
          </div>
        </DataTable>
      )}
    </div>
  );
}
