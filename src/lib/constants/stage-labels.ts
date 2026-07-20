import type { PortfolioWorkflowStatus } from "@/types/database";
import { getPortfolioWorkflowPresentation } from "@/lib/portfolio/workflow-status";

export const PORTFOLIO_WORKFLOW_STATUS_LABELS: Record<
  PortfolioWorkflowStatus,
  string
> = {
  locked: getPortfolioWorkflowPresentation("locked", "photographer").title,
  awaiting_booking: getPortfolioWorkflowPresentation(
    "awaiting_booking",
    "photographer"
  ).title,
  awaiting_studio_checkin: getPortfolioWorkflowPresentation(
    "awaiting_studio_checkin",
    "photographer"
  ).title,
  awaiting_submission: getPortfolioWorkflowPresentation(
    "awaiting_submission",
    "photographer"
  ).title,
  pending_educator: getPortfolioWorkflowPresentation(
    "pending_educator",
    "photographer"
  ).title,
  pending_admin: getPortfolioWorkflowPresentation("pending_admin", "photographer")
    .title,
  revision_required: getPortfolioWorkflowPresentation(
    "revision_required",
    "photographer"
  ).title,
  completed: getPortfolioWorkflowPresentation("completed", "photographer").title,
};

export const STAGE_COLUMN_LABELS = {
  stage2: "Stage 2 — BMS Session",
  stage3: "Stage 3 — Sequential Portfolio Production",
  stage4: "Stage 4 — Brand Works",
  stage5: "Stage 5 — IncluHub Ecosystem Welcome",
} as const;
