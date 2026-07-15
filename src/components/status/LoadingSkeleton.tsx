import { cn } from "@/lib/utils";

type LoadingSkeletonVariant = "page" | "cards" | "table" | "list" | "form";

type LoadingSkeletonProps = {
  variant?: LoadingSkeletonVariant;
  /** Row count for table / list / form variants. */
  rows?: number;
  /** Card count for cards variant. */
  cards?: number;
  className?: string;
};

function Bone({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "rounded-md bg-surface-muted motion-safe:animate-pulse motion-reduce:animate-none",
        className
      )}
    />
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Bone className="h-7 w-48" />
        <Bone className="h-4 w-72 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Bone className="h-28 w-full" />
        <Bone className="h-28 w-full" />
        <Bone className="h-28 w-full sm:col-span-2 lg:col-span-1" />
      </div>
      <Bone className="h-48 w-full" />
    </div>
  );
}

function CardsSkeleton({ count }: { count: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="space-y-3 rounded-[var(--radius-card)] border border-border-default bg-surface-card p-4"
        >
          <Bone className="h-4 w-24" />
          <Bone className="h-8 w-16" />
          <Bone className="h-3 w-full" />
        </div>
      ))}
    </div>
  );
}

function TableSkeleton({ rows }: { rows: number }) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-border-default bg-surface-card">
      <div className="flex gap-3 border-b border-border-default bg-surface-muted/60 px-4 py-3">
        <Bone className="h-3 w-20" />
        <Bone className="h-3 w-28" />
        <Bone className="h-3 w-16" />
        <Bone className="ml-auto h-3 w-14" />
      </div>
      <div className="divide-y divide-border-default">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <Bone className="h-3 w-24" />
            <Bone className="h-3 w-32" />
            <Bone className="h-3 w-20" />
            <Bone className="ml-auto h-6 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ListSkeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-[var(--radius-card)] border border-border-default bg-surface-card p-4"
        >
          <Bone className="size-10 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Bone className="h-3 w-40 max-w-full" />
            <Bone className="h-3 w-56 max-w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function FormSkeleton({ rows }: { rows: number }) {
  return (
    <div className="max-w-lg space-y-4 rounded-[var(--radius-card)] border border-border-default bg-surface-card p-4">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="space-y-2">
          <Bone className="h-3 w-24" />
          <Bone className="h-9 w-full" />
        </div>
      ))}
      <Bone className="h-9 w-28" />
    </div>
  );
}

/**
 * Shared loading placeholder. Distinct from EmptyState — pulsed bones only,
 * no “no data” messaging.
 */
export function LoadingSkeleton({
  variant = "page",
  rows = 5,
  cards = 3,
  className,
}: LoadingSkeletonProps) {
  const safeRows = Math.max(1, Math.min(rows, 12));
  const safeCards = Math.max(1, Math.min(cards, 6));

  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading"
      className={cn("w-full", className)}
    >
      <span className="sr-only">Loading content…</span>
      {variant === "page" ? <PageSkeleton /> : null}
      {variant === "cards" ? <CardsSkeleton count={safeCards} /> : null}
      {variant === "table" ? <TableSkeleton rows={safeRows} /> : null}
      {variant === "list" ? <ListSkeleton rows={safeRows} /> : null}
      {variant === "form" ? <FormSkeleton rows={safeRows} /> : null}
    </div>
  );
}
