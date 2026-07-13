import { createClient } from "@/lib/supabase/server";
import type {
  TeamPortfolioSummary,
  TeamStageDetail,
  TeamStageDetailResult,
  TeamStageTimelineEntry,
} from "@/types/stage-management";
import type {
  PortfolioWorkflowStatus,
  StageStatus,
  StudentCategory,
} from "@/types/database";

function lockedReasonForStage(
  stageNumber: number,
  status: StageStatus
): string | null {
  if (status !== "locked") {
    return null;
  }

  switch (stageNumber) {
    case 1:
      return "Unlocks after onboarding is completed.";
    case 2:
      return "Unlocks after team assignment is completed.";
    case 3:
      return "Unlocks after the BMS session is completed.";
    case 4:
      return "Unlocks after all three portfolio outputs are approved.";
    case 5:
      return "Unlocks after the brand/creative project is approved.";
    default:
      return "This stage is not yet available.";
  }
}

export async function getTeamStageDetail(
  teamId: string
): Promise<TeamStageDetailResult> {
  const supabase = await createClient();

  const [stagesResult, progressResult, portfoliosResult, membersResult] =
    await Promise.all([
    supabase
      .from("stages")
      .select("stage_number, name, description")
      .order("stage_number", { ascending: true }),
    supabase
      .from("team_stage_progress")
      .select(
        `
        stage_number,
        status,
        started_at,
        completed_at,
        bms_session_date,
        bms_remarks
      `
      )
      .eq("team_id", teamId)
      .order("stage_number", { ascending: true }),
    supabase
      .from("portfolio_outputs")
      .select(
        `
        id,
        sequence_order,
        portfolio_type,
        workflow_status,
        leader_student_id
      `
      )
      .eq("team_id", teamId)
      .order("sequence_order", { ascending: true }),
    supabase
      .from("team_members")
      .select(
        `
        student_id,
        member_status,
        students!student_id (
          profiles!user_id (
            full_name
          )
        )
      `
      )
      .eq("team_id", teamId),
  ]);

  const firstError =
    stagesResult.error?.message ||
    progressResult.error?.message ||
    portfoliosResult.error?.message ||
    membersResult.error?.message ||
    null;

  if (firstError) {
    console.error("[getTeamStageDetail]", firstError);

    const migrationHint =
      /workflow_status|bms_session_date|portfolio_workflow_status/i.test(
        firstError
      );

    return {
      detail: null,
      error: migrationHint
        ? "Database migration has not been applied. Run 006_stage_bms_foundation.sql in Supabase."
        : firstError,
    };
  }

  const progressByStage = new Map(
    (
      (progressResult.data ?? []) as Array<{
        stage_number: number;
        status: StageStatus;
        started_at: string | null;
        completed_at: string | null;
        bms_session_date: string | null;
        bms_remarks: string | null;
      }>
    ).map((row) => [row.stage_number, row])
  );

  const timeline: TeamStageTimelineEntry[] = (
    (stagesResult.data ?? []) as Array<{
      stage_number: number;
      name: string;
      description: string | null;
    }>
  ).map((stage) => {
    const progress = progressByStage.get(stage.stage_number);
    const status = progress?.status ?? "locked";

    return {
      stageNumber: stage.stage_number,
      stageName: stage.name,
      description: stage.description,
      status,
      startedAt: progress?.started_at ?? null,
      completedAt: progress?.completed_at ?? null,
      bmsSessionDate: progress?.bms_session_date ?? null,
      bmsRemarks: progress?.bms_remarks ?? null,
      lockedReason: lockedReasonForStage(stage.stage_number, status),
    };
  });

  const leaderNameByStudentId = new Map(
    (
      (membersResult.data ?? []) as Array<{
        student_id: string;
        member_status: string;
        students: {
          profiles: { full_name: string } | null;
        } | null;
      }>
    )
      .filter((member) => member.member_status === "active")
      .map((member) => [
        member.student_id,
        member.students?.profiles?.full_name ?? "—",
      ])
  );

  const portfolios: TeamPortfolioSummary[] = (
    (portfoliosResult.data ?? []) as Array<{
      id: string;
      sequence_order: number | null;
      portfolio_type: StudentCategory;
      workflow_status: PortfolioWorkflowStatus | null;
      leader_student_id: string;
    }>
  )
    .filter((row) => row.sequence_order !== null && row.workflow_status !== null)
    .map((row) => ({
      id: row.id,
      sequenceOrder: row.sequence_order as number,
      portfolioType: row.portfolio_type,
      workflowStatus: row.workflow_status as PortfolioWorkflowStatus,
      leaderName: leaderNameByStudentId.get(row.leader_student_id) ?? "—",
    }));

  const stage2 = progressByStage.get(2);
  const stage2InProgress = stage2?.status === "in_progress";
  const bmsAlreadyCompleted = stage2?.status === "completed";

  return {
    detail: {
      timeline,
      portfolios,
      stage2InProgress,
      bmsAlreadyCompleted,
    },
    error: null,
  };
}
