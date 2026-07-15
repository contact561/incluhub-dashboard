import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

type SectionHeaderProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  /** Free-form metadata (chips, badges, etc.). */
  metadata?: ReactNode;
  /** Optional numeric count shown as supporting text. */
  count?: number;
  /** Heading level — never h1 (reserved for PageHeader). Default h2. */
  as?: "h2" | "h3";
  compact?: boolean;
  className?: string;
};

/**
 * In-page section title. Does not render an h1.
 */
export function SectionHeader({
  title,
  description,
  action,
  metadata,
  count,
  as = "h2",
  compact = false,
  className,
}: SectionHeaderProps) {
  const Heading = as as ElementType;

  return (
    <div
      className={cn(
        "flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4",
        compact ? "mb-2" : "mb-3",
        className
      )}
    >
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <Heading
            className={cn(
              "font-semibold text-text-primary",
              as === "h2" ? "text-base" : "text-sm"
            )}
          >
            {title}
          </Heading>
          {count !== undefined ? (
            <span className="text-xs font-medium text-text-subtle">
              {count} {count === 1 ? "item" : "items"}
            </span>
          ) : null}
          {metadata}
        </div>
        {description ? (
          <p className="max-w-2xl text-sm text-text-muted">{description}</p>
        ) : null}
      </div>

      {action ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>
      ) : null}
    </div>
  );
}
