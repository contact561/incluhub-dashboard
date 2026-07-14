import type {
  PortfolioReviewDecision,
  PortfolioReviewerStage,
  PortfolioWorkflowStatus,
} from "@/types/database";

export type PortfolioSubmissionView = {
  id: string;
  versionNumber: number;
  title: string;
  portfolioUrl: string;
  notes: string | null;
  submittedAt: string;
  submittedByStudentId: string;
  submittedByName: string;
};

export type PortfolioReviewView = {
  reviewerStage: PortfolioReviewerStage;
  decision: PortfolioReviewDecision;
  comments: string | null;
  reviewerName: string | null;
  reviewedAt: string;
};

export type PortfolioSubmissionVersionView = PortfolioSubmissionView & {
  educatorReview: PortfolioReviewView | null;
  adminReview: PortfolioReviewView | null;
};

export type PortfolioRevisionFeedback = {
  reviewerStage: PortfolioReviewerStage;
  reviewerName: string | null;
  comments: string | null;
  reviewedAt: string;
  versionNumber: number;
};

export type SubmitPortfolioResult = {
  submissionId: string;
  portfolioOutputId: string;
  versionNumber: number;
  title: string;
  portfolioUrl: string;
  notes: string | null;
  submittedAt: string;
  workflowStatus: PortfolioWorkflowStatus;
};
