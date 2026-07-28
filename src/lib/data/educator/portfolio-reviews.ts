import {
  getEducatorContext,
  loadTeamRecord,
} from "@/lib/data/educator/context";
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

type SubmissionRow = {
  id: string;
  portfolio_output_id: string;
  version_number: number;
  title: string;
  portfolio_url: string;
  notes: string | null;
  created_at: string;
};

type MoodboardRow = {
  id: string;
  portfolio_output_id: string;
  version_number: number;
  title: string;
  moodboard_url: string;
  notes: string | null;
  created_at: string;
};

export async function getEducatorReviewQueue(): Promise<{
  items: EducatorReviewQueueItem[];
  error: string | null;
}> {
  const { context, error } = await getEducatorContext();
  if (error) return { items: [], error };
  if (!context) {
    return { items: [], error: "Your educator profile could not be found." };
  }
  if (context.mappedTeamIds.length === 0) return { items: [], error: null };

  const supabase = await createClient();
  const { data: portfolioData, error: portfolioError } = await supabase
    .from("portfolio_outputs")
    .select(
      "id, team_id, leader_student_id, portfolio_type, workflow_status"
    )
    .in("team_id", context.mappedTeamIds)
    .neq("workflow_status", "locked");
  if (portfolioError) return { items: [], error: portfolioError.message };

  const portfolios = (portfolioData ?? []) as Array<{
    id: string;
    team_id: string;
    leader_student_id: string;
    portfolio_type: StudentCategory;
    workflow_status: PortfolioWorkflowStatus;
  }>;
  if (portfolios.length === 0) return { items: [], error: null };

  const ids = portfolios.map((portfolio) => portfolio.id);
  const [submissionResult, moodboardResult] = await Promise.all([
    supabase
      .from("portfolio_submissions")
      .select(
        "id, portfolio_output_id, version_number, title, portfolio_url, notes, created_at"
      )
      .in("portfolio_output_id", ids)
      .order("version_number", { ascending: false }),
    supabase
      .from("moodboard_submissions")
      .select(
        "id, portfolio_output_id, version_number, title, moodboard_url, notes, created_at"
      )
      .in("portfolio_output_id", ids)
      .order("version_number", { ascending: false }),
  ]);

  const loadError =
    submissionResult.error?.message ?? moodboardResult.error?.message ?? null;
  if (loadError) {
    return {
      items: [],
      error: /moodboard_submissions/i.test(loadError)
        ? "The latest workflow database migration has not been applied."
        : loadError,
    };
  }

  const latestSubmission = new Map<string, SubmissionRow>();
  for (const row of (submissionResult.data ?? []) as SubmissionRow[]) {
    if (!latestSubmission.has(row.portfolio_output_id)) {
      latestSubmission.set(row.portfolio_output_id, row);
    }
  }
  const latestMoodboard = new Map<string, MoodboardRow>();
  for (const row of (moodboardResult.data ?? []) as MoodboardRow[]) {
    if (!latestMoodboard.has(row.portfolio_output_id)) {
      latestMoodboard.set(row.portfolio_output_id, row);
    }
  }

  const teamNameById = new Map(
    context.mappings.map((mapping) => [
      mapping.teamId,
      mapping.teamName,
    ] as const)
  );
  const leaderNameById = new Map(
    context.mappings.map((mapping) => [
      mapping.studentId,
      mapping.studentName,
    ] as const)
  );

  const items = portfolios
    .map((portfolio): EducatorReviewQueueItem | null => {
      const portfolioSubmission = latestSubmission.get(portfolio.id);
      const moodboardSubmission = latestMoodboard.get(portfolio.id);
      const item = portfolioSubmission ?? moodboardSubmission;
      if (!item) return null;
      return {
        portfolioId: portfolio.id,
        title: item.title,
        portfolioType: portfolio.portfolio_type,
        teamName: teamNameById.get(portfolio.team_id) ?? "—",
        leaderName:
          leaderNameById.get(portfolio.leader_student_id) ?? "Team student",
        versionNumber: item.version_number,
        submittedAt: item.created_at,
        itemType: portfolioSubmission ? "portfolio" : "moodboard",
      };
    })
    .filter((item): item is EducatorReviewQueueItem => item !== null)
    .sort(
      (a, b) =>
        new Date(b.submittedAt).getTime() -
        new Date(a.submittedAt).getTime()
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
  const { context, error } = await getEducatorContext();
  if (error) return { detail: null, notFound: false, error };
  if (!context) {
    return {
      detail: null,
      notFound: false,
      error: "Your educator profile could not be found.",
    };
  }

  const supabase = await createClient();
  const { data: portfolioData, error: portfolioError } = await supabase
    .from("portfolio_outputs")
    .select(
      "id, team_id, leader_student_id, portfolio_type, workflow_status"
    )
    .eq("id", portfolioId)
    .maybeSingle();
  if (portfolioError) {
    return { detail: null, notFound: false, error: portfolioError.message };
  }
  if (!portfolioData) return { detail: null, notFound: true, error: null };

  const portfolio = portfolioData as {
    id: string;
    team_id: string;
    leader_student_id: string;
    portfolio_type: StudentCategory;
    workflow_status: PortfolioWorkflowStatus | null;
  };
  if (
    !portfolio.workflow_status ||
    !context.mappedTeamIds.includes(portfolio.team_id)
  ) {
    return { detail: null, notFound: true, error: null };
  }

  const { team, error: teamError } = await loadTeamRecord(portfolio.team_id);
  if (teamError) {
    return { detail: null, notFound: false, error: teamError };
  }

  const [submissionsResult, moodboardsResult, commentsResult] =
    await Promise.all([
      supabase
        .from("portfolio_submissions")
        .select(
          "id, portfolio_output_id, version_number, title, portfolio_url, notes, created_at"
        )
        .eq("portfolio_output_id", portfolioId)
        .order("version_number", { ascending: false }),
      supabase
        .from("moodboard_submissions")
        .select(
          "id, portfolio_output_id, version_number, title, moodboard_url, notes, created_at"
        )
        .eq("portfolio_output_id", portfolioId)
        .order("version_number", { ascending: false }),
      supabase
        .from("workflow_comments")
        .select("id, author_user_id, body, created_at")
        .eq("portfolio_output_id", portfolioId)
        .order("created_at", { ascending: false }),
    ]);

  const loadError =
    submissionsResult.error?.message ??
    moodboardsResult.error?.message ??
    commentsResult.error?.message ??
    null;
  if (loadError) {
    return { detail: null, notFound: false, error: loadError };
  }

  const submissions = (submissionsResult.data ?? []) as SubmissionRow[];
  const moodboards = (moodboardsResult.data ?? []) as MoodboardRow[];
  const latestSubmission = submissions[0] ?? null;
  const latestMoodboard = moodboards[0] ?? null;

  let history: EducatorReviewHistoryItem[] = [];
  if (submissions.length > 0) {
    const versionBySubmission = new Map(
      submissions.map((submission) => [
        submission.id,
        submission.version_number,
      ] as const)
    );
    const { data: reviewData, error: reviewError } = await supabase
      .from("portfolio_reviews")
      .select(
        "id, portfolio_submission_id, reviewer_stage, decision, comments, created_at"
      )
      .in(
        "portfolio_submission_id",
        submissions.map((submission) => submission.id)
      )
      .order("created_at", { ascending: false });
    if (reviewError) {
      return { detail: null, notFound: false, error: reviewError.message };
    }
    history = (
      (reviewData ?? []) as Array<{
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
        versionBySubmission.get(review.portfolio_submission_id) ?? 0,
    }));
  }

  const leader = context.mappings.find(
    (mapping) =>
      mapping.teamId === portfolio.team_id &&
      mapping.studentId === portfolio.leader_student_id
  );

  return {
    detail: {
      portfolioId: portfolio.id,
      teamId: portfolio.team_id,
      teamName: team?.team_name ?? "—",
      portfolioType: portfolio.portfolio_type,
      workflowStatus: portfolio.workflow_status,
      leaderStudentId: portfolio.leader_student_id,
      leaderName: leader?.studentName ?? "Team student",
      canComment: latestMoodboard !== null || latestSubmission !== null,
      latestMoodboard: latestMoodboard
        ? {
            submissionId: latestMoodboard.id,
            title: latestMoodboard.title,
            moodboardUrl: latestMoodboard.moodboard_url,
            notes: latestMoodboard.notes,
            versionNumber: latestMoodboard.version_number,
            submittedAt: latestMoodboard.created_at,
          }
        : null,
      latestSubmission: latestSubmission
        ? {
            submissionId: latestSubmission.id,
            title: latestSubmission.title,
            portfolioUrl: latestSubmission.portfolio_url,
            notes: latestSubmission.notes,
            versionNumber: latestSubmission.version_number,
            submittedAt: latestSubmission.created_at,
          }
        : null,
      history,
      comments: (
        (commentsResult.data ?? []) as Array<{
          id: string;
          author_user_id: string;
          body: string;
          created_at: string;
        }>
      ).map((comment) => ({
        id: comment.id,
        authorName:
          comment.author_user_id === context.userId
            ? "You"
            : "Assigned educator",
        body: comment.body,
        createdAt: comment.created_at,
      })),
    },
    notFound: false,
    error: null,
  };
}
