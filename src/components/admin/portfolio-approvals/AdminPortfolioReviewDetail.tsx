import { ActionPanel } from "@/components/educator/ActionPanel";
import { ProfileSummary } from "@/components/educator/ProfileSummary";
import { AdminReviewForm } from "@/components/admin/portfolio-approvals/AdminReviewForm";
import { PortfolioReviewHistory } from "@/components/admin/portfolio-approvals/PortfolioReviewHistory";
import { SubmissionVersionHistory } from "@/components/admin/portfolio-approvals/SubmissionVersionHistory";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { StatusPanel } from "@/components/status";
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
  const disciplineLabel = STUDENT_CATEGORY_LABELS[detail.portfolioType];
  const educatorReview = detail.reviewHistory.find(
    (item) =>
      item.reviewerStage === "educator" &&
      item.decision === "approved" &&
      submission &&
      item.versionNumber === submission.versionNumber
  );

  return (
    <div className="space-y-6 lg:grid lg:grid-cols-[minmax(0,1fr)_min(22rem,100%)] lg:items-start lg:gap-6 lg:space-y-0">
      <div className="space-y-6">
        <ProfileSummary
          title={submission?.title ?? "Portfolio approval"}
          subtitle={`${disciplineLabel} · ${detail.teamName}`}
          studentName={detail.leaderName}
          teamName={detail.teamName}
          disciplineLabel={disciplineLabel}
          workflowStatus={detail.workflowStatus}
          metadata={
            <p className="text-sm text-text-muted">
              Team stage: Stage {detail.currentStageNumber ?? "—"} ·{" "}
              {detail.stageStatus.replaceAll("_", " ")}
            </p>
          }
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

        {detail.adminReviewEntryPath === "educator_approved" ? (
          <section className="rounded-[var(--radius-card)] border border-border-default bg-surface-card p-4 sm:p-5">
            <SectionHeader
              title="Educator review (current version)"
              as="h2"
              compact
            />
            {educatorReview ? (
              <div className="mt-2 rounded-[var(--radius-card)] border border-border-default bg-surface-muted/50 px-4 py-3">
                <p className="text-sm font-medium text-text-primary">
                  Approved by {educatorReview.reviewerName}
                </p>
                <p className="mt-1 text-xs text-text-subtle">
                  v{educatorReview.versionNumber} ·{" "}
                  {formatSubmittedAt(educatorReview.createdAt)}
                </p>
                {educatorReview.comments ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-text-muted">
                    {educatorReview.comments}
                  </p>
                ) : null}
              </div>
            ) : (
              <StatusPanel
                variant="warning"
                title="Educator approval record missing"
                description="Educator approval record is missing for the current version."
              />
            )}
          </section>
        ) : null}

        {detail.adminReviewEntryPath === "admin_revision_resubmission" &&
        detail.previousAdminRevision ? (
          <section className="rounded-[var(--radius-card)] border border-border-default bg-surface-card p-4 sm:p-5">
            <SectionHeader
              title="Previous Admin revision request"
              as="h2"
              compact
            />
            <div className="mt-2 rounded-[var(--radius-card)] border border-border-default bg-surface-muted/50 px-4 py-3">
              <p className="text-sm font-medium text-text-primary">
                Requested by {detail.previousAdminRevision.reviewerName}
              </p>
              <p className="mt-1 text-xs text-text-subtle">
                v{detail.previousAdminRevision.versionNumber} ·{" "}
                {formatSubmittedAt(detail.previousAdminRevision.createdAt)}
              </p>
              {detail.previousAdminRevision.comments ? (
                <p className="mt-2 whitespace-pre-wrap text-sm text-text-muted">
                  {detail.previousAdminRevision.comments}
                </p>
              ) : (
                <p className="mt-2 text-sm text-text-muted">
                  No revision comments were recorded.
                </p>
              )}
            </div>
            <p className="mt-3 text-sm text-text-muted">
              Revised submission returned to Admin. No new Educator approval is
              required for this version.
            </p>
          </section>
        ) : null}

        <SubmissionVersionHistory
          versions={detail.submissionHistory}
          latestSubmissionId={submission?.submissionId ?? null}
        />

        <PortfolioReviewHistory history={detail.reviewHistory} />
      </div>

      <div className="space-y-4">
        {detail.canReview && submission ? (
          <ActionPanel
            title="Admin decision"
            description="Approve to complete this portfolio and unlock the next step, or request a revision with clear feedback for the portfolio leader."
          >
            <AdminReviewForm
              portfolioOutputId={detail.portfolioId}
              submissionId={submission.submissionId}
              teamId={detail.teamId}
              portfolioType={detail.portfolioType}
              sequenceOrder={detail.sequenceOrder}
            />
          </ActionPanel>
        ) : (
          <StatusPanel
            variant="information"
            title={
              detail.workflowStatus === "pending_admin"
                ? "Review unavailable"
                : detail.workflowStatus === "revision_required"
                  ? "Revision requested"
                  : "Not awaiting Admin review"
            }
            description={
              detail.workflowStatus === "pending_admin"
                ? detail.adminReviewEntryPath === "invalid"
                  ? "This portfolio cannot be reviewed because neither Educator approval nor a valid Admin-routed resubmission path was found."
                  : submission
                    ? "This portfolio cannot be reviewed right now."
                    : "This portfolio is missing a submission and cannot be reviewed yet."
                : detail.workflowStatus === "revision_required"
                  ? `Revision requested. Return route: ${detail.revisionReturnTo ?? "admin"}. Waiting for student resubmission.`
                  : "This portfolio is no longer awaiting Admin review."
            }
          />
        )}
      </div>
    </div>
  );
}
