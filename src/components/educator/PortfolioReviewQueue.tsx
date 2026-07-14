import Link from "next/link";
import { STUDENT_CATEGORY_LABELS } from "@/lib/constants/labels";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { EducatorReviewQueueItem } from "@/types/educator-portfolio";

type PortfolioReviewQueueProps = {
  items: EducatorReviewQueueItem[];
};

function formatSubmittedAt(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function PortfolioReviewQueue({ items }: PortfolioReviewQueueProps) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <article
          key={item.portfolioId}
          className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between"
        >
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
          </div>
          <Link
            href={`/educator/portfolio-reviews/${item.portfolioId}`}
            className={cn(buttonVariants({ size: "sm" }), "shrink-0")}
          >
            Open Review
          </Link>
        </article>
      ))}
    </div>
  );
}
