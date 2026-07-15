import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: string;
  description: string;
  icon?: ReactNode;
  /** Primary call-to-action (button, link, or custom node). */
  action?: ReactNode;
  /** Optional secondary action when genuinely needed. */
  secondaryAction?: ReactNode;
  compact?: boolean;
  className?: string;
};

/**
 * Contextual empty-data presentation.
 * Callers supply title/description — this component does not force “No data”.
 */
export function EmptyState({
  title,
  description,
  icon,
  action,
  secondaryAction,
  compact = false,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-border-default bg-surface-muted text-center",
        compact ? "px-4 py-6" : "px-6 py-12",
        className
      )}
    >
      {icon ? (
        <div className="mb-3 text-text-muted [&_svg]:size-8" aria-hidden>
          {icon}
        </div>
      ) : null}

      <p className="text-sm font-medium text-text-primary">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-text-muted">{description}</p>

      {action || secondaryAction ? (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {action}
          {secondaryAction}
        </div>
      ) : null}
    </div>
  );
}
