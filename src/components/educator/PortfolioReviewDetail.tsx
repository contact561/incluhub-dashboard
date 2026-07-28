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
  const moodboard = detail.latestMoodboard;
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

        <section className="rounded-[var(--radius-card)] border border-border-default bg-surface-card p-4 sm:p-5">
          <SectionHeader
            title="Latest moodboard"
            description="Moodboards are approved only by IncluHub Admin."
            as="h2"
            compact
          />
          {moodboard ? (
            <div className="mt-3 space-y-2 text-sm">
              <p className="font-medium text-text-primary">
                {moodboard.title} · Version {moodboard.versionNumber}
              </p>
              <a
                href={moodboard.moodboardUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block break-all text-text-primary underline underline-offset-2"
              >
                Open moodboard
              </a>
              {moodboard.notes ? (
                <p className="whitespace-pre-wrap text-text-muted">
                  {moodboard.notes}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="mt-2 text-sm text-text-muted">
              No moodboard has been submitted yet.
            </p>
          )}
        </section>

        <ReviewHistory history={detail.history} />

        {detail.comments.length > 0 ? (
          <section className="rounded-[var(--radius-card)] border border-border-default bg-surface-card p-4 sm:p-5">
            <SectionHeader
              title="Educator comments"
              description="Monitoring notes visible to the team and Admin."
              as="h2"
              compact
            />
            <div className="mt-3 space-y-3">
              {detail.comments.map((comment) => (
                <article
                  key={comment.id}
                  className="border-l-2 border-brand-gold pl-3"
                >
                  <p className="whitespace-pre-wrap text-sm text-text-primary">
                    {comment.body}
                  </p>
                  <p className="mt-1 text-xs text-text-muted">
                    {comment.authorName} · {formatSubmittedAt(comment.createdAt)}
                  </p>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <div className="space-y-4">
        {detail.canComment ? (
          <ActionPanel
            title="Add a monitoring comment"
            description="Educator comments are advisory. Only IncluHub Admin can approve or request a revision."
          >
            <EducatorReviewForm
              teamId={detail.teamId}
              portfolioOutputId={detail.portfolioId}
              moodboardSubmissionId={moodboard?.submissionId ?? null}
              portfolioSubmissionId={submission?.submissionId ?? null}
            />
          </ActionPanel>
        ) : (
          <StatusPanel
            variant="information"
            title={
              "Nothing to comment on yet"
            }
            description={
              "A moodboard or portfolio submission will appear here when the student uploads it."
            }
          />
        )}
      </div>
    </div>
  );
}
