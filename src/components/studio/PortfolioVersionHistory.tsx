import { Timeline, type TimelineItem } from "@/components/status/Timeline";
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

  const items: TimelineItem[] = versions.map((version) => {
    const educator = reviewSummary(version.educatorReview, "Educator");
    const admin = reviewSummary(version.adminReview, "Admin");

    return {
      id: `version-${version.versionNumber}`,
      title: `Version ${version.versionNumber} · ${version.title}`,
      timestamp: `Submitted ${formatDateTime(version.submittedAt)}`,
      description: (
        <div className="space-y-2">
          <a
            href={version.portfolioUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all text-text-primary underline underline-offset-2"
          >
            {version.portfolioUrl}
          </a>
          {version.notes ? (
            <p className="whitespace-pre-wrap text-text-muted">{version.notes}</p>
          ) : null}
        </div>
      ),
      meta: (
        <dl className="space-y-2 rounded-[var(--radius-control)] border border-border-default bg-surface-muted/50 p-3 text-sm">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-text-subtle">
              Legacy educator review
            </dt>
            <dd className="mt-0.5 text-text-primary">{educator.label}</dd>
            {educator.comments ? (
              <dd className="mt-1 whitespace-pre-wrap text-text-muted">
                {educator.comments}
              </dd>
            ) : null}
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-text-subtle">
              Admin review
            </dt>
            <dd className="mt-0.5 text-text-primary">{admin.label}</dd>
            {admin.comments ? (
              <dd className="mt-1 whitespace-pre-wrap text-text-muted">
                {admin.comments}
              </dd>
            ) : null}
          </div>
        </dl>
      ),
    };
  });

  return (
    <Timeline
      title="Version history"
      description="Every submitted version is kept permanently, newest first."
      items={items}
    />
  );
}
