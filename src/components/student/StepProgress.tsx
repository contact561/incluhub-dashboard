import type { ReactNode } from "react";
import {
  CheckCircle2Icon,
  CircleDotIcon,
  CircleIcon,
  LockIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type StepProgressState =
  | "complete"
  | "current"
  | "upcoming"
  | "locked";

export type StepProgressItem = {
  id: string;
  title: string;
  description?: string | null;
  state: StepProgressState;
  /** Supporting metadata (dates, badges, nested content). */
  detail?: ReactNode;
};

type StepProgressProps = {
  steps: StepProgressItem[];
  className?: string;
};

function StateIcon({ state }: { state: StepProgressState }) {
  const className = "size-4 shrink-0";
  switch (state) {
    case "complete":
      return (
        <CheckCircle2Icon
          aria-hidden
          className={cn(className, "text-status-success")}
        />
      );
    case "current":
      return (
        <CircleDotIcon
          aria-hidden
          className={cn(className, "text-brand-primary")}
        />
      );
    case "locked":
      return (
        <LockIcon aria-hidden className={cn(className, "text-text-muted")} />
      );
    case "upcoming":
    default:
      return (
        <CircleIcon aria-hidden className={cn(className, "text-text-subtle")} />
      );
  }
}

function stateLabel(state: StepProgressState): string {
  switch (state) {
    case "complete":
      return "Completed";
    case "current":
      return "Current";
    case "locked":
      return "Locked";
    case "upcoming":
      return "Upcoming";
  }
}

/**
 * Read-only progress steps. Does not calculate eligibility — callers map
 * existing stage/workflow values into step states.
 */
export function StepProgress({ steps, className }: StepProgressProps) {
  return (
    <ol className={cn("space-y-0", className)} aria-label="Progress">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;

        return (
          <li key={step.id} className="relative flex gap-3">
            <div className="flex w-6 shrink-0 flex-col items-center">
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full border bg-surface-card",
                  step.state === "complete" &&
                    "border-status-success/40 bg-status-success-soft",
                  step.state === "current" &&
                    "border-brand-primary bg-brand-primary-soft",
                  step.state === "locked" && "border-border-default",
                  step.state === "upcoming" && "border-border-default"
                )}
              >
                <StateIcon state={step.state} />
              </span>
              {!isLast ? (
                <span
                  aria-hidden
                  className="mt-1 w-px flex-1 min-h-4 bg-border-default"
                />
              ) : null}
            </div>

            <div
              className={cn(
                "min-w-0 flex-1 pb-6",
                isLast && "pb-0",
                step.state === "current" &&
                  "rounded-[var(--radius-card)] border border-border-default bg-surface-card p-3 sm:p-4"
              )}
            >
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <h3 className="text-sm font-semibold text-text-primary">
                  {step.title}
                </h3>
                <span className="text-xs font-medium text-text-subtle">
                  {stateLabel(step.state)}
                </span>
              </div>
              {step.description ? (
                <p className="mt-1 text-sm text-text-muted">{step.description}</p>
              ) : null}
              {step.detail ? <div className="mt-3">{step.detail}</div> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
