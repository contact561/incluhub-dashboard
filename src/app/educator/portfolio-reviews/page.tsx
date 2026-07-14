import { PortfolioReviewQueue } from "@/components/educator/PortfolioReviewQueue";
import { EmptyState, QueryErrorState } from "@/components/status";
import { RecordPageHeader } from "@/components/tables/RecordPageHeader";
import { getEducatorReviewQueue } from "@/lib/data/educator/portfolio-reviews";

export default async function EducatorPortfolioReviewsPage() {
  const { items, error } = await getEducatorReviewQueue();

  return (
    <div className="flex min-h-full flex-col">
      <RecordPageHeader
        title="Portfolio Reviews"
        description="Portfolios awaiting your review for students mapped to you as the portfolio leader educator."
        count={error ? undefined : items.length}
      />
      <div className="space-y-4 p-6">
        {error ? <QueryErrorState message={error} /> : null}

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
    </div>
  );
}
