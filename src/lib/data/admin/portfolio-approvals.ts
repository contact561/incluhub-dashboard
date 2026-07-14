import { logAdminLoaderError } from "@/lib/data/admin/loader-errors";
import {
  canAdminReviewPortfolio,
  resolveAdminReviewEligibility,
} from "@/lib/data/admin/portfolio-approval-eligibility";
import { createClient } from "@/lib/supabase/server";
import type {
  AdminPortfolioApprovalDashboardData,
  AdminPortfolioApprovalDetail,
  AdminPortfolioApprovalQueueItem,
  AdminPortfolioReviewHistoryItem,
  AdminPortfolioSubmissionVersion,
  AdminPreviousAdminRevision,
} from "@/types/admin-portfolio-approval";
import type {
  PortfolioReviewDecision,
  PortfolioReviewerStage,
  PortfolioWorkflowStatus,
  StageStatus,
  StudentCategory,
} from "@/types/database";

const QUEUE_LOADER = "getAdminPortfolioApprovalQueue";
const DETAIL_LOADER = "getAdminPortfolioApprovalDetail";
const DASHBOARD_LOADER = "getAdminPortfolioApprovalDashboard";

type PendingPortfolioRow = {
  id: string;
  team_id: string;
  leader_student_id: string;
  portfolio_type: StudentCategory;
  workflow_status: PortfolioWorkflowStatus;
  sequence_order: number | null;
  submitted_at: string | null;
};

type TeamRow = {
  id: string;
  team_name: string;
  current_stage_number: number | null;
  stage_status: StageStatus;
  status: string;
};

type StudentRow = {
  id: string;
  profiles: { full_name: string } | null;
};

type SubmissionRow = {
  id: string;
  portfolio_output_id: string;
  version_number: number;
  title: string;
  portfolio_url: string;
  notes: string | null;
  created_at: string;
};

type ReviewRow = {
  id: string;
  portfolio_submission_id: string;
  reviewer_stage: PortfolioReviewerStage;
  reviewer_user_id: string;
  decision: PortfolioReviewDecision;
  comments: string | null;
  created_at: string;
};

type ProfileRow = {
  id: string;
  full_name: string;
};

function formatLeaderName(
  student: StudentRow | undefined,
  category: StudentCategory
): string {
  return student?.profiles?.full_name ?? `${category} leader`;
}

function buildLatestSubmissionMap(
  submissions: SubmissionRow[]
): Map<string, SubmissionRow> {
  const latestByPortfolio = new Map<string, SubmissionRow>();
  for (const row of submissions) {
    const existing = latestByPortfolio.get(row.portfolio_output_id);
    if (!existing || row.version_number > existing.version_number) {
      latestByPortfolio.set(row.portfolio_output_id, row);
    }
  }
  return latestByPortfolio;
}

function groupSubmissionsByPortfolio(
  submissions: SubmissionRow[]
): Map<string, SubmissionRow[]> {
  const grouped = new Map<string, SubmissionRow[]>();
  for (const submission of submissions) {
    const list = grouped.get(submission.portfolio_output_id) ?? [];
    list.push(submission);
    grouped.set(submission.portfolio_output_id, list);
  }
  return grouped;
}

async function loadPendingPortfolios(): Promise<{
  portfolios: PendingPortfolioRow[];
  error: string | null;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("portfolio_outputs")
    .select(
      "id, team_id, leader_student_id, portfolio_type, workflow_status, sequence_order, submitted_at"
    )
    .eq("workflow_status", "pending_admin")
    .order("submitted_at", { ascending: true, nullsFirst: false });

  if (error) {
    logAdminLoaderError(QUEUE_LOADER, error.message);
    return { portfolios: [], error: error.message };
  }

  return { portfolios: (data ?? []) as PendingPortfolioRow[], error: null };
}

async function loadTeamsByIds(
  teamIds: string[],
  loader: string
): Promise<{ teams: TeamRow[]; error: string | null }> {
  if (teamIds.length === 0) {
    return { teams: [], error: null };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teams")
    .select("id, team_name, current_stage_number, stage_status, status")
    .in("id", teamIds);

  if (error) {
    logAdminLoaderError(loader, error.message);
    return { teams: [], error: error.message };
  }

  return { teams: (data ?? []) as TeamRow[], error: null };
}

async function loadStudentsByIds(
  studentIds: string[],
  loader: string
): Promise<{ students: StudentRow[]; error: string | null }> {
  if (studentIds.length === 0) {
    return { students: [], error: null };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("students")
    .select(
      `
      id,
      profiles!user_id (
        full_name
      )
    `
    )
    .in("id", studentIds);

  if (error) {
    logAdminLoaderError(loader, error.message);
    return { students: [], error: error.message };
  }

  return { students: (data ?? []) as StudentRow[], error: null };
}

async function loadSubmissionsForPortfolios(
  portfolioIds: string[],
  loader: string
): Promise<{ submissions: SubmissionRow[]; error: string | null }> {
  if (portfolioIds.length === 0) {
    return { submissions: [], error: null };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("portfolio_submissions")
    .select(
      "id, portfolio_output_id, version_number, title, portfolio_url, notes, created_at"
    )
    .in("portfolio_output_id", portfolioIds)
    .order("version_number", { ascending: false });

  if (error) {
    logAdminLoaderError(loader, error.message);
    return { submissions: [], error: error.message };
  }

  return { submissions: (data ?? []) as SubmissionRow[], error: null };
}

async function loadReviewsForSubmissions(
  submissionIds: string[],
  loader: string
): Promise<{ reviews: ReviewRow[]; error: string | null }> {
  if (submissionIds.length === 0) {
    return { reviews: [], error: null };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("portfolio_reviews")
    .select(
      "id, portfolio_submission_id, reviewer_stage, reviewer_user_id, decision, comments, created_at"
    )
    .in("portfolio_submission_id", submissionIds)
    .order("created_at", { ascending: false });

  if (error) {
    logAdminLoaderError(loader, error.message);
    return { reviews: [], error: error.message };
  }

  return { reviews: (data ?? []) as ReviewRow[], error: null };
}

async function loadProfilesByIds(
  userIds: string[],
  loader: string
): Promise<{ profiles: ProfileRow[]; error: string | null }> {
  if (userIds.length === 0) {
    return { profiles: [], error: null };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", userIds);

  if (error) {
    logAdminLoaderError(loader, error.message);
    return { profiles: [], error: error.message };
  }

  return { profiles: (data ?? []) as ProfileRow[], error: null };
}

function mapQueueItems(
  portfolios: PendingPortfolioRow[],
  teamById: Map<string, TeamRow>,
  studentById: Map<string, StudentRow>,
  submissionsByPortfolio: Map<string, SubmissionRow[]>,
  latestByPortfolio: Map<string, SubmissionRow>,
  reviews: ReviewRow[],
  profileById: Map<string, ProfileRow>
): AdminPortfolioApprovalQueueItem[] {
  return portfolios
    .map((portfolio) => {
      const team = teamById.get(portfolio.team_id);
      const student = studentById.get(portfolio.leader_student_id);
      const latest = latestByPortfolio.get(portfolio.id);
      const portfolioSubmissions = submissionsByPortfolio.get(portfolio.id) ?? [];

      if (!latest) {
        return null;
      }

      const eligibility = resolveAdminReviewEligibility(
        latest,
        portfolioSubmissions,
        reviews
      );

      const educatorProfile = eligibility.educatorReview
        ? profileById.get(eligibility.educatorReview.reviewer_user_id)
        : null;

      return {
        portfolioId: portfolio.id,
        title: latest.title,
        portfolioType: portfolio.portfolio_type,
        sequenceOrder: portfolio.sequence_order,
        teamId: portfolio.team_id,
        teamName: team?.team_name ?? "—",
        leaderStudentId: portfolio.leader_student_id,
        leaderName: formatLeaderName(student, portfolio.portfolio_type),
        versionNumber: latest.version_number,
        submittedAt: latest.created_at,
        adminReviewEntryPath: eligibility.adminReviewEntryPath,
        latestSubmissionHasEducatorApproval:
          eligibility.latestSubmissionHasEducatorApproval,
        enteredFromAdminRevision: eligibility.enteredFromAdminRevision,
        educatorName: educatorProfile?.full_name ?? null,
        educatorReviewedAt: eligibility.educatorReview?.created_at ?? null,
      };
    })
    .filter((item): item is AdminPortfolioApprovalQueueItem => item !== null);
}

export async function getAdminPortfolioApprovalQueue(): Promise<{
  items: AdminPortfolioApprovalQueueItem[];
  error: string | null;
}> {
  const { portfolios, error: portfolioError } = await loadPendingPortfolios();
  if (portfolioError) {
    return { items: [], error: portfolioError };
  }

  if (portfolios.length === 0) {
    return { items: [], error: null };
  }

  const teamIds = [...new Set(portfolios.map((row) => row.team_id))];
  const studentIds = [...new Set(portfolios.map((row) => row.leader_student_id))];
  const portfolioIds = portfolios.map((row) => row.id);

  const [
    { teams, error: teamError },
    { students, error: studentError },
    { submissions, error: submissionError },
  ] = await Promise.all([
    loadTeamsByIds(teamIds, QUEUE_LOADER),
    loadStudentsByIds(studentIds, QUEUE_LOADER),
    loadSubmissionsForPortfolios(portfolioIds, QUEUE_LOADER),
  ]);

  if (teamError) return { items: [], error: teamError };
  if (studentError) return { items: [], error: studentError };
  if (submissionError) return { items: [], error: submissionError };

  const latestByPortfolio = buildLatestSubmissionMap(submissions);
  const submissionsByPortfolio = groupSubmissionsByPortfolio(submissions);
  const allSubmissionIds = submissions.map((row) => row.id);

  const { reviews, error: reviewError } = await loadReviewsForSubmissions(
    allSubmissionIds,
    QUEUE_LOADER
  );
  if (reviewError) {
    return { items: [], error: reviewError };
  }

  const reviewerIds = [...new Set(reviews.map((review) => review.reviewer_user_id))];
  const { profiles, error: profileError } = await loadProfilesByIds(
    reviewerIds,
    QUEUE_LOADER
  );
  if (profileError) {
    return { items: [], error: profileError };
  }

  const items = mapQueueItems(
    portfolios,
    new Map(teams.map((team) => [team.id, team])),
    new Map(students.map((student) => [student.id, student])),
    submissionsByPortfolio,
    latestByPortfolio,
    reviews,
    new Map(profiles.map((profile) => [profile.id, profile]))
  );

  return { items, error: null };
}

export async function getAdminPortfolioApprovalDashboard(): Promise<{
  data: AdminPortfolioApprovalDashboardData | null;
  error: string | null;
}> {
  const { items, error } = await getAdminPortfolioApprovalQueue();
  if (error) {
    logAdminLoaderError(DASHBOARD_LOADER, error);
    return { data: null, error };
  }

  return {
    data: {
      pendingCount: items.length,
      pendingPreviews: items.slice(0, 5),
    },
    error: null,
  };
}

function buildSubmissionHistory(
  submissions: SubmissionRow[]
): AdminPortfolioSubmissionVersion[] {
  return submissions
    .slice()
    .sort((a, b) => b.version_number - a.version_number)
    .map((row) => ({
      submissionId: row.id,
      versionNumber: row.version_number,
      title: row.title,
      portfolioUrl: row.portfolio_url,
      notes: row.notes,
      submittedAt: row.created_at,
    }));
}

function buildReviewHistory(
  reviews: ReviewRow[],
  versionBySubmissionId: Map<string, number>,
  profileById: Map<string, ProfileRow>
): AdminPortfolioReviewHistoryItem[] {
  return reviews
    .map((review) => ({
      id: review.id,
      reviewerStage: review.reviewer_stage,
      reviewerName: profileById.get(review.reviewer_user_id)?.full_name ?? "—",
      decision: review.decision,
      comments: review.comments,
      createdAt: review.created_at,
      versionNumber: versionBySubmissionId.get(review.portfolio_submission_id) ?? 0,
    }))
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

function buildPreviousAdminRevision(
  eligibility: ReturnType<typeof resolveAdminReviewEligibility>,
  profileById: Map<string, ProfileRow>
): AdminPreviousAdminRevision | null {
  if (
    !eligibility.previousAdminRevisionReview ||
    eligibility.previousSubmissionVersion === null
  ) {
    return null;
  }

  return {
    reviewerName:
      profileById.get(eligibility.previousAdminRevisionReview.reviewer_user_id)
        ?.full_name ?? "—",
    comments: eligibility.previousAdminRevisionReview.comments,
    versionNumber: eligibility.previousSubmissionVersion,
    createdAt: eligibility.previousAdminRevisionReview.created_at,
  };
}

export async function getAdminPortfolioApprovalDetail(
  portfolioId: string
): Promise<{
  detail: AdminPortfolioApprovalDetail | null;
  notFound: boolean;
  error: string | null;
}> {
  const supabase = await createClient();

  const { data: portfolio, error: portfolioError } = await supabase
    .from("portfolio_outputs")
    .select(
      `
      id,
      team_id,
      leader_student_id,
      portfolio_type,
      workflow_status,
      sequence_order,
      revision_return_to
    `
    )
    .eq("id", portfolioId)
    .maybeSingle();

  if (portfolioError) {
    logAdminLoaderError(DETAIL_LOADER, portfolioError.message);
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
    sequence_order: number | null;
    revision_return_to: string | null;
  };

  if (!row.workflow_status) {
    return { detail: null, notFound: true, error: null };
  }

  const [
    { teams, error: teamError },
    { students, error: studentError },
    { submissions, error: submissionError },
  ] = await Promise.all([
    loadTeamsByIds([row.team_id], DETAIL_LOADER),
    loadStudentsByIds([row.leader_student_id], DETAIL_LOADER),
    loadSubmissionsForPortfolios([portfolioId], DETAIL_LOADER),
  ]);

  if (teamError) return { detail: null, notFound: false, error: teamError };
  if (studentError) return { detail: null, notFound: false, error: studentError };
  if (submissionError) {
    return { detail: null, notFound: false, error: submissionError };
  }

  const team = teams[0] ?? null;
  const student = students[0];
  const submissionHistory = buildSubmissionHistory(submissions);
  const latestRow = submissions.reduce<SubmissionRow | null>((current, candidate) => {
    if (!current || candidate.version_number > current.version_number) {
      return candidate;
    }
    return current;
  }, null);
  const latest = submissionHistory[0] ?? null;

  const { reviews, error: reviewError } = await loadReviewsForSubmissions(
    submissions.map((submission) => submission.id),
    DETAIL_LOADER
  );
  if (reviewError) {
    return { detail: null, notFound: false, error: reviewError };
  }

  const reviewerIds = [...new Set(reviews.map((review) => review.reviewer_user_id))];
  const { profiles, error: profileError } = await loadProfilesByIds(
    reviewerIds,
    DETAIL_LOADER
  );
  if (profileError) {
    return { detail: null, notFound: false, error: profileError };
  }

  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const versionBySubmissionId = new Map(
    submissions.map((submission) => [submission.id, submission.version_number] as const)
  );

  const reviewHistory = buildReviewHistory(reviews, versionBySubmissionId, profileById);

  const eligibility = resolveAdminReviewEligibility(
    latestRow,
    submissions,
    reviews
  );

  const canReview = canAdminReviewPortfolio(
    row.workflow_status,
    eligibility.adminReviewEntryPath,
    latest !== null
  );

  return {
    detail: {
      portfolioId: row.id,
      teamId: row.team_id,
      teamName: team?.team_name ?? "—",
      currentStageNumber: team?.current_stage_number ?? null,
      stageStatus: team?.stage_status ?? "not_started",
      portfolioType: row.portfolio_type,
      sequenceOrder: row.sequence_order,
      workflowStatus: row.workflow_status,
      leaderStudentId: row.leader_student_id,
      leaderName: formatLeaderName(student, row.portfolio_type),
      revisionReturnTo: row.revision_return_to,
      adminReviewEntryPath: eligibility.adminReviewEntryPath,
      latestSubmissionHasEducatorApproval:
        eligibility.latestSubmissionHasEducatorApproval,
      enteredFromAdminRevision: eligibility.enteredFromAdminRevision,
      canReview,
      previousAdminRevision: buildPreviousAdminRevision(eligibility, profileById),
      latestSubmission: latest
        ? {
            submissionId: latest.submissionId,
            title: latest.title,
            portfolioUrl: latest.portfolioUrl,
            notes: latest.notes,
            versionNumber: latest.versionNumber,
            submittedAt: latest.submittedAt,
          }
        : null,
      submissionHistory,
      reviewHistory,
    },
    notFound: false,
    error: null,
  };
}
