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

export function ReviewHistory({ history }: ReviewHistoryProps) {
  if (history.length === 0) {
    return (
      <p className="text-sm text-zinc-500">No review history yet.</p>
    );
  }

  return (
    <ol className="space-y-3">
      {history.map((item) => (
        <li
          key={item.id}
          className="rounded-lg border border-zinc-200 bg-zinc-50/70 px-4 py-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-zinc-900">
              {formatEnumLabel(item.reviewerStage)} ·{" "}
              {formatEnumLabel(item.decision)}
            </p>
            <p className="text-xs text-zinc-500">
              v{item.versionNumber} · {formatCreatedAt(item.createdAt)}
            </p>
          </div>
          {item.comments ? (
            <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">
              {item.comments}
            </p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
