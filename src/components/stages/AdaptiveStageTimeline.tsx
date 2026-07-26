import type { RegistryStageView } from "@/lib/stages/registryProgress";

const TYPE_HINT: Record<string, string> = {
  team_formation: "Team placement",
  attendance_session: "Session attendance",
  submission: "Submission",
  studio_booking: "Studio booking",
  info_only: "Information",
};

const STATUS_LABEL: Record<RegistryStageView["progressStatus"], string> = {
  locked: "Locked",
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Completed",
};

const STATUS_CLASS: Record<RegistryStageView["progressStatus"], string> = {
  locked: "text-text-muted",
  not_started: "text-text-muted",
  in_progress: "text-amber-700 dark:text-amber-300",
  completed: "text-status-success",
};

export function AdaptiveStageTimeline({
  stages,
  emptyMessage,
}: {
  stages: RegistryStageView[];
  emptyMessage?: string;
}) {
  if (stages.length === 0) {
    return (
      <p className="text-sm text-text-muted">
        {emptyMessage ?? "Program stages will appear here once configured."}
      </p>
    );
  }

  return (
    <ol className="space-y-3">
      {stages.map((stage, index) => (
        <li
          key={stage.id}
          className="rounded-[var(--radius-card)] border border-border-default bg-surface-card px-4 py-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs uppercase tracking-wide text-text-subtle">
              Step {index + 1} ·{" "}
              {TYPE_HINT[stage.stage_type] ?? stage.stage_type}
            </p>
            <p
              className={`text-xs font-medium ${STATUS_CLASS[stage.progressStatus]}`}
            >
              {STATUS_LABEL[stage.progressStatus]}
            </p>
          </div>
          <p className="mt-1 font-medium text-text-primary">{stage.name}</p>
          <p className="mt-0.5 text-sm text-text-muted">
            {stage.progressStatus === "locked"
              ? "Unlocks when the previous program step is completed."
              : stage.progressStatus === "completed"
                ? "This step is complete for your team."
                : stage.progressStatus === "in_progress"
                  ? "This is your team’s current program step."
                  : "Waiting for Admin to place you on a team and start the journey."}
          </p>
        </li>
      ))}
    </ol>
  );
}
