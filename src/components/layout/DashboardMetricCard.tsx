import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  STATUS_INTENT_CLASSES,
  type StatusIntent,
} from "@/lib/status/status-intent";

type DashboardMetricCardProps = {
  label: string;
  value: ReactNode;
  description?: string;
  icon?: ReactNode;
  /** Optional trend or supporting line under the value. */
  supportingText?: string;
  /** When set, the whole card is a single focusable link. */
  href?: string;
  /**
   * Optional semantic accent (border tint). Defaults to neutral surface —
   * not brand burgundy.
   */
  statusIntent?: StatusIntent;
  loading?: boolean;
  compact?: boolean;
  className?: string;
};

function MetricBody({
  label,
  value,
  description,
  icon,
  supportingText,
  statusIntent = "neutral",
  loading,
  compact,
}: Omit<DashboardMetricCardProps, "href" | "className">) {
  const intentStyles = STATUS_INTENT_CLASSES[statusIntent];

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
          {label}
        </p>
        {icon ? (
          <span
            aria-hidden
            className={cn("shrink-0 [&_svg]:size-4", intentStyles.icon)}
          >
            {icon}
          </span>
        ) : null}
      </div>

      {loading ? (
        <div
          aria-hidden
          className={cn(
            "mt-2 rounded-md bg-surface-muted motion-safe:animate-pulse motion-reduce:animate-none",
            compact ? "h-7 w-16" : "h-9 w-20"
          )}
        />
      ) : (
        <p
          className={cn(
            "mt-2 font-semibold text-text-primary",
            compact ? "text-xl" : "text-2xl"
          )}
        >
          {value}
        </p>
      )}

      {supportingText ? (
        <p className="mt-1 text-xs text-text-subtle">{supportingText}</p>
      ) : null}

      {description ? (
        <p className="mt-2 text-sm text-text-muted">{description}</p>
      ) : null}
    </>
  );
}

/**
 * Dashboard summary metric tile.
 * Do not nest buttons inside when `href` is set — the card itself is the control.
 */
export function DashboardMetricCard({
  label,
  value,
  description,
  icon,
  supportingText,
  href,
  statusIntent = "neutral",
  loading = false,
  compact = false,
  className,
}: DashboardMetricCardProps) {
  const shellClass = cn(
    "block rounded-[var(--radius-card)] border border-border-default bg-surface-card text-left",
    compact ? "px-3 py-3" : "px-4 py-4",
    statusIntent !== "neutral" && "border-l-4",
    statusIntent === "success" && "border-l-status-success",
    statusIntent === "warning" && "border-l-status-warning",
    statusIntent === "danger" && "border-l-status-danger",
    statusIntent === "info" && "border-l-status-info",
    href &&
      "outline-none transition-colors hover:bg-surface-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-page",
    className
  );

  const body = (
    <MetricBody
      label={label}
      value={value}
      description={description}
      icon={icon}
      supportingText={supportingText}
      statusIntent={statusIntent}
      loading={loading}
      compact={compact}
    />
  );

  if (href) {
    return (
      <Link
        href={href}
        className={shellClass}
        aria-label={loading ? `${label}, loading` : `${label}: ${String(value)}`}
        aria-busy={loading || undefined}
      >
        {body}
      </Link>
    );
  }

  return (
    <article
      className={shellClass}
      aria-busy={loading || undefined}
      aria-label={loading ? `${label}, loading` : undefined}
    >
      {body}
    </article>
  );
}
