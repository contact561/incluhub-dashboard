import { PortfolioReviewQueue } from "@/components/educator/PortfolioReviewQueue";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, QueryErrorState } from "@/components/status";
import { getEducatorReviewQueue } from "@/lib/data/educator/portfolio-reviews";

export default async function EducatorPortfolioReviewsPage() {
  const { items, error } = await getEducatorReviewQueue();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Portfolio Reviews"
        description="Portfolios awaiting your review for students mapped to you as the portfolio leader educator."
        metadata={
          error ? undefined : (
            <span>
              {items.length} {items.length === 1 ? "item" : "items"}
            </span>
          )
        }
      />

      {error ? (
        <QueryErrorState
          title="Could not load review queue"
          message={error}
        />
      ) : null}

      {!error && items.length === 0 ? (
        <EmptyState
          title="No pending portfolio reviews"
          description="When a mapped portfolio leader submits work, it will appear in this queue."
        />
      ) : null}

      {!error && items.length > 0 ? (
        <PortfolioReviewQueue items={items} />
      ) : null}
    </div>
  );
}
