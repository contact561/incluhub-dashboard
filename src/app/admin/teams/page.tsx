import Link from "next/link";
import { getAdminTeams } from "@/lib/data/admin/teams";
import { EmptyState } from "@/components/status/EmptyState";
import { QueryErrorState } from "@/components/status/QueryErrorState";
import { RecordPageHeader } from "@/components/tables/RecordPageHeader";
import { TeamsTable } from "@/components/tables/TeamsTable";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function AdminTeamsPage() {
  const { teams, error } = await getAdminTeams();

  return (
    <div className="flex min-h-full flex-col">
      <RecordPageHeader
        title="Teams"
        description="Create balanced student teams and assign educators."
        count={error ? undefined : teams.length}
        actions={
          <Link
            href="/admin/teams/create"
            className={cn(buttonVariants({ size: "sm" }))}
          >
            Create Team
          </Link>
        }
      />
      <div className="p-6">
        {error ? (
          <QueryErrorState message={error} />
        ) : teams.length === 0 ? (
          <EmptyState
            title="No teams yet"
            description="Create your first balanced team with one student and educator per category."
          />
        ) : (
          <TeamsTable teams={teams} />
        )}
      </div>
    </div>
  );
}
