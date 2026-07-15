import { ActionPanel } from "@/components/educator/ActionPanel";
import { EducatorReviewForm } from "@/components/educator/EducatorReviewForm";
import { ProfileSummary } from "@/components/educator/ProfileSummary";
import { ReviewHistory } from "@/components/educator/ReviewHistory";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { StatusPanel } from "@/components/status";
import { STUDENT_CATEGORY_LABELS } from "@/lib/constants/labels";
import type { EducatorReviewDetail } from "@/types/educator-portfolio";

type PortfolioReviewDetailProps = {
  detail: EducatorReviewDetail;
};

function formatSubmittedAt(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function PortfolioReviewDetailView({
  detail,
}: PortfolioReviewDetailProps) {
  const submission = detail.latestSubmission;
  const disciplineLabel = STUDENT_CATEGORY_LABELS[detail.portfolioType];

  return (
    <div className="space-y-6 lg:grid lg:grid-cols-[minmax(0,1fr)_min(22rem,100%)] lg:items-start lg:gap-6 lg:space-y-0">
      <div className="space-y-6">
        <ProfileSummary
          title={submission?.title ?? "Portfolio review"}
          subtitle={`${disciplineLabel} · ${detail.teamName}`}
          studentName={detail.leaderName}
          teamName={detail.teamName}
          disciplineLabel={disciplineLabel}
          workflowStatus={detail.workflowStatus}
        />

        <section className="rounded-[var(--radius-card)] border border-border-default bg-surface-card p-4 sm:p-5">
          <SectionHeader
            title="Current submission"
            description="Latest version available for this portfolio."
            as="h2"
            compact
          />
          {submission ? (
            <dl className="mt-2 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-text-subtle">
                  Version
                </dt>
                <dd className="mt-1 text-sm text-text-primary">
                  {submission.versionNumber}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-text-subtle">
                  Submitted
                </dt>
                <dd className="mt-1 text-sm text-text-primary">
                  {formatSubmittedAt(submission.submittedAt)}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-text-subtle">
                  Portfolio link
                </dt>
                <dd className="mt-1">
                  <a
                    href={submission.portfolioUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all text-sm text-text-primary underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    {submission.portfolioUrl}
                  </a>
                </dd>
              </div>
              {submission.notes ? (
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium uppercase tracking-wide text-text-subtle">
                    Notes
                  </dt>
                  <dd className="mt-1 whitespace-pre-wrap text-sm text-text-muted">
                    {submission.notes}
                  </dd>
                </div>
              ) : null}
            </dl>
          ) : (
            <p className="mt-2 text-sm text-text-muted">
              No submission is available for this portfolio.
            </p>
          )}
        </section>

        <ReviewHistory history={detail.history} />
      </div>

      <div className="space-y-4">
        {detail.canReview && submission ? (
          <ActionPanel
            title="Your decision"
            description="Approve to send this portfolio to Admin review, or request a revision with clear feedback for the portfolio leader."
          >
            <EducatorReviewForm
              portfolioOutputId={detail.portfolioId}
              submissionId={submission.submissionId}
            />
          </ActionPanel>
        ) : (
          <StatusPanel
            variant="information"
            title={
              detail.workflowStatus === "pending_educator"
                ? "Review unavailable"
                : "Not awaiting educator review"
            }
            description={
              detail.workflowStatus === "pending_educator"
                ? "This portfolio is missing a submission and cannot be reviewed yet."
                : "This portfolio is no longer awaiting educator review."
            }
          />
        )}
      </div>
    </div>
  );
}
