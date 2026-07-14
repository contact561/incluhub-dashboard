import type { ReviewPortfolioAsAdminState } from "@/actions/portfolio/reviewPortfolioAsAdmin";

type ApprovalResultNoticeProps = {
  state: ReviewPortfolioAsAdminState;
};

export function ApprovalResultNotice({ state }: ApprovalResultNoticeProps) {
  if (!state.success) {
    return null;
  }

  return (
    <section
      className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900"
      role="status"
    >
      <p>{state.success}</p>
      {state.workflowStatus ? (
        <p className="mt-1 text-green-800">
          Workflow status: {state.workflowStatus.replaceAll("_", " ")}
        </p>
      ) : null}
      {state.nextPortfolioOutputId ? (
        <p className="mt-1 text-green-800">
          Next portfolio unlocked for studio booking.
        </p>
      ) : null}
      {typeof state.teamStageNumber === "number" ? (
        <p className="mt-1 text-green-800">
          Team stage: {state.teamStageNumber}
        </p>
      ) : null}
    </section>
  );
}
