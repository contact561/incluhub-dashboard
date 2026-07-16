import {
  getEducatorContext,
  loadPortfoliosForMappedLeaders,
} from "@/lib/data/educator/context";
import { logEducatorLoaderError } from "@/lib/data/educator/loader-errors";
import { createClient } from "@/lib/supabase/server";
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

  const supabase = await createClient();
  const { data: stage4Rows, error: stage4Error } =
    context.mappedTeamIds.length === 0
      ? { data: [], error: null }
      : await supabase
          .from("team_stage_progress")
          .select(
            `
            team_id,
            brand_works_date,
            brand_works_remarks,
            brand_works_scheduled_at,
            brand_works_completed_at
          `
          )
          .in("team_id", context.mappedTeamIds)
          .eq("stage_number", 4);

  if (stage4Error) {
    logEducatorLoaderError(LOADER, stage4Error.message);
    return {
      teams: [],
      error: "Assigned team Brand Works schedules could not be loaded.",
    };
  }

  const stage4ByTeam = new Map(
    ((stage4Rows ?? []) as Array<{
      team_id: string;
      brand_works_date: string | null;
      brand_works_remarks: string | null;
      brand_works_scheduled_at: string | null;
      brand_works_completed_at: string | null;
    }>).map((row) => [row.team_id, row])
  );

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
    const stage4 = stage4ByTeam.get(teamId);

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
      brandWorksDate: stage4?.brand_works_date ?? null,
      brandWorksRemarks: stage4?.brand_works_remarks ?? null,
      brandWorksScheduledAt: stage4?.brand_works_scheduled_at ?? null,
      brandWorksCompletedAt: stage4?.brand_works_completed_at ?? null,
    };
  });

  teams.sort((a, b) => a.teamName.localeCompare(b.teamName));

  return { teams, error: null };
}
