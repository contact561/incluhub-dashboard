import { createClient } from "@/lib/supabase/server";
import type {
  TeamPortfolioSummary,
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
      return "Unlocks after Brand Opportunity proof is approved.";
    default:
      return "This stage is not yet available.";
  }
}

function stagePresentation(stage: {
  stage_number: number;
  name: string;
  description: string | null;
}) {
  if (stage.stage_number === 4) {
    return {
      name: "Brand Opportunity",
      description:
        "Admin assigns a private brief; the team submits mandatory proof for Admin review.",
    };
  }

  if (stage.stage_number === 5) {
    return {
      name: "Final Review",
      description:
        "Ecosystem access remains locked until the separate Admin final approval.",
    };
  }

  return { name: stage.name, description: stage.description };
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
        bms_remarks,
        brand_works_date,
        brand_works_remarks,
        brand_works_scheduled_at,
        brand_works_scheduled_by,
        brand_works_completed_at,
        brand_works_completed_by
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
        leader_student_id,
        portfolio_submissions (
          title,
          portfolio_url,
          version_number
        )
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
      /brand_works_|workflow_status|bms_session_date|portfolio_workflow_status|portfolio_submissions/i.test(
        firstError
      );

    return {
      detail: null,
      error: migrationHint
        ? "A required database migration has not been applied. Apply migrations through 013_stage4_brand_works.sql."
        : firstError,
    };
  }

  const progressRows = (progressResult.data ?? []) as Array<{
        stage_number: number;
        status: StageStatus;
        started_at: string | null;
        completed_at: string | null;
        bms_session_date: string | null;
        bms_remarks: string | null;
        brand_works_date: string | null;
        brand_works_remarks: string | null;
        brand_works_scheduled_at: string | null;
        brand_works_scheduled_by: string | null;
        brand_works_completed_at: string | null;
        brand_works_completed_by: string | null;
      }>;

  const journeyEnrolled = progressRows.length > 0;

  const progressByStage = new Map(
    progressRows.map((row) => [row.stage_number, row])
  );

  const timeline: TeamStageTimelineEntry[] = journeyEnrolled
    ? (
        (stagesResult.data ?? []) as Array<{
          stage_number: number;
          name: string;
          description: string | null;
        }>
      ).map((stage) => {
        const progress = progressByStage.get(stage.stage_number);
        const status = progress?.status ?? "locked";
        const presentation = stagePresentation(stage);

        return {
          stageNumber: stage.stage_number,
          stageName: presentation.name,
          description: presentation.description,
          status,
          startedAt: progress?.started_at ?? null,
          completedAt: progress?.completed_at ?? null,
          bmsSessionDate: progress?.bms_session_date ?? null,
          bmsRemarks: progress?.bms_remarks ?? null,
          brandWorksDate: progress?.brand_works_date ?? null,
          brandWorksRemarks: progress?.brand_works_remarks ?? null,
          brandWorksScheduledAt: progress?.brand_works_scheduled_at ?? null,
          brandWorksScheduledBy: progress?.brand_works_scheduled_by ?? null,
          brandWorksCompletedAt: progress?.brand_works_completed_at ?? null,
          brandWorksCompletedBy: progress?.brand_works_completed_by ?? null,
          lockedReason: lockedReasonForStage(stage.stage_number, status),
        };
      })
    : [];

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
      portfolio_submissions:
        | Array<{
            title: string;
            portfolio_url: string;
            version_number: number;
          }>
        | null;
    }>
  )
    .filter((row) => row.sequence_order !== null && row.workflow_status !== null)
    .map((row) => {
      const latestSubmission = (row.portfolio_submissions ?? [])
        .slice()
        .sort((a, b) => b.version_number - a.version_number)[0];

      return {
        id: row.id,
        sequenceOrder: row.sequence_order as number,
        portfolioType: row.portfolio_type,
        workflowStatus: row.workflow_status as PortfolioWorkflowStatus,
        leaderName: leaderNameByStudentId.get(row.leader_student_id) ?? "—",
        submissionTitle: latestSubmission?.title ?? null,
        submissionUrl: latestSubmission?.portfolio_url ?? null,
      };
    });

  const stage2 = progressByStage.get(2);
  const stage2InProgress = stage2?.status === "in_progress";
  const bmsAlreadyCompleted = stage2?.status === "completed";
  const stage4 = progressByStage.get(4);
  const stage4InProgress = stage4?.status === "in_progress";
  const brandWorksScheduled = Boolean(
    stage4?.brand_works_date && stage4?.brand_works_scheduled_at
  );
  const brandWorksCompleted = Boolean(
    stage4?.status === "completed" && stage4?.brand_works_completed_at
  );

  return {
    detail: {
      timeline,
      portfolios,
      stage2InProgress,
      bmsAlreadyCompleted,
      stage4InProgress,
      brandWorksScheduled,
      brandWorksCompleted,
      journeyEnrolled,
    },
    error: null,
  };
}
