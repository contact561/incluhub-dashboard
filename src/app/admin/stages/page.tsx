import { getAdminStageBoard } from "@/lib/data/admin/stages";
import { StageBoard } from "@/components/stages/StageBoard";
import { QueryErrorState } from "@/components/status/QueryErrorState";
import { RecordPageHeader } from "@/components/tables/RecordPageHeader";

export default async function AdminStagesPage() {
  const { data, error } = await getAdminStageBoard();

  return (
    <div className="flex min-h-full flex-col">
      <RecordPageHeader
        title="Stages"
        description="Track enrolled students awaiting teams and team progression across Stages 2–5."
      />
      <div className="p-6">
        {error ? (
          <QueryErrorState message={error} />
        ) : data ? (
          <StageBoard
            awaitingAssignment={data.awaitingAssignment}
            notEnrolledTeams={data.notEnrolledTeams}
            stage2Teams={data.stage2Teams}
            stage3Teams={data.stage3Teams}
            stage4Teams={data.stage4Teams}
            stage5Teams={data.stage5Teams}
          />
        ) : null}
      </div>
    </div>
  );
}
