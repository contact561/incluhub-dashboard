import type { PortfolioWorkflowStatus } from "@/types/database";

/**
 * Semantic intent for status surfaces (UI-1A tokens).
 * Not burgundy — reserved for brand primary actions.
 */
export type StatusIntent =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral";

export const STATUS_INTENT_CLASSES: Record<
  StatusIntent,
  {
    badge: string;
    panel: string;
    title: string;
    body: string;
    icon: string;
  }
> = {
  success: {
    badge:
      "border-status-success/30 bg-status-success-soft text-status-success",
    panel: "border-status-success/30 bg-status-success-soft",
    title: "text-status-success",
    body: "text-text-primary",
    icon: "text-status-success",
  },
  warning: {
    badge:
      "border-status-warning/30 bg-status-warning-soft text-status-warning",
    panel: "border-status-warning/30 bg-status-warning-soft",
    title: "text-status-warning",
    body: "text-text-primary",
    icon: "text-status-warning",
  },
  danger: {
    badge: "border-status-danger/30 bg-status-danger-soft text-status-danger",
    panel: "border-status-danger/30 bg-status-danger-soft",
    title: "text-status-danger",
    body: "text-text-primary",
    icon: "text-status-danger",
  },
  info: {
    badge: "border-status-info/30 bg-status-info-soft text-status-info",
    panel: "border-status-info/30 bg-status-info-soft",
    title: "text-status-info",
    body: "text-text-primary",
    icon: "text-status-info",
  },
  neutral: {
    badge: "border-border-default bg-surface-muted text-text-muted",
    panel: "border-border-default bg-surface-muted",
    title: "text-text-primary",
    body: "text-text-muted",
    icon: "text-text-muted",
  },
};

const PORTFOLIO_WORKFLOW_STATUSES: readonly PortfolioWorkflowStatus[] = [
  "locked",
  "awaiting_booking",
  "awaiting_studio_checkin",
  "awaiting_submission",
  "pending_educator",
  "pending_admin",
  "revision_required",
  "completed",
] as const;

export function isPortfolioWorkflowStatus(
  value: string
): value is PortfolioWorkflowStatus {
  return (PORTFOLIO_WORKFLOW_STATUSES as readonly string[]).includes(value);
}

/**
 * Maps canonical portfolio_workflow_status values to semantic intent.
 * Labels stay in PORTFOLIO_WORKFLOW_STATUS_LABELS / getPortfolioWorkflowPresentation.
 */
export function getPortfolioWorkflowSemanticIntent(
  status: PortfolioWorkflowStatus
): StatusIntent {
  switch (status) {
    case "locked":
      return "neutral";
    case "awaiting_booking":
    case "awaiting_studio_checkin":
    case "awaiting_submission":
      return "info";
    case "pending_educator":
    case "pending_admin":
    case "revision_required":
      return "warning";
    case "completed":
      return "success";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}
