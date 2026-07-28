import { MoodboardReviewForm } from "@/components/admin/MoodboardReviewForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, QueryErrorState } from "@/components/status";
import { STUDENT_CATEGORY_LABELS } from "@/lib/constants/labels";
import { getAdminMoodboardQueue } from "@/lib/data/admin/moodboards";

export default async function AdminMoodboardsPage() {
  const { items, error } = await getAdminMoodboardQueue();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Moodboard Approvals"
        description="Approve each portfolio moodboard before its team studio booking opens."
        metadata={
          error ? undefined : (
            <span>
              {items.length} {items.length === 1 ? "pending item" : "pending items"}
            </span>
          )
        }
      />
      {error ? (
        <QueryErrorState title="Could not load moodboards" message={error} />
      ) : null}
      {!error && items.length === 0 ? (
        <EmptyState
          title="No moodboards awaiting review"
          description="New student moodboard submissions will appear here."
        />
      ) : null}
      <div className="grid gap-4 xl:grid-cols-2">
        {items.map((item) => (
          <article
            key={item.submissionId}
            className="rounded-[var(--radius-card)] border border-border-default bg-surface-card p-5"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
              {item.teamName} · {STUDENT_CATEGORY_LABELS[item.portfolioType]} ·
              Version {item.versionNumber}
            </p>
            <h2 className="mt-2 text-lg font-semibold text-text-primary">
              {item.title}
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              Portfolio leader: {item.leaderName}
            </p>
            <a
              href={item.moodboardUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 block break-all text-sm font-medium text-text-primary underline underline-offset-2"
            >
              Open moodboard
            </a>
            {item.notes ? (
              <p className="mt-3 whitespace-pre-wrap text-sm text-text-muted">
                {item.notes}
              </p>
            ) : null}
            <div className="mt-5 border-t border-border-default pt-4">
              <MoodboardReviewForm submissionId={item.submissionId} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
