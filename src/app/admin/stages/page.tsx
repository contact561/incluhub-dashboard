import { AdminStageBoard } from "@/components/admin/stages/AdminStageBoard";
import { PageHeader } from "@/components/layout/PageHeader";
import { QueryErrorState } from "@/components/status";
import { getAdminStageBoard } from "@/lib/data/admin/stages";

export default async function AdminStagesPage() {
  const { data, error } = await getAdminStageBoard();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stage Board"
        description="Track enrolled students awaiting teams and team progression across Stages 2–5."
      />

      {error ? (
        <QueryErrorState title="Could not load stage board" message={error} />
      ) : null}

      {data ? (
        <AdminStageBoard
          awaitingAssignment={data.awaitingAssignment}
          notEnrolledTeams={data.notEnrolledTeams}
          stage2Teams={data.stage2Teams}
          stage3Teams={data.stage3Teams}
          stage4Teams={data.stage4Teams}
          stage5Teams={data.stage5Teams}
        />
      ) : null}
    </div>
  );
}
