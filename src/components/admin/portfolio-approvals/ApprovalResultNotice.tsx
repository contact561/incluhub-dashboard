import type { ReviewPortfolioAsAdminState } from "@/actions/portfolio/reviewPortfolioAsAdmin";
import { StatusPanel } from "@/components/status";

type ApprovalResultNoticeProps = {
  state: ReviewPortfolioAsAdminState;
};

export function ApprovalResultNotice({ state }: ApprovalResultNoticeProps) {
  if (!state.success) {
    return null;
  }

  const details = [
    state.workflowStatus
      ? `Workflow status: ${state.workflowStatus.replaceAll("_", " ")}`
      : null,
    state.nextPortfolioOutputId
      ? "Next portfolio unlocked for studio booking."
      : null,
    typeof state.teamStageNumber === "number"
      ? `Team stage: ${state.teamStageNumber}`
      : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <StatusPanel
      variant="success"
      title={state.success}
      description={details || undefined}
    />
  );
}
