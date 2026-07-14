import Link from "next/link";
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
    <article className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1">
        <h2 className="truncate text-base font-semibold text-zinc-900">
          {item.title}
        </h2>
        <p className="text-sm text-zinc-600">
          {STUDENT_CATEGORY_LABELS[item.portfolioType]} · {item.teamName}
        </p>
        <p className="text-sm text-zinc-500">
          Leader: {item.leaderName} · Version {item.versionNumber} ·{" "}
          {formatSubmittedAt(item.submittedAt)}
        </p>
        <p
          className={cn(
            "text-sm",
            entryPathIsInvalid ? "text-amber-700" : "text-zinc-500"
          )}
        >
          {renderEntryPathLabel(item)}
        </p>
      </div>
      <Link
        href={`/admin/portfolio-approvals/${item.portfolioId}`}
        className={cn(buttonVariants({ size: "sm" }), "shrink-0")}
      >
        Open Review
      </Link>
    </article>
  );
}
