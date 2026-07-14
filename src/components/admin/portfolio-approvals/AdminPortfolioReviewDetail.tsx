import { AdminReviewForm } from "@/components/admin/portfolio-approvals/AdminReviewForm";
import { PortfolioReviewHistory } from "@/components/admin/portfolio-approvals/PortfolioReviewHistory";
import { SubmissionVersionHistory } from "@/components/admin/portfolio-approvals/SubmissionVersionHistory";
import { StatusBadge } from "@/components/status";
import { STUDENT_CATEGORY_LABELS } from "@/lib/constants/labels";
import type { AdminPortfolioApprovalDetail } from "@/types/admin-portfolio-approval";

type AdminPortfolioReviewDetailProps = {
  detail: AdminPortfolioApprovalDetail;
};

function formatSubmittedAt(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function AdminPortfolioReviewDetailView({
  detail,
}: AdminPortfolioReviewDetailProps) {
  const submission = detail.latestSubmission;
  const educatorReview = detail.reviewHistory.find(
    (item) =>
      item.reviewerStage === "educator" &&
      item.decision === "approved" &&
      submission &&
      item.versionNumber === submission.versionNumber
  );

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">
              {submission?.title ?? "Portfolio approval"}
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
              Team stage
            </dt>
            <dd className="mt-1 text-sm text-zinc-900">
              Stage {detail.currentStageNumber ?? "—"} ·{" "}
              {detail.stageStatus.replaceAll("_", " ")}
            </dd>
          </div>
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
                  Current version
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

      {detail.adminReviewEntryPath === "educator_approved" ? (
        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-base font-semibold text-zinc-900">
            Educator review (current version)
          </h2>
          <div className="mt-4">
            {educatorReview ? (
              <div className="rounded-lg border border-zinc-200 bg-zinc-50/70 px-4 py-3">
                <p className="text-sm font-medium text-zinc-900">
                  Approved by {educatorReview.reviewerName}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  v{educatorReview.versionNumber} ·{" "}
                  {formatSubmittedAt(educatorReview.createdAt)}
                </p>
                {educatorReview.comments ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">
                    {educatorReview.comments}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-amber-700">
                Educator approval record is missing for the current version.
              </p>
            )}
          </div>
        </section>
      ) : null}

      {detail.adminReviewEntryPath === "admin_revision_resubmission" &&
      detail.previousAdminRevision ? (
        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-base font-semibold text-zinc-900">
            Previous Admin revision request
          </h2>
          <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50/70 px-4 py-3">
            <p className="text-sm font-medium text-zinc-900">
              Requested by {detail.previousAdminRevision.reviewerName}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              v{detail.previousAdminRevision.versionNumber} ·{" "}
              {formatSubmittedAt(detail.previousAdminRevision.createdAt)}
            </p>
            {detail.previousAdminRevision.comments ? (
              <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">
                {detail.previousAdminRevision.comments}
              </p>
            ) : (
              <p className="mt-2 text-sm text-zinc-500">
                No revision comments were recorded.
              </p>
            )}
          </div>
          <p className="mt-3 text-sm text-zinc-600">
            Revised submission returned to Admin. No new Educator approval is
            required for this version.
          </p>
        </section>
      ) : null}

      {detail.canReview && submission ? (
        <AdminReviewForm
          portfolioOutputId={detail.portfolioId}
          submissionId={submission.submissionId}
          teamId={detail.teamId}
          portfolioType={detail.portfolioType}
          sequenceOrder={detail.sequenceOrder}
        />
      ) : (
        <section className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {detail.workflowStatus === "pending_admin"
            ? detail.adminReviewEntryPath === "invalid"
              ? "This portfolio cannot be reviewed because neither Educator approval nor a valid Admin-routed resubmission path was found."
              : submission
                ? "This portfolio cannot be reviewed right now."
                : "This portfolio is missing a submission and cannot be reviewed yet."
            : detail.workflowStatus === "revision_required"
              ? `Revision requested. Return route: ${detail.revisionReturnTo ?? "admin"}. Waiting for student resubmission (Package D4).`
              : "This portfolio is no longer awaiting Admin review."}
        </section>
      )}

      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-base font-semibold text-zinc-900">
          Submission history
        </h2>
        <div className="mt-4">
          <SubmissionVersionHistory
            versions={detail.submissionHistory}
            latestSubmissionId={submission?.submissionId ?? null}
          />
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-base font-semibold text-zinc-900">Review history</h2>
        <div className="mt-4">
          <PortfolioReviewHistory history={detail.reviewHistory} />
        </div>
      </section>
    </div>
  );
}
