import { Timeline, type TimelineItem } from "@/components/status";
import { formatEnumLabel } from "@/lib/constants/labels";
import type { AdminPortfolioReviewHistoryItem } from "@/types/admin-portfolio-approval";

type PortfolioReviewHistoryProps = {
  history: AdminPortfolioReviewHistoryItem[];
};

function formatCreatedAt(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function PortfolioReviewHistory({ history }: PortfolioReviewHistoryProps) {
  const items: TimelineItem[] = history.map((item) => ({
    id: item.id,
    title: `${formatEnumLabel(item.reviewerStage)} · ${item.reviewerName} · ${formatEnumLabel(item.decision)}`,
    timestamp: `v${item.versionNumber} · ${formatCreatedAt(item.createdAt)}`,
    description: item.comments ? (
      <p className="whitespace-pre-wrap">{item.comments}</p>
    ) : null,
  }));

  return (
    <Timeline
      title="Review history"
      items={items}
      emptyMessage="No review history yet."
    />
  );
}
