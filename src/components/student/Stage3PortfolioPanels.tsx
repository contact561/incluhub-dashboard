import Link from "next/link";
import { PortfolioCard } from "@/components/studio/PortfolioCard";
import { STUDENT_CATEGORY_LABELS } from "@/lib/constants/labels";
import { getPortfolioWorkflowPresentation } from "@/lib/portfolio/workflow-status";
import { buttonVariants } from "@/components/ui/button";
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

        return (
          <div
            key={portfolio.id}
            className={cn(
              "rounded-lg border px-4 py-3",
              isActive ? "border-zinc-300 bg-zinc-50" : "border-zinc-200 bg-white"
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-zinc-900">
                  {portfolio.sequenceOrder}.{" "}
                  {STUDENT_CATEGORY_LABELS[portfolio.portfolioType]} ·{" "}
                  {portfolio.leaderName}
                  {portfolio.leaderStudentId === currentStudentId ? " (You)" : ""}
                </p>
                <p className="mt-1 text-sm text-zinc-600">{presentation.title}</p>
              </div>
              {isActive ? (
                <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-700">
                  Active team portfolio
                </span>
              ) : null}
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

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
        Your portfolio
      </p>
      <h2 className="mt-1 text-lg font-semibold text-zinc-900">
        {STUDENT_CATEGORY_LABELS[portfolio.portfolioType]}
      </h2>
      <p className="mt-2 text-sm font-medium text-zinc-900">
        {presentation.title}
      </p>
      <p className="mt-1 text-sm text-zinc-600">{presentation.description}</p>
      <Link
        href="/student/portfolio"
        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-4")}
      >
        {portfolio.workflowStatus === "revision_required"
          ? "Review feedback and resubmit"
          : "Open portfolio actions"}
      </Link>
    </section>
  );
}
