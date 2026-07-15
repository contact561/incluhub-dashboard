import { AssignedTeamCard } from "@/components/educator/AssignedTeamCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, QueryErrorState } from "@/components/status";
import { getEducatorAssignedTeams } from "@/lib/data/educator/teams";

export default async function EducatorMyTeamsPage() {
  const { teams, error } = await getEducatorAssignedTeams();

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Teams"
        description="Active teams where you have an assigned student mapping."
        metadata={
          error ? undefined : (
            <span>
              {teams.length} {teams.length === 1 ? "team" : "teams"}
            </span>
          )
        }
      />

      {error ? (
        <QueryErrorState
          title="Could not load teams"
          message={error}
        />
      ) : null}

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
  );
}
