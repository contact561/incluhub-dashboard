import { getTeamStageDetail } from "@/lib/data/admin/team-stage";
import { getActiveStageDefinitions } from "@/lib/data/stages/definitions";
import {
  buildRegistryStageViews,
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
  const [definitionsResult, stageDetailResult] = await Promise.all([
    getActiveStageDefinitions(),
    getTeamStageDetail(teamId),
  ]);

  if (definitionsResult.error) {
    return { stages: [], error: definitionsResult.error };
  }

  const progressByStageNumber: Record<number, StageStatus> = {};
  for (const entry of stageDetailResult.detail?.timeline ?? []) {
    progressByStageNumber[entry.stageNumber] = entry.status;
  }

  return {
    stages: buildRegistryStageViews(definitionsResult.stages, {
      currentStageNumber,
      progressByStageNumber,
    }),
    error: stageDetailResult.error,
  };
}
