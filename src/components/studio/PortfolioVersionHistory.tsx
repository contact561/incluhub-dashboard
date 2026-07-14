import type {
  PortfolioReviewView,
  PortfolioSubmissionVersionView,
} from "@/types/portfolio-submission";

type PortfolioVersionHistoryProps = {
  versions: PortfolioSubmissionVersionView[];
};

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function reviewSummary(
  review: PortfolioReviewView | null,
  stageLabel: string
): { label: string; comments: string | null } {
  if (!review) {
    return { label: "No review yet", comments: null };
  }

  const decisionLabel =
    review.decision === "approved" ? "Approved" : "Revision requested";
  const reviewerName = review.reviewerName ?? stageLabel;

  return {
    label: `${decisionLabel} by ${reviewerName} on ${formatDateTime(review.reviewedAt)}`,
    comments: review.comments,
  };
}

export function PortfolioVersionHistory({
  versions,
}: PortfolioVersionHistoryProps) {
  if (versions.length === 0) {
    return null;
  }

  return (
    <section className="rounded-lg border border-zinc-200 p-4">
      <h3 className="text-sm font-semibold text-zinc-900">Version history</h3>
      <p className="mt-1 text-xs text-zinc-500">
        Every submitted version is kept permanently, newest first.
      </p>

      <ol className="mt-4 space-y-4">
        {versions.map((version) => {
          const educator = reviewSummary(version.educatorReview, "Educator");
          const admin = reviewSummary(version.adminReview, "Admin");

          return (
            <li
              key={version.versionNumber}
              className="rounded-md border border-zinc-200 bg-zinc-50/60 p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-sm font-semibold text-zinc-900">
                  Version {version.versionNumber} · {version.title}
                </p>
                <p className="text-xs text-zinc-500">
                  Submitted {formatDateTime(version.submittedAt)}
                </p>
              </div>

              <p className="mt-2 text-sm">
                <a
                  href={version.portfolioUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-zinc-900 underline underline-offset-2"
                >
                  {version.portfolioUrl}
                </a>
              </p>

              {version.notes ? (
                <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">
                  {version.notes}
                </p>
              ) : null}

              <dl className="mt-3 space-y-2 border-t border-zinc-200 pt-3 text-sm">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                    Educator review
                  </dt>
                  <dd className="mt-0.5 text-zinc-900">{educator.label}</dd>
                  {educator.comments ? (
                    <dd className="mt-1 whitespace-pre-wrap text-zinc-600">
                      {educator.comments}
                    </dd>
                  ) : null}
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                    Admin review
                  </dt>
                  <dd className="mt-0.5 text-zinc-900">{admin.label}</dd>
                  {admin.comments ? (
                    <dd className="mt-1 whitespace-pre-wrap text-zinc-600">
                      {admin.comments}
                    </dd>
                  ) : null}
                </div>
              </dl>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
