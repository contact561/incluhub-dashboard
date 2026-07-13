import { STUDENT_CATEGORY_LABELS } from "@/lib/constants/labels";
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
    <section className="rounded-lg border border-zinc-200 p-4">
      <h2 className="text-sm font-semibold text-zinc-900">Stage timeline</h2>
      <p className="mt-1 text-xs text-zinc-500">
        Shared team progression from onboarding through ecosystem unlock.
      </p>

      <ol className="mt-4 space-y-4">
        {timeline.map((stage) => (
          <li
            key={stage.stageNumber}
            className="rounded-lg border border-zinc-100 bg-zinc-50/60 p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                  Stage {stage.stageNumber}
                </p>
                <h3 className="text-sm font-semibold text-zinc-900">
                  {stage.stageName}
                </h3>
              </div>
              <StatusBadge status={stage.status} />
            </div>

            {stage.description ? (
              <p className="mt-2 text-xs text-zinc-500">{stage.description}</p>
            ) : null}

            <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
              <div>
                <dt className="text-zinc-400">Started</dt>
                <dd className="text-zinc-700">
                  {formatTimestamp(stage.startedAt)}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-400">Completed</dt>
                <dd className="text-zinc-700">
                  {formatTimestamp(stage.completedAt)}
                </dd>
              </div>
            </dl>

            {stage.status === "locked" && stage.lockedReason ? (
              <p className="mt-2 text-xs text-zinc-500">{stage.lockedReason}</p>
            ) : null}

            {stage.stageNumber === 2 && stage.bmsSessionDate ? (
              <div className="mt-3 rounded-md border border-zinc-200 bg-white p-3 text-xs">
                <p className="font-medium text-zinc-700">BMS session</p>
                <p className="mt-1 text-zinc-600">
                  Date: {formatDate(stage.bmsSessionDate)}
                </p>
                {stage.bmsRemarks ? (
                  <p className="mt-1 text-zinc-600">Remarks: {stage.bmsRemarks}</p>
                ) : null}
              </div>
            ) : null}

            {stage.stageNumber === 3 && portfolios.length > 0 ? (
              <div className="mt-3 rounded-md border border-zinc-200 bg-white p-3">
                <p className="text-xs font-medium text-zinc-700">
                  Portfolio sequence
                </p>
                <ol className="mt-2 space-y-2">
                  {portfolios.map((portfolio) => (
                    <li
                      key={portfolio.id}
                      className="flex flex-wrap items-center justify-between gap-2 text-xs"
                    >
                      <span className="text-zinc-700">
                        {portfolio.sequenceOrder}.{" "}
                        {STUDENT_CATEGORY_LABELS[portfolio.portfolioType]} —{" "}
                        {portfolio.leaderName}
                      </span>
                      <StatusBadge
                        status={portfolio.workflowStatus}
                        className="shrink-0"
                      />
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
