import { getTeamStageDetail } from "@/lib/data/admin/team-stage";
import { getOwnMoodBoardSubmissions } from "@/lib/data/moodboard";
import { getActiveStageDefinitions } from "@/lib/data/stages/definitions";
import { getStudentStage3PortfolioContext } from "@/lib/data/student/portfolio";
import {
  buildRegistryStageViews,
  moodBoardStatusToRegistry,
  portfolioStudioStatusToRegistry,
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

  const [{ detail }, moodResult] = await Promise.all([
    getTeamStageDetail(portfolioContext.teamId),
    getOwnMoodBoardSubmissions(),
  ]);

  const progressByStageNumber: Record<number, StageStatus> = {};
  for (const entry of detail?.timeline ?? []) {
    progressByStageNumber[entry.stageNumber] = entry.status;
  }

  const bmsCompleted = progressByStageNumber[2] === "completed";
  const latestMood = moodResult.rows[0]?.status ?? null;
  const moodProgress = moodBoardStatusToRegistry(latestMood, bmsCompleted);
  const moodApproved = moodProgress === "completed";

  return {
    stages: buildRegistryStageViews(definitionsResult.stages, {
      currentStageNumber: portfolioContext.currentStageNumber,
      progressByStageNumber,
      progressByCode: {
        mood_board: moodProgress,
        portfolio_studio: portfolioStudioStatusToRegistry({
          moodApproved,
          stage3Status: progressByStageNumber[3],
          currentStageNumber: portfolioContext.currentStageNumber,
        }),
      },
    }),
    currentStageNumber: portfolioContext.currentStageNumber,
    teamName: portfolioContext.teamName,
    error: null,
  };
}
