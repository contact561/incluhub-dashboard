import {
  getEducatorContext,
  isMatchingPortfolioLeader,
  loadPortfoliosForMappedLeaders,
  loadTeamRecord,
} from "@/lib/data/educator/context";
import { logEducatorLoaderError } from "@/lib/data/educator/loader-errors";
import { createClient } from "@/lib/supabase/server";
import type {
  EducatorReviewDetail,
  EducatorReviewHistoryItem,
  EducatorReviewQueueItem,
} from "@/types/educator-portfolio";
import type {
  PortfolioReviewDecision,
  PortfolioReviewerStage,
  PortfolioWorkflowStatus,
  StudentCategory,
} from "@/types/database";

const QUEUE_LOADER = "getEducatorReviewQueue";
const DETAIL_LOADER = "getEducatorReviewDetail";

type SubmissionRow = {
  id: string;
  portfolio_output_id: string;
  version_number: number;
  title: string;
  portfolio_url: string;
  notes: string | null;
  created_at: string;
};

export async function getEducatorReviewQueue(): Promise<{
  items: EducatorReviewQueueItem[];
  error: string | null;
}> {
  const { context, error: contextError } = await getEducatorContext();
  if (contextError) {
    return { items: [], error: contextError };
  }
  if (!context) {
    return { items: [], error: "Your educator profile could not be found." };
  }

  const { portfolios, error: portfolioError } = await loadPortfoliosForMappedLeaders(
    context,
    { workflowStatus: "pending_educator" }
  );
  if (portfolioError) {
    logEducatorLoaderError(QUEUE_LOADER, portfolioError);
    return { items: [], error: portfolioError };
  }

  const awaiting = portfolios.filter(
    (p) => p.workflowStatus === "pending_educator"
  );

  if (awaiting.length === 0) {
    return { items: [], error: null };
  }

  const supabase = await createClient();
  const { data: submissions, error: submissionError } = await supabase
    .from("portfolio_submissions")
    .select(
      "id, portfolio_output_id, version_number, title, portfolio_url, notes, created_at"
    )
    .in(
      "portfolio_output_id",
      awaiting.map((p) => p.id)
    )
    .order("version_number", { ascending: false });

  if (submissionError) {
    logEducatorLoaderError(QUEUE_LOADER, submissionError.message);
    return { items: [], error: submissionError.message };
  }

  const latestByPortfolio = new Map<string, SubmissionRow>();
  for (const row of (submissions ?? []) as SubmissionRow[]) {
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

  const items = awaiting
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
    .filter((row): row is EducatorReviewQueueItem => row !== null)
    .sort(
      (a, b) =>
        new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );

  return { items, error: null };
}

export async function getEducatorReviewDetail(
  portfolioId: string
): Promise<{
  detail: EducatorReviewDetail | null;
  notFound: boolean;
  error: string | null;
}> {
  const { context, error: contextError } = await getEducatorContext();
  if (contextError) {
    return { detail: null, notFound: false, error: contextError };
  }
  if (!context) {
    return {
      detail: null,
      notFound: false,
      error: "Your educator profile could not be found.",
    };
  }

  const supabase = await createClient();
  const { data: portfolio, error: portfolioError } = await supabase
    .from("portfolio_outputs")
    .select(
      `
      id,
      team_id,
      leader_student_id,
      portfolio_type,
      workflow_status
    `
    )
    .eq("id", portfolioId)
    .maybeSingle();

  if (portfolioError) {
    logEducatorLoaderError(DETAIL_LOADER, portfolioError.message);
    return { detail: null, notFound: false, error: portfolioError.message };
  }

  if (!portfolio) {
    return { detail: null, notFound: true, error: null };
  }

  const row = portfolio as {
    id: string;
    team_id: string;
    leader_student_id: string;
    portfolio_type: StudentCategory;
    workflow_status: PortfolioWorkflowStatus | null;
  };

  const { team, error: teamError } = await loadTeamRecord(row.team_id);
  if (teamError) {
    return { detail: null, notFound: false, error: teamError };
  }

  if (
    !row.workflow_status ||
    team?.status !== "active" ||
    !isMatchingPortfolioLeader(context, row.team_id, row.leader_student_id)
  ) {
    return { detail: null, notFound: true, error: null };
  }

  const leaderMapping = context.mappings.find(
    (m) => m.teamId === row.team_id && m.studentId === row.leader_student_id
  );

  const { data: submissions, error: submissionError } = await supabase
    .from("portfolio_submissions")
    .select(
      "id, portfolio_output_id, version_number, title, portfolio_url, notes, created_at"
    )
    .eq("portfolio_output_id", portfolioId)
    .order("version_number", { ascending: false });

  if (submissionError) {
    logEducatorLoaderError(DETAIL_LOADER, submissionError.message);
    return { detail: null, notFound: false, error: submissionError.message };
  }

  const submissionRows = (submissions ?? []) as SubmissionRow[];
  const latest = submissionRows[0] ?? null;
  const versionBySubmissionId = new Map(
    submissionRows.map((s) => [s.id, s.version_number] as const)
  );

  let history: EducatorReviewHistoryItem[] = [];
  if (submissionRows.length > 0) {
    const { data: reviews, error: reviewError } = await supabase
      .from("portfolio_reviews")
      .select(
        "id, portfolio_submission_id, reviewer_stage, decision, comments, created_at"
      )
      .in(
        "portfolio_submission_id",
        submissionRows.map((s) => s.id)
      )
      .order("created_at", { ascending: false });

    if (reviewError) {
      logEducatorLoaderError(DETAIL_LOADER, reviewError.message);
      return { detail: null, notFound: false, error: reviewError.message };
    }

    history = (
      (reviews ?? []) as Array<{
        id: string;
        portfolio_submission_id: string;
        reviewer_stage: PortfolioReviewerStage;
        decision: PortfolioReviewDecision;
        comments: string | null;
        created_at: string;
      }>
    ).map((review) => ({
      id: review.id,
      reviewerStage: review.reviewer_stage,
      decision: review.decision,
      comments: review.comments,
      createdAt: review.created_at,
      versionNumber:
        versionBySubmissionId.get(review.portfolio_submission_id) ?? 0,
    }));
  }

  return {
    detail: {
      portfolioId: row.id,
      teamId: row.team_id,
      teamName: team?.team_name ?? "—",
      portfolioType: row.portfolio_type,
      workflowStatus: row.workflow_status,
      leaderStudentId: row.leader_student_id,
      leaderName: leaderMapping?.studentName ?? "—",
      canReview: row.workflow_status === "pending_educator" && latest !== null,
      latestSubmission: latest
        ? {
            submissionId: latest.id,
            title: latest.title,
            portfolioUrl: latest.portfolio_url,
            notes: latest.notes,
            versionNumber: latest.version_number,
            submittedAt: latest.created_at,
          }
        : null,
      history,
    },
    notFound: false,
    error: null,
  };
}
