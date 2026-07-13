import { createClient } from "@/lib/supabase/server";
import { getTeamStageDetail } from "@/lib/data/admin/team-stage";
import {
  resolveActiveStudentTeamContext,
  STUDENT_PORTAL_ERRORS,
} from "@/lib/data/student/activeTeamContext";
import type { StudentMyStageData, StudentMyStageResult } from "@/types/student-portal";
import type { StageStatus } from "@/types/database";

function formatCurrentStageLabel(stageNumber: number | null): string {
  if (stageNumber === null) {
    return "Not enrolled";
  }

  return `Stage ${stageNumber}`;
}

export async function getStudentMyStagePageData(): Promise<StudentMyStageResult> {
  const { context, error: contextError } =
    await resolveActiveStudentTeamContext();

  if (contextError || !context) {
    return { data: null, error: contextError };
  }

  const supabase = await createClient();

  const [teamResult, stageResult] = await Promise.all([
    supabase
      .from("teams")
      .select(
        `
        team_name,
        current_stage_number,
        stage_status,
        programs!program_id (
          name
        )
      `
      )
      .eq("id", context.teamId)
      .maybeSingle(),
    getTeamStageDetail(context.teamId),
  ]);

  if (teamResult.error) {
    console.error("[getStudentMyStagePageData] team", teamResult.error.message);
    return { data: null, error: STUDENT_PORTAL_ERRORS.stageLoadFailed };
  }

  if (!teamResult.data) {
    return { data: null, error: STUDENT_PORTAL_ERRORS.noTeam };
  }

  if (stageResult.error) {
    console.error("[getStudentMyStagePageData] stage", stageResult.error);
    return { data: null, error: STUDENT_PORTAL_ERRORS.stageLoadFailed };
  }

  const team = teamResult.data as {
    team_name: string;
    current_stage_number: number | null;
    stage_status: StageStatus;
    programs: { name: string } | null;
  };

  const detail = stageResult.detail;
  const journeyEnrolled = detail?.journeyEnrolled === true;

  const currentStageEntry =
    team.current_stage_number !== null
      ? detail?.timeline.find(
          (stage) => stage.stageNumber === team.current_stage_number
        ) ?? null
      : null;

  const stageData: StudentMyStageData = {
    teamName: team.team_name,
    programName: team.programs?.name ?? null,
    currentStageNumber: team.current_stage_number,
    currentStageName: currentStageEntry?.stageName ?? null,
    currentStageStatus: journeyEnrolled ? team.stage_status : "not_started",
    timeline: detail?.timeline ?? [],
    portfolios: detail?.portfolios ?? [],
    journeyEnrolled,
  };

  return { data: stageData, error: null };
}

export { formatCurrentStageLabel };
