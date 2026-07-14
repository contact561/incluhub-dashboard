import { getStudentStage3PortfolioContext } from "@/lib/data/student/portfolio";
import type { StudentDashboardResult } from "@/types/student-portal";

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

  return {
    data: {
      teamName: data.teamName,
      programName: data.programName,
      currentStageNumber: data.currentStageNumber,
      currentStudentId: data.currentStudentId,
      ownPortfolioOutput: data.ownPortfolioOutput,
      activeTeamPortfolio: data.activeTeamPortfolio,
      teamPortfolioProgress: data.teamPortfolioProgress,
    },
    error: null,
  };
}
