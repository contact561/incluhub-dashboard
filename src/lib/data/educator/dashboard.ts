import {
  getEducatorContext,
  loadPortfoliosForMappedLeaders,
} from "@/lib/data/educator/context";
import { logEducatorLoaderError } from "@/lib/data/educator/loader-errors";
import { createClient } from "@/lib/supabase/server";
import type {
  EducatorDashboardData,
  EducatorPendingReviewPreview,
} from "@/types/educator-portfolio";

const LOADER = "getEducatorDashboardData";

type SubmissionLite = {
  portfolio_output_id: string;
  version_number: number;
  title: string;
  created_at: string;
};

export async function getEducatorDashboardData(): Promise<{
  data: EducatorDashboardData | null;
  error: string | null;
}> {
  const { context, error: contextError } = await getEducatorContext();
  if (contextError) {
    return { data: null, error: contextError };
  }
  if (!context) {
    return { data: null, error: "Your educator profile could not be found." };
  }

  const { portfolios, error: portfolioError } = await loadPortfoliosForMappedLeaders(
    context,
    { workflowStatus: "pending_educator" }
  );
  if (portfolioError) {
    logEducatorLoaderError(LOADER, portfolioError);
    return { data: null, error: portfolioError };
  }

  const awaiting = portfolios.filter(
    (p) => p.workflowStatus === "pending_educator"
  );

  const supabase = await createClient();
  const { count: reviewsCompletedCount, error: reviewCountError } =
    await supabase
      .from("portfolio_reviews")
      .select("id", { count: "exact", head: true })
      .eq("reviewer_user_id", context.userId)
      .eq("reviewer_stage", "educator");

  if (reviewCountError) {
    logEducatorLoaderError(LOADER, reviewCountError.message);
    return { data: null, error: reviewCountError.message };
  }

  let pendingPreviews: EducatorPendingReviewPreview[] = [];
  let awaitingReviewCount = 0;

  if (awaiting.length > 0) {
    const awaitingIds = awaiting.map((p) => p.id);
    const { data: submissions, error: submissionError } = await supabase
      .from("portfolio_submissions")
      .select("portfolio_output_id, version_number, title, created_at")
      .in("portfolio_output_id", awaitingIds)
      .order("version_number", { ascending: false });

    if (submissionError) {
      logEducatorLoaderError(LOADER, submissionError.message);
      return { data: null, error: submissionError.message };
    }

    const latestByPortfolio = new Map<string, SubmissionLite>();
    for (const row of (submissions ?? []) as SubmissionLite[]) {
      if (!latestByPortfolio.has(row.portfolio_output_id)) {
        latestByPortfolio.set(row.portfolio_output_id, row);
      }
    }

    const leaderNameByStudent = new Map(
      context.mappings.map((m) => [m.studentId, m.studentName] as const)
    );
    const teamNameById = new Map(
      context.mappings.map((m) => [m.teamId, m.teamName] as const)
    );

    const allPending = awaiting
      .map((portfolio) => {
        const submission = latestByPortfolio.get(portfolio.id);
        if (!submission) return null;
        return {
          portfolioId: portfolio.id,
          title: submission.title,
          portfolioType: portfolio.portfolioType,
          teamName: teamNameById.get(portfolio.teamId) ?? "—",
          leaderName: leaderNameByStudent.get(portfolio.leaderStudentId) ?? "—",
          versionNumber: submission.version_number,
          submittedAt: submission.created_at,
        };
      })
      .filter((row): row is EducatorPendingReviewPreview => row !== null)
      .sort(
        (a, b) =>
          new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
      );

    awaitingReviewCount = allPending.length;
    pendingPreviews = allPending.slice(0, 5);
  }

  return {
    data: {
      summary: {
        assignedTeamsCount: context.mappedTeamIds.length,
        assignedStudentsCount: context.mappedStudentIds.length,
        awaitingReviewCount,
        reviewsCompletedCount: reviewsCompletedCount ?? 0,
      },
      pendingPreviews,
    },
    error: null,
  };
}
