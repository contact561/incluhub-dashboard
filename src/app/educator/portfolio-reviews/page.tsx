import { PortfolioReviewQueue } from "@/components/educator/PortfolioReviewQueue";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, QueryErrorState } from "@/components/status";
import { getEducatorReviewQueue } from "@/lib/data/educator/portfolio-reviews";

export default async function EducatorPortfolioReviewsPage() {
  const { items, error } = await getEducatorReviewQueue();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Portfolio Monitoring"
        description="View assigned team moodboards and portfolios, then add non-blocking comments. Only Admin makes decisions."
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
          title="No workflow submissions yet"
          description="Moodboards and portfolios from assigned teams will appear here."
        />
      ) : null}

      {!error && items.length > 0 ? (
        <PortfolioReviewQueue items={items} />
      ) : null}
    </div>
  );
}
