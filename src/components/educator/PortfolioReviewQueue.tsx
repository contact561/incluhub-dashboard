import { ReviewCard } from "@/components/educator/ReviewCard";
import type { EducatorReviewQueueItem } from "@/types/educator-portfolio";

type PortfolioReviewQueueProps = {
  items: EducatorReviewQueueItem[];
};

export function PortfolioReviewQueue({ items }: PortfolioReviewQueueProps) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <ReviewCard
          key={item.portfolioId}
          portfolioId={item.portfolioId}
          title={item.title}
          portfolioType={item.portfolioType}
          teamName={item.teamName}
          leaderName={item.leaderName}
          versionNumber={item.versionNumber}
          submittedAt={item.submittedAt}
          itemType={item.itemType}
        />
      ))}
    </div>
  );
}
