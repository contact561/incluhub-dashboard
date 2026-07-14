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
    <section className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-zinc-900">
          Submitted portfolio · v{submission.versionNumber}
        </h3>
        <p className="text-xs font-medium text-zinc-700">
          {statusPresentation.title}
        </p>
      </div>

      <dl className="mt-3 space-y-3 text-sm">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            Title
          </dt>
          <dd className="mt-1 text-zinc-900">{submission.title}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            Portfolio link
          </dt>
          <dd className="mt-1">
            <a
              href={submission.portfolioUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all text-sm text-zinc-900 underline underline-offset-2"
            >
              {submission.portfolioUrl}
            </a>
          </dd>
        </div>
        {submission.notes ? (
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Notes
            </dt>
            <dd className="mt-1 whitespace-pre-wrap text-zinc-700">
              {submission.notes}
            </dd>
          </div>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Submitted by
            </dt>
            <dd className="mt-1 text-zinc-900">{submission.submittedByName}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Submitted at
            </dt>
            <dd className="mt-1 text-zinc-900">
              {formatSubmittedAt(submission.submittedAt)}
            </dd>
          </div>
        </div>
      </dl>

      <p className="mt-3 text-xs text-zinc-500">{statusPresentation.description}</p>
    </section>
  );
}
