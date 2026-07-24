import { getTeamStageDetail } from "@/lib/data/admin/team-stage";
import { getActiveStageDefinitions } from "@/lib/data/stages/definitions";
import { getStudentStage3PortfolioContext } from "@/lib/data/student/portfolio";
import {
  buildRegistryStageViews,
  type RegistryStageView,
} from "@/lib/stages/registryProgress";
import type { StageStatus } from "@/types/database";

export async function getStudentRegistryTimeline(): Promise<{
  stages: RegistryStageView[];
  currentStageNumber: number | null;
  teamName: string | null;
  error: string | null;
}> {
  const definitionsResult = await getActiveStageDefinitions();
  if (definitionsResult.error) {
    return {
      stages: [],
      currentStageNumber: null,
      teamName: null,
      error: definitionsResult.error,
    };
  }

  const { data: portfolioContext, error: portfolioError } =
    await getStudentStage3PortfolioContext();

  if (portfolioError) {
    return {
      stages: buildRegistryStageViews(definitionsResult.stages, {
        currentStageNumber: null,
      }),
      currentStageNumber: null,
      teamName: null,
      error: null,
    };
  }

  if (!portfolioContext) {
    return {
      stages: buildRegistryStageViews(definitionsResult.stages, {
        currentStageNumber: null,
      }),
      currentStageNumber: null,
      teamName: null,
      error: null,
    };
  }

  const { detail } = await getTeamStageDetail(portfolioContext.teamId);
  const progressByStageNumber: Record<number, StageStatus> = {};
  for (const entry of detail?.timeline ?? []) {
    progressByStageNumber[entry.stageNumber] = entry.status;
  }

  return {
    stages: buildRegistryStageViews(definitionsResult.stages, {
      currentStageNumber: portfolioContext.currentStageNumber,
      progressByStageNumber,
    }),
    currentStageNumber: portfolioContext.currentStageNumber,
    teamName: portfolioContext.teamName,
    error: null,
  };
}
