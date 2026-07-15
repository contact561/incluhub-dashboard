import type { ReactNode } from "react";
import { PortfolioWorkflowBadge } from "@/components/status";
import { cn } from "@/lib/utils";

type ProfileSummaryProps = {
  title: string;
  subtitle?: string;
  /** Student display name */
  studentName?: string;
  /** Team display name */
  teamName?: string;
  /** Discipline / portfolio role label */
  disciplineLabel?: string;
  workflowStatus?: string;
  metadata?: ReactNode;
  className?: string;
};

/**
 * Compact Student / team / discipline header for review workspaces.
 */
export function ProfileSummary({
  title,
  subtitle,
  studentName,
  teamName,
  disciplineLabel,
  workflowStatus,
  metadata,
  className,
}: ProfileSummaryProps) {
  return (
    <section
      className={cn(
        "rounded-[var(--radius-card)] border border-border-default bg-surface-card p-4 sm:p-5",
        className
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
          {subtitle ? (
            <p className="text-sm text-text-muted">{subtitle}</p>
          ) : null}
        </div>
        {workflowStatus ? (
          <PortfolioWorkflowBadge status={workflowStatus} />
        ) : null}
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
        {studentName ? (
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-text-subtle">
              Student
            </dt>
            <dd className="mt-1 text-sm text-text-primary">{studentName}</dd>
          </div>
        ) : null}
        {teamName ? (
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-text-subtle">
              Team
            </dt>
            <dd className="mt-1 text-sm text-text-primary">{teamName}</dd>
          </div>
        ) : null}
        {disciplineLabel ? (
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-text-subtle">
              Discipline
            </dt>
            <dd className="mt-1 text-sm text-text-primary">{disciplineLabel}</dd>
          </div>
        ) : null}
      </dl>

      {metadata ? <div className="mt-4">{metadata}</div> : null}
    </section>
  );
}
