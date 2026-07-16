import Link from "next/link";
import {
  StepProgress,
  type StepProgressItem,
  type StepProgressState,
} from "@/components/student/StepProgress";
import { PortfolioWorkflowBadge } from "@/components/status";
import { StatusBadge } from "@/components/status/StatusBadge";
import { STUDENT_CATEGORY_LABELS } from "@/lib/constants/labels";
import { getPortfolioWorkflowPresentation } from "@/lib/portfolio/workflow-status";
import type { StageStatus } from "@/types/database";
import type {
  TeamPortfolioSummary,
  TeamStageTimelineEntry,
} from "@/types/stage-management";

type StudentStageJourneyProps = {
  timeline: TeamStageTimelineEntry[];
  portfolios: TeamPortfolioSummary[];
  currentStageNumber: number | null;
};

function mapStageStatusToStep(status: StageStatus): StepProgressState {
  switch (status) {
    case "completed":
      return "complete";
    case "in_progress":
    case "pending_approval":
    case "revision_required":
    case "rejected":
      return "current";
    case "locked":
      return "locked";
    case "not_started":
    default:
      return "upcoming";
  }
}

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

/**
 * Student-only stage journey using existing timeline values.
 * Does not alter TeamStageTimeline used by Admin.
 */
export function StudentStageJourney({
  timeline,
  portfolios,
  currentStageNumber,
}: StudentStageJourneyProps) {
  const steps: StepProgressItem[] = timeline.map((stage) => {
    const state = mapStageStatusToStep(stage.status);
    const isCurrentStage =
      currentStageNumber !== null && stage.stageNumber === currentStageNumber;

    return {
      id: `stage-${stage.stageNumber}`,
      title: `Stage ${stage.stageNumber} — ${stage.stageName}`,
      description: stage.description,
      state: isCurrentStage && state === "upcoming" ? "current" : state,
      detail: (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={stage.status} />
          </div>

          <dl className="grid gap-2 text-xs sm:grid-cols-2">
            <div>
              <dt className="text-text-subtle">Started</dt>
              <dd className="text-text-muted">
                {formatTimestamp(stage.startedAt)}
              </dd>
            </div>
            <div>
              <dt className="text-text-subtle">Completed</dt>
              <dd className="text-text-muted">
                {formatTimestamp(stage.completedAt)}
              </dd>
            </div>
          </dl>

          {stage.status === "locked" && stage.lockedReason ? (
            <p className="text-sm text-text-muted">{stage.lockedReason}</p>
          ) : null}

          {stage.stageNumber === 2 && stage.bmsSessionDate ? (
            <div className="rounded-[var(--radius-control)] border border-border-default bg-surface-muted p-3 text-sm">
              <p className="font-medium text-text-primary">BMS session</p>
              <p className="mt-1 text-text-muted">
                Date: {formatDate(stage.bmsSessionDate)}
              </p>
              {stage.bmsRemarks ? (
                <p className="mt-1 text-text-muted">Remarks: {stage.bmsRemarks}</p>
              ) : null}
            </div>
          ) : null}

          {stage.stageNumber === 4 && stage.brandWorksDate ? (
            <div className="rounded-[var(--radius-control)] border border-border-default bg-surface-muted p-3 text-sm">
              <p className="font-medium text-text-primary">Brand Works</p>
              <p className="mt-1 text-text-muted">
                Scheduled date: {formatDate(stage.brandWorksDate)}
              </p>
              {stage.brandWorksRemarks ? (
                <p className="mt-1 whitespace-pre-wrap text-text-muted">
                  Remarks: {stage.brandWorksRemarks}
                </p>
              ) : null}
              {stage.brandWorksCompletedAt ? (
                <p className="mt-1 font-medium text-status-success">
                  Completed: {formatTimestamp(stage.brandWorksCompletedAt)}
                </p>
              ) : null}
            </div>
          ) : null}

          {stage.stageNumber === 3 && portfolios.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                Portfolio sequence
              </p>
              <ul className="space-y-2">
                {portfolios.map((portfolio) => (
                  <li
                    key={portfolio.id}
                    className="rounded-[var(--radius-control)] border border-border-default bg-surface-muted px-3 py-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm text-text-primary">
                        {portfolio.sequenceOrder}.{" "}
                        {STUDENT_CATEGORY_LABELS[portfolio.portfolioType]} —{" "}
                        {portfolio.leaderName}
                      </span>
                      <PortfolioWorkflowBadge status={portfolio.workflowStatus} />
                    </div>
                    <p className="mt-1 text-xs text-text-muted">
                      {
                        getPortfolioWorkflowPresentation(
                          portfolio.workflowStatus,
                          portfolio.portfolioType,
                          { sequenceOrder: portfolio.sequenceOrder }
                        ).title
                      }
                    </p>
                    {portfolio.submissionTitle && portfolio.submissionUrl ? (
                      <p className="mt-1 text-xs text-text-muted">
                        Submitted:{" "}
                        <a
                          href={portfolio.submissionUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="break-all font-medium text-text-primary underline underline-offset-2"
                        >
                          {portfolio.submissionTitle}
                        </a>
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
              {isCurrentStage ? (
                <Link
                  href="/student/portfolio"
                  className="inline-flex text-sm font-medium text-brand-primary underline-offset-2 hover:underline"
                >
                  Open portfolio workspace
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
      ),
    };
  });

  return (
    <section className="rounded-[var(--radius-card)] border border-border-default bg-surface-card p-4 sm:p-5">
      <h2 className="text-base font-semibold text-text-primary">
        Stage journey
      </h2>
      <p className="mt-1 text-sm text-text-muted">
        Shared team progression from onboarding through ecosystem unlock.
      </p>
      <div className="mt-4">
        <StepProgress steps={steps} />
      </div>
    </section>
  );
}
