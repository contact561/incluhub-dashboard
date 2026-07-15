import { Timeline, type TimelineItem } from "@/components/status";
import { formatEnumLabel } from "@/lib/constants/labels";
import type { EducatorReviewHistoryItem } from "@/types/educator-portfolio";

type ReviewHistoryProps = {
  history: EducatorReviewHistoryItem[];
};

function formatCreatedAt(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

/**
 * Educator review history via shared Timeline.
 * Preserves loader order and fields; does not invent events.
 */
export function ReviewHistory({ history }: ReviewHistoryProps) {
  const items: TimelineItem[] = history.map((item) => ({
    id: item.id,
    title: `${formatEnumLabel(item.reviewerStage)} · ${formatEnumLabel(item.decision)}`,
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
