import { StatusPanel } from "@/components/status/StatusPanel";
import type {
  PortfolioRevisionFeedback,
  PortfolioSubmissionView,
} from "@/types/portfolio-submission";
import type { PortfolioRevisionRoute } from "@/types/database";

type PortfolioRevisionFeedbackCardProps = {
  feedback: PortfolioRevisionFeedback | null;
  previousSubmission: PortfolioSubmissionView | null;
  revisionRoute: PortfolioRevisionRoute | null;
};

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function PortfolioRevisionFeedbackCard({
  feedback,
  previousSubmission,
  revisionRoute,
}: PortfolioRevisionFeedbackCardProps) {
  const requestedBy =
    (feedback?.reviewerStage ?? revisionRoute) === "admin"
      ? "Admin"
      : "Educator";

  return (
    <StatusPanel
      variant="warning"
      title={`Revision requested by ${requestedBy}`}
      description="Read the feedback below, then resubmit a new portfolio version."
    >
      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-text-subtle">
            Reviewer
          </dt>
          <dd className="mt-1 text-text-primary">
            {feedback?.reviewerName ?? requestedBy}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-text-subtle">
            Revision comments
          </dt>
          <dd className="mt-1 whitespace-pre-wrap text-text-primary">
            {feedback?.comments?.trim()
              ? feedback.comments
              : "No revision comments were provided."}
          </dd>
        </div>
        {feedback ? (
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-text-subtle">
              Requested on
            </dt>
            <dd className="mt-1 text-text-primary">
              {formatDateTime(feedback.reviewedAt)}
            </dd>
          </div>
        ) : null}
      </dl>

      {previousSubmission ? (
        <div className="mt-3 rounded-[var(--radius-control)] border border-border-default bg-surface-card p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
            Submission under revision · Version {previousSubmission.versionNumber}
          </p>
          <dl className="mt-2 space-y-2 text-sm">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-text-muted">
                Title
              </dt>
              <dd className="mt-0.5 text-text-primary">
                {previousSubmission.title}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-text-muted">
                Portfolio link
              </dt>
              <dd className="mt-0.5">
                <a
                  href={previousSubmission.portfolioUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-text-primary underline underline-offset-2"
                >
                  {previousSubmission.portfolioUrl}
                </a>
              </dd>
            </div>
            {previousSubmission.notes ? (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-text-muted">
                  Notes
                </dt>
                <dd className="mt-0.5 whitespace-pre-wrap text-text-muted">
                  {previousSubmission.notes}
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-text-muted">
                Submitted on
              </dt>
              <dd className="mt-0.5 text-text-primary">
                {formatDateTime(previousSubmission.submittedAt)}
              </dd>
            </div>
          </dl>
        </div>
      ) : null}
    </StatusPanel>
  );
}
