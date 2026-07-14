import type {
  PortfolioRevisionFeedback,
  PortfolioSubmissionView,
} from "@/types/portfolio-submission";
import type { PortfolioRevisionRoute } from "@/types/database";

type PortfolioRevisionFeedbackCardProps = {
  feedback: PortfolioRevisionFeedback | null;
  previousSubmission: PortfolioSubmissionView | null;
  revisionRoute: PortfolioRevisionRoute | null;
};

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function PortfolioRevisionFeedbackCard({
  feedback,
  previousSubmission,
  revisionRoute,
}: PortfolioRevisionFeedbackCardProps) {
  const requestedBy =
    (feedback?.reviewerStage ?? revisionRoute) === "admin"
      ? "Admin"
      : "Educator";

  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <h3 className="text-sm font-semibold text-amber-900">
        Revision requested by {requestedBy}
      </h3>

      <dl className="mt-3 space-y-3 text-sm">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-amber-700/70">
            Reviewer
          </dt>
          <dd className="mt-1 text-amber-950">
            {feedback?.reviewerName ?? requestedBy}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-amber-700/70">
            Revision comments
          </dt>
          <dd className="mt-1 whitespace-pre-wrap text-amber-950">
            {feedback?.comments?.trim()
              ? feedback.comments
              : "No revision comments were provided."}
          </dd>
        </div>
        {feedback ? (
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-amber-700/70">
              Requested on
            </dt>
            <dd className="mt-1 text-amber-950">
              {formatDateTime(feedback.reviewedAt)}
            </dd>
          </div>
        ) : null}
      </dl>

      {previousSubmission ? (
        <div className="mt-4 rounded-md border border-amber-200 bg-white p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            Submission under revision · Version {previousSubmission.versionNumber}
          </p>
          <dl className="mt-2 space-y-2 text-sm">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                Title
              </dt>
              <dd className="mt-0.5 text-zinc-900">
                {previousSubmission.title}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                Portfolio link
              </dt>
              <dd className="mt-0.5">
                <a
                  href={previousSubmission.portfolioUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-zinc-900 underline underline-offset-2"
                >
                  {previousSubmission.portfolioUrl}
                </a>
              </dd>
            </div>
            {previousSubmission.notes ? (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                  Notes
                </dt>
                <dd className="mt-0.5 whitespace-pre-wrap text-zinc-700">
                  {previousSubmission.notes}
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                Submitted on
              </dt>
              <dd className="mt-0.5 text-zinc-900">
                {formatDateTime(previousSubmission.submittedAt)}
              </dd>
            </div>
          </dl>
        </div>
      ) : null}
    </section>
  );
}
