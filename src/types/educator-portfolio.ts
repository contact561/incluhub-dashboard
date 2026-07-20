import type {
  PortfolioReviewDecision,
  PortfolioReviewerStage,
  PortfolioWorkflowStatus,
  StageStatus,
  StudentCategory,
} from "@/types/database";
import type { BrandOpportunityView } from "@/types/brand-opportunity";

export type EducatorDashboardSummary = {
  assignedTeamsCount: number;
  assignedStudentsCount: number;
  awaitingReviewCount: number;
  reviewsCompletedCount: number;
};

export type EducatorPendingReviewPreview = {
  portfolioId: string;
  title: string;
  portfolioType: StudentCategory;
  teamName: string;
  leaderName: string;
  versionNumber: number;
  submittedAt: string;
};

export type EducatorDashboardData = {
  summary: EducatorDashboardSummary;
  pendingPreviews: EducatorPendingReviewPreview[];
};

export type EducatorAssignedStudentSummary = {
  studentId: string;
  fullName: string;
  category: StudentCategory;
};

export type EducatorAssignedTeam = {
  teamId: string;
  teamName: string;
  currentStageNumber: number | null;
  stageStatus: StageStatus;
  mappedStudents: EducatorAssignedStudentSummary[];
  activePortfolioType: StudentCategory | null;
  activeWorkflowStatus: PortfolioWorkflowStatus | null;
  pendingReviewPortfolioId: string | null;
  bmsSessionDate: string | null;
  bmsRemarks: string | null;
  brandWorksDate: string | null;
  brandWorksRemarks: string | null;
  brandWorksScheduledAt: string | null;
  brandWorksCompletedAt: string | null;
  brandOpportunity: BrandOpportunityView | null;
};

export type EducatorAssignedStudent = {
  studentId: string;
  fullName: string;
  category: StudentCategory;
  teamId: string;
  teamName: string;
  currentStageNumber: number | null;
  portfolioType: StudentCategory | null;
  workflowStatus: PortfolioWorkflowStatus | null;
  pendingReviewPortfolioId: string | null;
};

export type EducatorReviewQueueItem = {
  portfolioId: string;
  title: string;
  portfolioType: StudentCategory;
  teamName: string;
  leaderName: string;
  versionNumber: number;
  submittedAt: string;
};

export type EducatorReviewHistoryItem = {
  id: string;
  reviewerStage: PortfolioReviewerStage;
  decision: PortfolioReviewDecision;
  comments: string | null;
  createdAt: string;
  versionNumber: number;
};

export type EducatorReviewDetail = {
  portfolioId: string;
  teamId: string;
  teamName: string;
  portfolioType: StudentCategory;
  workflowStatus: PortfolioWorkflowStatus;
  leaderStudentId: string;
  leaderName: string;
  canReview: boolean;
  latestSubmission: {
    submissionId: string;
    title: string;
    portfolioUrl: string;
    notes: string | null;
    versionNumber: number;
    submittedAt: string;
  } | null;
  history: EducatorReviewHistoryItem[];
};
