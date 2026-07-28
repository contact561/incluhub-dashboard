import type { StudentPortfolioCard } from "@/types/studio-booking";

export function EducatorCommentTimeline({
  comments,
}: {
  comments: StudentPortfolioCard["educatorComments"];
}) {
  if (comments.length === 0) return null;

  return (
    <section className="rounded-[var(--radius-card)] border border-border-default bg-surface-muted/40 p-4">
      <h3 className="text-sm font-semibold text-text-primary">
        Educator monitoring comments
      </h3>
      <div className="mt-3 space-y-3">
        {comments.map((comment) => (
          <article
            key={comment.id}
            className="border-l-2 border-brand-gold pl-3"
          >
            <p className="whitespace-pre-wrap text-sm text-text-primary">
              {comment.body}
            </p>
            <p className="mt-1 text-xs text-text-muted">
              {comment.authorName} ·{" "}
              {new Intl.DateTimeFormat("en-IN", {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(comment.createdAt))}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
