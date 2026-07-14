import {
  getEducatorContext,
  loadPortfoliosForMappedLeaders,
} from "@/lib/data/educator/context";
import { logEducatorLoaderError } from "@/lib/data/educator/loader-errors";
import type { EducatorAssignedTeam } from "@/types/educator-portfolio";
import type { StageStatus } from "@/types/database";

const LOADER = "getEducatorAssignedTeams";

export async function getEducatorAssignedTeams(): Promise<{
  teams: EducatorAssignedTeam[];
  error: string | null;
}> {
  const { context, error: contextError } = await getEducatorContext();
  if (contextError) {
    return { teams: [], error: contextError };
  }
  if (!context) {
    return { teams: [], error: "Your educator profile could not be found." };
  }

  const { portfolios, error: portfolioError } =
    await loadPortfoliosForMappedLeaders(context);
  if (portfolioError) {
    logEducatorLoaderError(LOADER, portfolioError);
    return { teams: [], error: portfolioError };
  }

  const portfoliosByTeam = new Map<string, typeof portfolios>();
  for (const portfolio of portfolios) {
    const list = portfoliosByTeam.get(portfolio.teamId) ?? [];
    list.push(portfolio);
    portfoliosByTeam.set(portfolio.teamId, list);
  }

  const teams: EducatorAssignedTeam[] = context.mappedTeamIds.map((teamId) => {
    const teamMappings = context.mappings.filter((m) => m.teamId === teamId);
    const first = teamMappings[0];
    const teamPortfolios = portfoliosByTeam.get(teamId) ?? [];

    const pending = teamPortfolios.find(
      (p) => p.workflowStatus === "pending_educator"
    );
    const active =
      pending ??
      teamPortfolios.find(
        (p) =>
          p.workflowStatus !== "locked" && p.workflowStatus !== "completed"
      ) ??
      null;

    return {
      teamId,
      teamName: first?.teamName ?? "—",
      currentStageNumber: first?.currentStageNumber ?? null,
      stageStatus: (first?.stageStatus ?? "not_started") as StageStatus,
      mappedStudents: teamMappings.map((m) => ({
        studentId: m.studentId,
        fullName: m.studentName,
        category: m.studentCategory,
      })),
      activePortfolioType: active?.portfolioType ?? null,
      activeWorkflowStatus: active?.workflowStatus ?? null,
      pendingReviewPortfolioId: pending?.id ?? null,
    };
  });

  teams.sort((a, b) => a.teamName.localeCompare(b.teamName));

  return { teams, error: null };
}
