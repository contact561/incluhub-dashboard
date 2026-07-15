import { PortfolioWorkflowBadge } from "@/components/status";
import {
  getPortfolioWorkflowPresentation,
  shouldShowSubmittedPortfolioSummary,
} from "@/lib/portfolio/workflow-status";
import type { PortfolioSubmissionView } from "@/types/portfolio-submission";
import type {
  PortfolioRevisionRoute,
  PortfolioWorkflowStatus,
  StudentCategory,
} from "@/types/database";

type SubmittedPortfolioCardProps = {
  submission: PortfolioSubmissionView;
  workflowStatus: PortfolioWorkflowStatus;
  portfolioType: StudentCategory;
  revisionReturnTo?: PortfolioRevisionRoute | null;
};

function formatSubmittedAt(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function SubmittedPortfolioCard({
  submission,
  workflowStatus,
  portfolioType,
  revisionReturnTo = null,
}: SubmittedPortfolioCardProps) {
  if (!shouldShowSubmittedPortfolioSummary(workflowStatus)) {
    return null;
  }

  const statusPresentation = getPortfolioWorkflowPresentation(
    workflowStatus,
    portfolioType,
    { revisionReturnTo, sequenceOrder: undefined }
  );

  return (
    <section className="rounded-[var(--radius-card)] border border-border-default bg-surface-muted/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-text-primary">
          Submitted portfolio · v{submission.versionNumber}
        </h3>
        <PortfolioWorkflowBadge status={workflowStatus} />
      </div>

      <dl className="mt-3 space-y-3 text-sm">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-text-muted">
            Title
          </dt>
          <dd className="mt-1 text-text-primary">{submission.title}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-text-muted">
            Portfolio link
          </dt>
          <dd className="mt-1">
            <a
              href={submission.portfolioUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all text-sm text-text-primary underline underline-offset-2"
            >
              {submission.portfolioUrl}
            </a>
          </dd>
        </div>
        {submission.notes ? (
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-text-muted">
              Notes
            </dt>
            <dd className="mt-1 whitespace-pre-wrap text-text-muted">
              {submission.notes}
            </dd>
          </div>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-text-muted">
              Submitted by
            </dt>
            <dd className="mt-1 text-text-primary">{submission.submittedByName}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-text-muted">
              Submitted at
            </dt>
            <dd className="mt-1 text-text-primary">
              {formatSubmittedAt(submission.submittedAt)}
            </dd>
          </div>
        </div>
      </dl>

      <p className="mt-3 text-sm text-text-muted">
        {statusPresentation.title}. {statusPresentation.description}
      </p>
    </section>
  );
}
