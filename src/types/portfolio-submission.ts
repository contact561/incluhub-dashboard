import type { PortfolioWorkflowStatus } from "@/types/database";

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
