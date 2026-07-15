import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  description?: string;
  /** Optional contextual label above the title. */
  eyebrow?: string;
  /** Status chips, counts, or other metadata beside/under the title. */
  metadata?: ReactNode;
  primaryAction?: ReactNode;
  secondaryActions?: ReactNode;
  /**
   * Record-list chrome: bottom border + horizontal padding.
   * Used by RecordPageHeader for backward-compatible layout.
   */
  bordered?: boolean;
  className?: string;
};

/**
 * Universal page title block. Renders a single h1.
 */
export function PageHeader({
  title,
  description,
  eyebrow,
  metadata,
  primaryAction,
  secondaryActions,
  bordered = false,
  className,
}: PageHeaderProps) {
  const hasActions = Boolean(primaryAction || secondaryActions);

  return (
    <header
      className={cn(
        bordered && "border-b border-border-default px-4 py-5 md:px-6",
        className
      )}
    >
      <div
        className={cn(
          "flex flex-col gap-4",
          hasActions && "sm:flex-row sm:items-start sm:justify-between"
        )}
      >
        <div className="min-w-0 flex-1 space-y-1">
          {eyebrow ? (
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
              {eyebrow}
            </p>
          ) : null}

          <h1 className="text-page-title font-semibold text-text-primary">
            {title}
          </h1>

          {description ? (
            <p className="max-w-2xl text-sm text-text-muted">{description}</p>
          ) : null}

          {metadata ? (
            <div className="pt-1 text-xs font-medium text-text-subtle">
              {metadata}
            </div>
          ) : null}
        </div>

        {hasActions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {secondaryActions}
            {primaryAction}
          </div>
        ) : null}
      </div>
    </header>
  );
}
