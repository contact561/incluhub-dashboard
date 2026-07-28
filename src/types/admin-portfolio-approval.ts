import type {
  PortfolioReviewDecision,
  PortfolioReviewerStage,
  PortfolioWorkflowStatus,
  StageStatus,
  StudentCategory,
} from "@/types/database";

export type AdminReviewEntryPath =
  | "direct_submission"
  | "admin_revision_resubmission"
  | "invalid";

export type AdminPortfolioApprovalQueueItem = {
  portfolioId: string;
  title: string;
  portfolioType: StudentCategory;
  sequenceOrder: number | null;
  teamId: string;
  teamName: string;
  leaderStudentId: string;
  leaderName: string;
  versionNumber: number;
  submittedAt: string;
  adminReviewEntryPath: AdminReviewEntryPath;
  latestSubmissionHasEducatorApproval: boolean;
  enteredFromAdminRevision: boolean;
  educatorName: string | null;
  educatorReviewedAt: string | null;
};

export type AdminPortfolioSubmissionVersion = {
  submissionId: string;
  versionNumber: number;
  title: string;
  portfolioUrl: string;
  notes: string | null;
  submittedAt: string;
};

export type AdminPortfolioReviewHistoryItem = {
  id: string;
  reviewerStage: PortfolioReviewerStage;
  reviewerName: string;
  decision: PortfolioReviewDecision;
  comments: string | null;
  createdAt: string;
  versionNumber: number;
};

export type AdminPreviousAdminRevision = {
  reviewerName: string;
  comments: string | null;
  versionNumber: number;
  createdAt: string;
};

export type AdminPortfolioApprovalDetail = {
  portfolioId: string;
  teamId: string;
  teamName: string;
  currentStageNumber: number | null;
  stageStatus: StageStatus;
  portfolioType: StudentCategory;
  sequenceOrder: number | null;
  workflowStatus: PortfolioWorkflowStatus;
  leaderStudentId: string;
  leaderName: string;
  revisionReturnTo: string | null;
  adminReviewEntryPath: AdminReviewEntryPath;
  latestSubmissionHasEducatorApproval: boolean;
  enteredFromAdminRevision: boolean;
  canReview: boolean;
  previousAdminRevision: AdminPreviousAdminRevision | null;
  latestSubmission: {
    submissionId: string;
    title: string;
    portfolioUrl: string;
    notes: string | null;
    versionNumber: number;
    submittedAt: string;
  } | null;
  submissionHistory: AdminPortfolioSubmissionVersion[];
  reviewHistory: AdminPortfolioReviewHistoryItem[];
};

export type AdminPortfolioApprovalDashboardData = {
  pendingCount: number;
  pendingPreviews: AdminPortfolioApprovalQueueItem[];
};

export type AdminReviewRpcResult = {
  portfolio_output_id: string;
  submission_id: string;
  review_id: string;
  decision: string;
  workflow_status: string;
  next_portfolio_output_id: string | null;
  team_stage_number: number;
};
