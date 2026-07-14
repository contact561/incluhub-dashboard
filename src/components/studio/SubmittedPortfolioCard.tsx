import type { PortfolioSubmissionView } from "@/types/portfolio-submission";

type SubmittedPortfolioCardProps = {
  submission: PortfolioSubmissionView;
};

function formatSubmittedAt(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function SubmittedPortfolioCard({
  submission,
}: SubmittedPortfolioCardProps) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-zinc-900">
          Submitted portfolio
        </h3>
        <p className="text-xs font-medium text-amber-800">
          Pending Educator Review
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

      <p className="mt-3 text-xs text-zinc-500">
        This submission is read-only. Editing and resubmission open only after a
        formal revision request in a future workflow.
      </p>
    </section>
  );
}
