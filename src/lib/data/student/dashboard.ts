import { getStudentStage3PortfolioContext } from "@/lib/data/student/portfolio";
import { getTeamStageDetail } from "@/lib/data/admin/team-stage";
import type {
  StudentDashboardData,
  StudentDashboardResult,
} from "@/types/student-portal";

const LOADER = "getStudentDashboardData";

export async function getStudentDashboardData(): Promise<StudentDashboardResult> {
  const { data, error } = await getStudentStage3PortfolioContext();

  if (error) {
    console.error(`[${LOADER}]`, error);
    return { data: null, error };
  }

  if (!data) {
    return { data: null, error: "Your portfolio information could not be loaded." };
  }

  let brandWorks: StudentDashboardData["brandWorks"] = null;

  if ((data.currentStageNumber ?? 0) >= 4) {
    const { detail, error: stageError } = await getTeamStageDetail(data.teamId);
    if (stageError) {
      console.error(`[${LOADER}] Brand Works`, stageError);
      return {
        data: null,
        error: "Your Brand Works schedule could not be loaded.",
      };
    }
    const stage4 = detail?.timeline.find((stage) => stage.stageNumber === 4);
    brandWorks = stage4
      ? {
          date: stage4.brandWorksDate,
          remarks: stage4.brandWorksRemarks,
          scheduledAt: stage4.brandWorksScheduledAt,
          completedAt: stage4.brandWorksCompletedAt,
        }
      : null;
  }

  return {
    data: {
      teamName: data.teamName,
      programName: data.programName,
      currentStageNumber: data.currentStageNumber,
      currentStudentId: data.currentStudentId,
      ownPortfolioOutput: data.ownPortfolioOutput,
      activeTeamPortfolio: data.activeTeamPortfolio,
      teamPortfolioProgress: data.teamPortfolioProgress,
      brandWorks,
    },
    error: null,
  };
}
