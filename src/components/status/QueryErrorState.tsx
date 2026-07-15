"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type RetryConfig = {
  label?: string;
  onClick?: () => void;
  href?: string;
};

type QueryErrorStateProps = {
  /** Defaults to “Something went wrong” when omitted. */
  title?: string;
  /** Preferred body copy. */
  description?: string;
  /**
   * Backward-compatible alias for description.
   * Existing call sites pass `message={error}`.
   */
  message?: string;
  /**
   * Manual retry only — no automatic retries.
   * Accepts a React node or a simple button/link config.
   */
  retry?: ReactNode | RetryConfig;
  compact?: boolean;
  className?: string;
};

function isRetryConfig(value: ReactNode | RetryConfig): value is RetryConfig {
  return (
    typeof value === "object" &&
    value !== null &&
    !("$$typeof" in value) &&
    ("onClick" in value || "href" in value || "label" in value)
  );
}

function RetryControl({ retry }: { retry: ReactNode | RetryConfig }) {
  if (!isRetryConfig(retry)) {
    return <>{retry}</>;
  }

  const label = retry.label ?? "Try again";

  if (retry.href) {
    return (
      <Link
        href={retry.href}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
      >
        {label}
      </Link>
    );
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={retry.onClick}>
      {label}
    </Button>
  );
}

/**
 * Safe query/load failure presentation.
 * Does not expose technical database or Supabase details beyond the caller’s message.
 */
export function QueryErrorState({
  title,
  description,
  message,
  retry,
  compact = false,
  className,
}: QueryErrorStateProps) {
  const resolvedTitle = title?.trim() || "Something went wrong";
  const body = (description ?? message)?.trim() || undefined;

  return (
    <div
      role="alert"
      className={cn(
        "rounded-[var(--radius-card)] border border-status-danger/30 bg-status-danger-soft text-sm text-status-danger",
        compact ? "px-3 py-2" : "px-4 py-3",
        className
      )}
    >
      <p className="font-medium">{resolvedTitle}</p>
      {body ? <p className="mt-1 text-status-danger/90">{body}</p> : null}
      {retry ? (
        <div className="mt-3">
          <RetryControl retry={retry} />
        </div>
      ) : null}
    </div>
  );
}
