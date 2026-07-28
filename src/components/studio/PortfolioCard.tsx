import { ConfirmedBookingCard } from "@/components/studio/ConfirmedBookingCard";
import { PortfolioResubmissionForm } from "@/components/studio/PortfolioResubmissionForm";
import { PortfolioRevisionFeedbackCard } from "@/components/studio/PortfolioRevisionFeedbackCard";
import { PortfolioSubmissionForm } from "@/components/studio/PortfolioSubmissionForm";
import { PortfolioVersionHistory } from "@/components/studio/PortfolioVersionHistory";
import { StudioBookingPanel } from "@/components/studio/StudioBookingPanel";
import { AssistantAvailabilityForm } from "@/components/studio/AssistantAvailabilityForm";
import { StudentOtpCheckin } from "@/components/studio/StudentOtpCheckin";
import { SubmittedPortfolioCard } from "@/components/studio/SubmittedPortfolioCard";
import { MoodboardSubmissionForm } from "@/components/studio/MoodboardSubmissionForm";
import { EducatorCommentTimeline } from "@/components/studio/EducatorCommentTimeline";
import { PortfolioWorkflowBadge } from "@/components/status";
import { StatusPanel } from "@/components/status/StatusPanel";
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
import { cn } from "@/lib/utils";

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

  const statusVariant =
    portfolio.workflowStatus === "revision_required"
      ? "warning"
      : portfolio.workflowStatus === "completed"
        ? "success"
        : portfolio.workflowStatus === "locked"
          ? "neutral"
          : "information";

  return (
    <article
      className={cn(
        "rounded-[var(--radius-card)] border bg-surface-card p-4 sm:p-5",
        emphasizeOwnPortfolio && isLeader
          ? "border-brand-primary/35 shadow-sm"
          : "border-border-default"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
            Portfolio {portfolio.sequenceOrder}
            {isLeader ? " · Your portfolio" : ""}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-text-primary">
            {STUDENT_CATEGORY_LABELS[portfolio.portfolioType]}
          </h2>
        </div>
        <PortfolioWorkflowBadge status={portfolio.workflowStatus} />
      </div>

      <div className="mt-4">
        <StatusPanel
          variant={statusVariant}
          title={statusPresentation.title}
          description={statusPresentation.description}
        />
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-text-muted">
            Leader
          </dt>
          <dd className="mt-1 text-sm text-text-primary">{portfolio.leaderName}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-text-muted">
            Assistants
          </dt>
          <dd className="mt-1 text-sm text-text-primary">
            {assistants.length > 0
              ? assistants.map((assistant) => assistant.fullName).join(", ")
              : "—"}
          </dd>
        </div>
      </dl>

      {portfolio.workflowStatus === "locked" && portfolio.lockedReason ? (
        <div className="mt-4">
          <StatusPanel
            variant="neutral"
            title="Work unavailable"
            description={portfolio.lockedReason}
          />
        </div>
      ) : null}

      {portfolio.workflowStatus === "awaiting_booking" &&
      isLeader &&
      (portfolio.moodboardStatus === "not_submitted" ||
        portfolio.moodboardStatus === "revision_required") ? (
        <div className="mt-4">
          <MoodboardSubmissionForm
            portfolioOutputId={portfolio.id}
            isRevision={portfolio.moodboardStatus === "revision_required"}
            revisionComments={portfolio.moodboard?.reviewComments}
          />
        </div>
      ) : null}

      {portfolio.moodboardStatus === "pending_admin" ? (
        <div className="mt-4">
          <StatusPanel
            variant="information"
            title="Moodboard awaiting Admin review"
            description="Studio booking will open after IncluHub Admin approves the moodboard. Educator comments are advisory and do not block the decision."
          />
        </div>
      ) : null}

      {portfolio.moodboardStatus === "approved" && portfolio.moodboard ? (
        <div className="mt-4 rounded-[var(--radius-card)] border border-border-default bg-surface-muted/40 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
            Approved moodboard
          </p>
          <a
            href={portfolio.moodboard.moodboardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 block break-all text-sm font-medium text-text-primary underline underline-offset-2"
          >
            {portfolio.moodboard.title}
          </a>
        </div>
      ) : null}

      {portfolio.booking ? (
        <div className="mt-4">
          <ConfirmedBookingCard
            booking={portfolio.booking}
            showCheckinHint={
              portfolio.workflowStatus === "awaiting_studio_checkin" && isLeader
            }
            showSubmissionHint={
              portfolio.workflowStatus === "awaiting_submission" && isLeader
            }
          />
        </div>
      ) : null}

      {portfolio.workflowStatus === "awaiting_booking" &&
      portfolio.moodboardStatus === "approved" &&
      isLeader ? (
        <div className="mt-4">
          <StudioBookingPanel portfolioOutputId={portfolio.id} assistantAvailability={portfolio.assistantAvailability} />
        </div>
      ) : null}

      {portfolio.workflowStatus === "awaiting_booking" &&
      portfolio.moodboardStatus === "approved" &&
      !isLeader ? (
        <div className="mt-4">
          <StatusPanel
            variant="information"
            title="When can you support this shoot?"
            description={getAssistantWaitingMessage(portfolio.portfolioType)}
          />
          <AssistantAvailabilityForm
            portfolioOutputId={portfolio.id}
            leaderPortfolioType={portfolio.portfolioType}
          />
        </div>
      ) : null}

      {portfolio.workflowStatus === "awaiting_studio_checkin" && isLeader ? (
        portfolio.booking ? (
          <StudentOtpCheckin bookingId={portfolio.booking.id} />
        ) : null
      ) : null}

      {portfolio.workflowStatus === "awaiting_studio_checkin" && !isLeader ? (
        <div className="mt-4">
          <StatusPanel
            variant="information"
            title="Waiting for studio check-in"
            description={`The ${STUDENT_CATEGORY_LABELS[portfolio.portfolioType]} leader must enter the Admin-generated booking OTP at the studio before their submission unlocks.`}
          />
        </div>
      ) : null}

      {portfolio.workflowStatus === "awaiting_submission" && isLeader ? (
        <div className="mt-4">
          <PortfolioSubmissionForm portfolioOutputId={portfolio.id} />
        </div>
      ) : null}

      {portfolio.workflowStatus === "awaiting_submission" && !isLeader ? (
        <div className="mt-4">
          <StatusPanel
            variant="information"
            title="Waiting on portfolio leader"
            description={getAssistantSubmissionWaitingMessage(
              portfolio.portfolioType
            )}
          />
        </div>
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
        <div className="mt-4">
          <StatusPanel
            variant="information"
            title="Waiting on portfolio leader"
            description={getAssistantRevisionWaitingMessage(
              portfolio.portfolioType
            )}
          />
        </div>
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

      {portfolio.educatorComments.length > 0 ? (
        <div className="mt-4">
          <EducatorCommentTimeline comments={portfolio.educatorComments} />
        </div>
      ) : null}
    </article>
  );
}
