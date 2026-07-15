import Link from "next/link";
import { PortfolioCard } from "@/components/studio/PortfolioCard";
import { PortfolioWorkflowBadge } from "@/components/status";
import { StatusPanel } from "@/components/status/StatusPanel";
import { buttonVariants } from "@/components/ui/button";
import { STUDENT_CATEGORY_LABELS } from "@/lib/constants/labels";
import { getPortfolioWorkflowPresentation } from "@/lib/portfolio/workflow-status";
import type {
  PortfolioRevisionFeedback,
  PortfolioSubmissionVersionView,
} from "@/types/portfolio-submission";
import type { StudentPortfolioCard } from "@/types/studio-booking";
import { cn } from "@/lib/utils";

type TeamPortfolioProgressListProps = {
  portfolios: StudentPortfolioCard[];
  currentStudentId: string;
  activeTeamPortfolioId?: string | null;
};

export function TeamPortfolioProgressList({
  portfolios,
  currentStudentId,
  activeTeamPortfolioId = null,
}: TeamPortfolioProgressListProps) {
  return (
    <div className="space-y-3">
      {portfolios.map((portfolio) => {
        const presentation = getPortfolioWorkflowPresentation(
          portfolio.workflowStatus,
          portfolio.portfolioType,
          {
            revisionReturnTo: portfolio.revisionReturnTo,
            sequenceOrder: portfolio.sequenceOrder,
          }
        );
        const isActive = portfolio.id === activeTeamPortfolioId;
        const isOwn = portfolio.leaderStudentId === currentStudentId;

        return (
          <div
            key={portfolio.id}
            className={cn(
              "rounded-[var(--radius-card)] border px-4 py-3",
              isActive
                ? "border-brand-primary/40 bg-brand-primary-soft/40"
                : "border-border-default bg-surface-card"
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-primary">
                  {portfolio.sequenceOrder}.{" "}
                  {STUDENT_CATEGORY_LABELS[portfolio.portfolioType]} ·{" "}
                  {portfolio.leaderName}
                  {isOwn ? " (You)" : ""}
                </p>
                <p className="mt-1 text-sm text-text-muted">
                  {presentation.title}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <PortfolioWorkflowBadge status={portfolio.workflowStatus} />
                {isActive ? (
                  <span className="rounded-md bg-surface-muted px-2 py-0.5 text-xs font-medium text-text-muted">
                    Active team portfolio
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

type StudentOwnPortfolioPanelProps = {
  portfolio: StudentPortfolioCard;
  currentStudentId: string;
  revisionFeedback?: PortfolioRevisionFeedback | null;
  submissionHistory?: PortfolioSubmissionVersionView[];
};

export function StudentOwnPortfolioPanel({
  portfolio,
  currentStudentId,
  revisionFeedback = null,
  submissionHistory = [],
}: StudentOwnPortfolioPanelProps) {
  return (
    <PortfolioCard
      portfolio={portfolio}
      currentStudentId={currentStudentId}
      emphasizeOwnPortfolio
      revisionFeedback={revisionFeedback}
      submissionHistory={submissionHistory}
    />
  );
}

type StudentDashboardOwnPortfolioSummaryProps = {
  portfolio: StudentPortfolioCard;
};

function nextActionLabel(
  workflowStatus: StudentPortfolioCard["workflowStatus"]
): string {
  switch (workflowStatus) {
    case "awaiting_booking":
      return "Book studio slot";
    case "awaiting_submission":
      return "Submit portfolio";
    case "revision_required":
      return "Review feedback and resubmit";
    case "pending_educator":
    case "pending_admin":
      return "View portfolio status";
    case "completed":
      return "View approved portfolio";
    case "locked":
    default:
      return "View portfolio details";
  }
}

export function StudentDashboardOwnPortfolioSummary({
  portfolio,
}: StudentDashboardOwnPortfolioSummaryProps) {
  const presentation = getPortfolioWorkflowPresentation(
    portfolio.workflowStatus,
    portfolio.portfolioType,
    {
      revisionReturnTo: portfolio.revisionReturnTo,
      sequenceOrder: portfolio.sequenceOrder,
    }
  );

  const panelVariant =
    portfolio.workflowStatus === "revision_required"
      ? "warning"
      : portfolio.workflowStatus === "completed"
        ? "success"
        : portfolio.workflowStatus === "locked"
          ? "neutral"
          : portfolio.workflowStatus === "pending_educator" ||
              portfolio.workflowStatus === "pending_admin"
            ? "information"
            : "information";

  return (
    <StatusPanel
      variant={panelVariant}
      title={`Your next step — ${STUDENT_CATEGORY_LABELS[portfolio.portfolioType]}`}
      description={`${presentation.title}. ${presentation.description}`}
      action={
        <div className="flex flex-wrap items-center gap-3">
          <PortfolioWorkflowBadge status={portfolio.workflowStatus} />
          <Link
            href="/student/portfolio"
            className={cn(buttonVariants({ size: "sm" }))}
          >
            {nextActionLabel(portfolio.workflowStatus)}
          </Link>
        </div>
      }
    />
  );
}
