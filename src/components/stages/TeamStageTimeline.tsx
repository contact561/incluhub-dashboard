import { STUDENT_CATEGORY_LABELS } from "@/lib/constants/labels";
import { getPortfolioWorkflowPresentation } from "@/lib/portfolio/workflow-status";
import { StatusBadge } from "@/components/status/StatusBadge";
import type {
  TeamPortfolioSummary,
  TeamStageTimelineEntry,
} from "@/types/stage-management";

type TeamStageTimelineProps = {
  timeline: TeamStageTimelineEntry[];
  portfolios: TeamPortfolioSummary[];
};

function formatTimestamp(value: string | null): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(
    new Date(value)
  );
}

export function TeamStageTimeline({
  timeline,
  portfolios,
}: TeamStageTimelineProps) {
  return (
    <section className="rounded-[var(--radius-card)] border border-border-default bg-surface-card p-4">
      <h2 className="text-sm font-semibold text-text-primary">Stage timeline</h2>
      <p className="mt-1 text-xs text-text-muted">
        Shared team progression from onboarding through ecosystem unlock.
      </p>

      <ol className="mt-4 space-y-4">
        {timeline.map((stage) => (
          <li
            key={stage.stageNumber}
            className="rounded-[var(--radius-card)] border border-border-default bg-surface-muted/60 p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-text-subtle">
                  Stage {stage.stageNumber}
                </p>
                <h3 className="text-sm font-semibold text-text-primary">
                  {stage.stageName}
                </h3>
              </div>
              <StatusBadge status={stage.status} />
            </div>

            {stage.description ? (
              <p className="mt-2 text-xs text-text-muted">{stage.description}</p>
            ) : null}

            <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
              <div>
                <dt className="text-text-subtle">Started</dt>
                <dd className="text-text-primary">
                  {formatTimestamp(stage.startedAt)}
                </dd>
              </div>
              <div>
                <dt className="text-text-subtle">Completed</dt>
                <dd className="text-text-primary">
                  {formatTimestamp(stage.completedAt)}
                </dd>
              </div>
            </dl>

            {stage.status === "locked" && stage.lockedReason ? (
              <p className="mt-2 text-xs text-text-muted">{stage.lockedReason}</p>
            ) : null}

            {stage.stageNumber === 2 && stage.bmsSessionDate ? (
              <div className="mt-3 rounded-md border border-border-default bg-surface-card p-3 text-xs">
                <p className="font-medium text-text-primary">BMS session</p>
                <p className="mt-1 text-text-muted">
                  Date: {formatDate(stage.bmsSessionDate)}
                </p>
                {stage.bmsRemarks ? (
                  <p className="mt-1 text-text-muted">
                    Remarks: {stage.bmsRemarks}
                  </p>
                ) : null}
              </div>
            ) : null}

            {stage.stageNumber === 3 && portfolios.length > 0 ? (
              <div className="mt-3 rounded-md border border-border-default bg-surface-card p-3">
                <p className="text-xs font-medium text-text-primary">
                  Portfolio sequence
                </p>
                <ol className="mt-2 space-y-3">
                  {portfolios.map((portfolio) => (
                    <li key={portfolio.id} className="space-y-1 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-text-primary">
                          {portfolio.sequenceOrder}.{" "}
                          {STUDENT_CATEGORY_LABELS[portfolio.portfolioType]} —{" "}
                          {portfolio.leaderName}
                        </span>
                        <StatusBadge
                          status={portfolio.workflowStatus}
                          className="shrink-0"
                        />
                      </div>
                      {portfolio.submissionTitle && portfolio.submissionUrl ? (
                        <div className="rounded border border-border-default bg-surface-muted px-2 py-1.5 text-text-muted">
                          <p>
                            Submitted:{" "}
                            <span className="font-medium text-text-primary">
                              {portfolio.submissionTitle}
                            </span>
                          </p>
                          <a
                            href={portfolio.submissionUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-0.5 inline-block break-all underline underline-offset-2"
                          >
                            {portfolio.submissionUrl}
                          </a>
                        </div>
                      ) : null}
                      <p className="text-text-muted">
                        {
                          getPortfolioWorkflowPresentation(
                            portfolio.workflowStatus,
                            portfolio.portfolioType,
                            { sequenceOrder: portfolio.sequenceOrder }
                          ).title
                        }
                      </p>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
