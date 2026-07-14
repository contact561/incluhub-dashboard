import { AssignedTeamCard } from "@/components/educator/AssignedTeamCard";
import { EmptyState, QueryErrorState } from "@/components/status";
import { RecordPageHeader } from "@/components/tables/RecordPageHeader";
import { getEducatorAssignedTeams } from "@/lib/data/educator/teams";

export default async function EducatorMyTeamsPage() {
  const { teams, error } = await getEducatorAssignedTeams();

  return (
    <div className="flex min-h-full flex-col">
      <RecordPageHeader
        title="My Teams"
        description="Active teams where you have an assigned student mapping."
        count={error ? undefined : teams.length}
      />
      <div className="space-y-4 p-6">
        {error ? <QueryErrorState message={error} /> : null}

        {!error && teams.length === 0 ? (
          <EmptyState
            title="No assigned teams"
            description="You are not currently mapped to any active team students."
          />
        ) : null}

        {!error && teams.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {teams.map((team) => (
              <AssignedTeamCard key={team.teamId} team={team} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
