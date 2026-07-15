import Link from "next/link";
import { PortfolioWorkflowBadge } from "@/components/status";
import { STUDENT_CATEGORY_LABELS } from "@/lib/constants/labels";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AdminPortfolioApprovalQueueItem } from "@/types/admin-portfolio-approval";

type AdminApprovalCardProps = {
  item: AdminPortfolioApprovalQueueItem;
};

function formatSubmittedAt(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function renderEntryPathLabel(item: AdminPortfolioApprovalQueueItem): string {
  if (item.adminReviewEntryPath === "educator_approved") {
    return item.educatorName
      ? `Educator approved by ${item.educatorName}`
      : "Educator approved";
  }

  if (item.adminReviewEntryPath === "admin_revision_resubmission") {
    return "Revised submission returned to Admin";
  }

  return "Review path invalid — check submission and review history";
}

export function AdminApprovalCard({ item }: AdminApprovalCardProps) {
  const entryPathIsInvalid = item.adminReviewEntryPath === "invalid";

  return (
    <article className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-border-default bg-surface-card p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-base font-semibold text-text-primary">
            {item.title}
          </h3>
          <PortfolioWorkflowBadge status="pending_admin" />
        </div>
        <p className="text-sm text-text-muted">
          {STUDENT_CATEGORY_LABELS[item.portfolioType]} · {item.teamName}
        </p>
        <p className="text-sm text-text-subtle">
          Student: {item.leaderName} · Version {item.versionNumber} ·{" "}
          {formatSubmittedAt(item.submittedAt)}
        </p>
        <p
          className={cn(
            "text-sm",
            entryPathIsInvalid ? "text-status-warning" : "text-text-muted"
          )}
        >
          {renderEntryPathLabel(item)}
        </p>
      </div>
      <Link
        href={`/admin/portfolio-approvals/${item.portfolioId}`}
        className={cn(
          buttonVariants({ size: "sm" }),
          "shrink-0 self-start sm:self-center"
        )}
      >
        Open Review
      </Link>
    </article>
  );
}
