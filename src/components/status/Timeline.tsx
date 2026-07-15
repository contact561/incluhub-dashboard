import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type TimelineItem = {
  id: string;
  title: string;
  timestamp?: string | null;
  description?: ReactNode;
  meta?: ReactNode;
};

type TimelineProps = {
  items: TimelineItem[];
  /** Optional intro shown above the list. */
  description?: string;
  title?: string;
  className?: string;
  emptyMessage?: string;
};

/**
 * Shared chronological presentation. Preserves caller order; does not invent events.
 */
export function Timeline({
  items,
  title = "History",
  description,
  className,
  emptyMessage = "No history yet.",
}: TimelineProps) {
  if (items.length === 0) {
    return (
      <section
        className={cn(
          "rounded-[var(--radius-card)] border border-border-default bg-surface-card p-4",
          className
        )}
      >
        {title ? (
          <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        ) : null}
        <p className="mt-1 text-sm text-text-muted">{emptyMessage}</p>
      </section>
    );
  }

  return (
    <section
      className={cn(
        "rounded-[var(--radius-card)] border border-border-default bg-surface-card p-4",
        className
      )}
    >
      {title ? (
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      ) : null}
      {description ? (
        <p className="mt-1 text-xs text-text-muted">{description}</p>
      ) : null}

      <ol className="mt-4 space-y-0">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={item.id} className="relative flex gap-3">
              <div className="flex w-4 shrink-0 flex-col items-center pt-1.5">
                <span
                  aria-hidden
                  className="size-2.5 rounded-full bg-brand-primary"
                />
                {!isLast ? (
                  <span
                    aria-hidden
                    className="mt-1 w-px flex-1 min-h-6 bg-border-default"
                  />
                ) : null}
              </div>

              <div className={cn("min-w-0 flex-1", !isLast && "pb-5")}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-text-primary">
                    {item.title}
                  </p>
                  {item.timestamp ? (
                    <p className="text-xs text-text-subtle">{item.timestamp}</p>
                  ) : null}
                </div>
                {item.description ? (
                  <div className="mt-2 text-sm text-text-muted">
                    {item.description}
                  </div>
                ) : null}
                {item.meta ? <div className="mt-3">{item.meta}</div> : null}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
