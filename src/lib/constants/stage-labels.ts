import type { PortfolioWorkflowStatus } from "@/types/database";

export const PORTFOLIO_WORKFLOW_STATUS_LABELS: Record<
  PortfolioWorkflowStatus,
  string
> = {
  locked: "Locked",
  awaiting_booking: "Awaiting Booking",
  awaiting_submission: "Awaiting Submission",
  pending_educator: "Pending Educator",
  pending_admin: "Pending Admin",
  revision_required: "Revision Required",
  completed: "Completed",
};

export const STAGE_COLUMN_LABELS = {
  stage2: "Stage 2 — BMS Session",
  stage3: "Stage 3 — Sequential Portfolio Production",
  stage4: "Stage 4 — Brand / Creative Project",
  stage5: "Stage 5 — Ecosystem / Application Unlock",
} as const;
