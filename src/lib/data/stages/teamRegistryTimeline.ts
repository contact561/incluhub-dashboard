import { getTeamStageDetail } from "@/lib/data/admin/team-stage";
import { getTeamMoodBoardSummary } from "@/lib/data/moodboard";
import { getActiveStageDefinitions } from "@/lib/data/stages/definitions";
import {
  buildRegistryStageViews,
  moodBoardStatusToRegistry,
  portfolioStudioStatusToRegistry,
  type RegistryStageView,
} from "@/lib/stages/registryProgress";
import type { StageStatus } from "@/types/database";

export async function getTeamRegistryTimeline(
  teamId: string,
  currentStageNumber: number | null
): Promise<{
  stages: RegistryStageView[];
  error: string | null;
}> {
  const [definitionsResult, stageDetailResult, moodSummary] = await Promise.all([
    getActiveStageDefinitions(),
    getTeamStageDetail(teamId),
    getTeamMoodBoardSummary(teamId),
  ]);

  if (definitionsResult.error) {
    return { stages: [], error: definitionsResult.error };
  }

  const progressByStageNumber: Record<number, StageStatus> = {};
  for (const entry of stageDetailResult.detail?.timeline ?? []) {
    progressByStageNumber[entry.stageNumber] = entry.status;
  }

  const bmsCompleted = progressByStageNumber[2] === "completed";
  const moodProgress = moodBoardStatusToRegistry(
    moodSummary.latestStatus,
    bmsCompleted
  );
  const moodApproved = moodProgress === "completed";

  return {
    stages: buildRegistryStageViews(definitionsResult.stages, {
      currentStageNumber,
      progressByStageNumber,
      progressByCode: {
        mood_board: moodProgress,
        portfolio_studio: portfolioStudioStatusToRegistry({
          moodApproved,
          stage3Status: progressByStageNumber[3],
          currentStageNumber,
        }),
      },
    }),
    error: stageDetailResult.error ?? moodSummary.error,
  };
}
