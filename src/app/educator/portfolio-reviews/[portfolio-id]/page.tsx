import { notFound } from "next/navigation";
import Link from "next/link";
import { PortfolioReviewDetailView } from "@/components/educator/PortfolioReviewDetail";
import { PageHeader } from "@/components/layout/PageHeader";
import { QueryErrorState } from "@/components/status";
import { getEducatorReviewDetail } from "@/lib/data/educator/portfolio-reviews";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type EducatorPortfolioReviewDetailPageProps = {
  params: Promise<{ "portfolio-id": string }>;
};

export default async function EducatorPortfolioReviewDetailPage({
  params,
}: EducatorPortfolioReviewDetailPageProps) {
  const { "portfolio-id": portfolioId } = await params;

  if (!portfolioId) {
    notFound();
  }

  const { detail, notFound: isNotFound, error } =
    await getEducatorReviewDetail(portfolioId);

  if (isNotFound) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Portfolio Monitoring"
        description="View the latest moodboard and portfolio, then leave an advisory comment for the team and Admin."
        secondaryActions={
          <Link
            href="/educator/portfolio-reviews"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Back to queue
          </Link>
        }
      />

      {error ? (
        <QueryErrorState title="Could not load review" message={error} />
      ) : null}
      {!error && detail ? <PortfolioReviewDetailView detail={detail} /> : null}
    </div>
  );
}
