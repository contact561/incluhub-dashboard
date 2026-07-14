import { StatusBadge } from "@/components/status";
import { EducatorReviewForm } from "@/components/educator/EducatorReviewForm";
import { ReviewHistory } from "@/components/educator/ReviewHistory";
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

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">
              {submission?.title ?? "Portfolio review"}
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              {STUDENT_CATEGORY_LABELS[detail.portfolioType]} · {detail.teamName}
            </p>
          </div>
          <StatusBadge status={detail.workflowStatus} />
        </div>

        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Portfolio leader
            </dt>
            <dd className="mt-1 text-sm text-zinc-900">{detail.leaderName}</dd>
          </div>
          {submission ? (
            <>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                  Version
                </dt>
                <dd className="mt-1 text-sm text-zinc-900">
                  {submission.versionNumber}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                  Submitted
                </dt>
                <dd className="mt-1 text-sm text-zinc-900">
                  {formatSubmittedAt(submission.submittedAt)}
                </dd>
              </div>
              <div className="sm:col-span-2">
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
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                    Notes
                  </dt>
                  <dd className="mt-1 whitespace-pre-wrap text-sm text-zinc-700">
                    {submission.notes}
                  </dd>
                </div>
              ) : null}
            </>
          ) : (
            <div className="sm:col-span-2">
              <p className="text-sm text-zinc-500">
                No submission is available for this portfolio.
              </p>
            </div>
          )}
        </dl>
      </section>

      {detail.canReview && submission ? (
        <EducatorReviewForm
          portfolioOutputId={detail.portfolioId}
          submissionId={submission.submissionId}
        />
      ) : (
        <section className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {detail.workflowStatus === "pending_educator"
            ? "This portfolio is missing a submission and cannot be reviewed yet."
            : "This portfolio is no longer awaiting educator review."}
        </section>
      )}

      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-base font-semibold text-zinc-900">Review history</h2>
        <div className="mt-4">
          <ReviewHistory history={detail.history} />
        </div>
      </section>
    </div>
  );
}
