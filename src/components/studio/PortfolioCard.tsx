import { ConfirmedBookingCard } from "@/components/studio/ConfirmedBookingCard";
import { PortfolioResubmissionForm } from "@/components/studio/PortfolioResubmissionForm";
import { PortfolioRevisionFeedbackCard } from "@/components/studio/PortfolioRevisionFeedbackCard";
import { PortfolioSubmissionForm } from "@/components/studio/PortfolioSubmissionForm";
import { PortfolioVersionHistory } from "@/components/studio/PortfolioVersionHistory";
import { StudioBookingPanel } from "@/components/studio/StudioBookingPanel";
import { SubmittedPortfolioCard } from "@/components/studio/SubmittedPortfolioCard";
import { STUDENT_CATEGORY_LABELS } from "@/lib/constants/labels";
import {
  getAssistantRevisionWaitingMessage,
  getAssistantSubmissionWaitingMessage,
  getAssistantWaitingMessage,
} from "@/lib/data/student/portfolio";
import {
  getPortfolioWorkflowPresentation,
  shouldShowSubmittedPortfolioSummary,
} from "@/lib/portfolio/workflow-status";
import type {
  PortfolioRevisionFeedback,
  PortfolioSubmissionVersionView,
} from "@/types/portfolio-submission";
import type { StudentPortfolioCard } from "@/types/studio-booking";

type PortfolioCardProps = {
  portfolio: StudentPortfolioCard;
  currentStudentId: string;
  emphasizeOwnPortfolio?: boolean;
  revisionFeedback?: PortfolioRevisionFeedback | null;
  submissionHistory?: PortfolioSubmissionVersionView[];
};

export function PortfolioCard({
  portfolio,
  currentStudentId,
  emphasizeOwnPortfolio = false,
  revisionFeedback = null,
  submissionHistory = [],
}: PortfolioCardProps) {
  const isLeader = portfolio.leaderStudentId === currentStudentId;
  const showRevisionPanel =
    portfolio.workflowStatus === "revision_required" && isLeader;
  const assistants = portfolio.participants.filter(
    (participant) => participant.role === "assistant"
  );
  const statusPresentation = getPortfolioWorkflowPresentation(
    portfolio.workflowStatus,
    portfolio.portfolioType,
    {
      revisionReturnTo: portfolio.revisionReturnTo,
      sequenceOrder: portfolio.sequenceOrder,
    }
  );

  return (
    <article
      className={
        emphasizeOwnPortfolio && isLeader
          ? "rounded-lg border-2 border-zinc-300 bg-white p-4"
          : "rounded-lg border border-zinc-200 p-4"
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            Portfolio {portfolio.sequenceOrder}
            {isLeader ? " · Your portfolio" : ""}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-zinc-900">
            {STUDENT_CATEGORY_LABELS[portfolio.portfolioType]}
          </h2>
        </div>
      </div>

      <div className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2">
        <p className="text-sm font-medium text-zinc-900">
          {statusPresentation.title}
        </p>
        <p className="mt-1 text-sm text-zinc-600">{statusPresentation.description}</p>
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            Leader
          </dt>
          <dd className="mt-1 text-sm text-zinc-900">{portfolio.leaderName}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            Assistants
          </dt>
          <dd className="mt-1 text-sm text-zinc-900">
            {assistants.length > 0
              ? assistants.map((assistant) => assistant.fullName).join(", ")
              : "—"}
          </dd>
        </div>
      </dl>

      {portfolio.workflowStatus === "locked" && portfolio.lockedReason ? (
        <p className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
          {portfolio.lockedReason}
        </p>
      ) : null}

      {portfolio.booking ? (
        <div className="mt-4">
          <ConfirmedBookingCard
            booking={portfolio.booking}
            showSubmissionHint={
              portfolio.workflowStatus === "awaiting_submission" && isLeader
            }
          />
        </div>
      ) : null}

      {portfolio.workflowStatus === "awaiting_booking" && isLeader ? (
        <div className="mt-4">
          <StudioBookingPanel portfolioOutputId={portfolio.id} />
        </div>
      ) : null}

      {portfolio.workflowStatus === "awaiting_booking" && !isLeader ? (
        <p className="mt-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
          {getAssistantWaitingMessage(portfolio.portfolioType)}
        </p>
      ) : null}

      {portfolio.workflowStatus === "awaiting_submission" && isLeader ? (
        <div className="mt-4">
          <PortfolioSubmissionForm portfolioOutputId={portfolio.id} />
        </div>
      ) : null}

      {portfolio.workflowStatus === "awaiting_submission" && !isLeader ? (
        <p className="mt-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
          {getAssistantSubmissionWaitingMessage(portfolio.portfolioType)}
        </p>
      ) : null}

      {showRevisionPanel ? (
        <div className="mt-4 space-y-4">
          <PortfolioRevisionFeedbackCard
            feedback={revisionFeedback}
            previousSubmission={portfolio.submission}
            revisionRoute={portfolio.revisionReturnTo}
          />
          <PortfolioResubmissionForm
            portfolioOutputId={portfolio.id}
            nextVersionNumber={(portfolio.submission?.versionNumber ?? 1) + 1}
            previousTitle={portfolio.submission?.title ?? ""}
            previousUrl={portfolio.submission?.portfolioUrl ?? ""}
            previousNotes={portfolio.submission?.notes ?? null}
          />
        </div>
      ) : null}

      {portfolio.workflowStatus === "revision_required" && !isLeader ? (
        <p className="mt-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
          {getAssistantRevisionWaitingMessage(portfolio.portfolioType)}
        </p>
      ) : null}

      {!showRevisionPanel &&
      portfolio.submission &&
      shouldShowSubmittedPortfolioSummary(portfolio.workflowStatus) ? (
        <div className="mt-4">
          <SubmittedPortfolioCard
            submission={portfolio.submission}
            workflowStatus={portfolio.workflowStatus}
            portfolioType={portfolio.portfolioType}
            revisionReturnTo={portfolio.revisionReturnTo}
          />
        </div>
      ) : null}

      {submissionHistory.length > 0 ? (
        <div className="mt-4">
          <PortfolioVersionHistory versions={submissionHistory} />
        </div>
      ) : null}
    </article>
  );
}
