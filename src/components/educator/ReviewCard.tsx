import Link from "next/link";
import { PortfolioWorkflowBadge } from "@/components/status";
import { STUDENT_CATEGORY_LABELS } from "@/lib/constants/labels";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { StudentCategory } from "@/types/database";

export type ReviewCardProps = {
  portfolioId: string;
  title: string;
  portfolioType: StudentCategory;
  teamName: string;
  leaderName: string;
  versionNumber: number;
  submittedAt: string;
  itemType?: "moodboard" | "portfolio";
  /**
   * Queue items are pending educator review by eligibility.
   * Optional override only when a caller already has a workflow status.
   */
  workflowStatus?: string;
  className?: string;
};

function formatSubmittedAt(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

/**
 * Operational card for an educator review destination.
 * Presentation only — does not change queue eligibility.
 */
export function ReviewCard({
  portfolioId,
  title,
  portfolioType,
  teamName,
  leaderName,
  versionNumber,
  submittedAt,
  workflowStatus = "pending_admin",
  itemType = "portfolio",
  className,
}: ReviewCardProps) {
  return (
    <article
      className={cn(
        "flex flex-col gap-4 rounded-[var(--radius-card)] border border-border-default bg-surface-card p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5",
        className
      )}
    >
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-base font-semibold text-text-primary">
            {title}
          </h3>
          <PortfolioWorkflowBadge status={workflowStatus} />
        </div>
        <p className="text-sm text-text-muted">
          {STUDENT_CATEGORY_LABELS[portfolioType]} · {teamName}
        </p>
        <p className="text-sm text-text-subtle">
          {itemType === "moodboard" ? "Moodboard" : "Portfolio"} · Student:{" "}
          {leaderName} · Version {versionNumber} ·{" "}
          {formatSubmittedAt(submittedAt)}
        </p>
      </div>
      <Link
        href={`/educator/portfolio-reviews/${portfolioId}`}
        className={cn(buttonVariants({ size: "sm" }), "shrink-0 self-start sm:self-center")}
      >
        Open monitoring
      </Link>
    </article>
  );
}
