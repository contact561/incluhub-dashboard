import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ActionPanelProps = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  /** When true (default), sticks below the shell header on large screens. */
  sticky?: boolean;
};

/**
 * Single review-action region. Sticky on desktop; normal document flow on mobile
 * so validation errors stay visible.
 */
export function ActionPanel({
  title,
  description,
  children,
  className,
  sticky = true,
}: ActionPanelProps) {
  return (
    <aside
      className={cn(
        "rounded-[var(--radius-card)] border border-border-default bg-surface-card p-4 sm:p-5",
        sticky && "lg:sticky lg:top-4 lg:z-10",
        className
      )}
    >
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-text-primary">{title}</h2>
        {description ? (
          <p className="text-sm text-text-muted">{description}</p>
        ) : null}
      </div>
      <div className="mt-4">{children}</div>
    </aside>
  );
}
