import {
  getEducatorContext,
  loadPortfoliosForMappedLeaders,
} from "@/lib/data/educator/context";
import { logEducatorLoaderError } from "@/lib/data/educator/loader-errors";
import type { EducatorAssignedStudent } from "@/types/educator-portfolio";

const LOADER = "getEducatorAssignedStudents";

export async function getEducatorAssignedStudents(): Promise<{
  students: EducatorAssignedStudent[];
  error: string | null;
}> {
  const { context, error: contextError } = await getEducatorContext();
  if (contextError) {
    return { students: [], error: contextError };
  }
  if (!context) {
    return { students: [], error: "Your educator profile could not be found." };
  }

  const { portfolios, error: portfolioError } =
    await loadPortfoliosForMappedLeaders(context);
  if (portfolioError) {
    logEducatorLoaderError(LOADER, portfolioError);
    return { students: [], error: portfolioError };
  }

  const portfolioByLeader = new Map(
    portfolios.map((p) => [p.leaderStudentId, p] as const)
  );

  const students: EducatorAssignedStudent[] = context.mappings.map((mapping) => {
    const portfolio = portfolioByLeader.get(mapping.studentId) ?? null;
    return {
      studentId: mapping.studentId,
      fullName: mapping.studentName,
      category: mapping.studentCategory,
      teamId: mapping.teamId,
      teamName: mapping.teamName,
      currentStageNumber: mapping.studentStageNumber,
      portfolioType: portfolio?.portfolioType ?? mapping.studentCategory,
      workflowStatus: portfolio?.workflowStatus ?? null,
      pendingReviewPortfolioId:
        portfolio?.workflowStatus === "pending_educator" ? portfolio.id : null,
    };
  });

  students.sort((a, b) => a.fullName.localeCompare(b.fullName));

  return { students, error: null };
}
