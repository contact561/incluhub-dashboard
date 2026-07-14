import { notFound } from "next/navigation";
import Link from "next/link";
import { PortfolioReviewDetailView } from "@/components/educator/PortfolioReviewDetail";
import { QueryErrorState } from "@/components/status";
import { RecordPageHeader } from "@/components/tables/RecordPageHeader";
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
    <div className="flex min-h-full flex-col">
      <RecordPageHeader
        title="Portfolio Review"
        description="Review the latest submission and record your educator decision."
        actions={
          <Link
            href="/educator/portfolio-reviews"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Back to queue
          </Link>
        }
      />
      <div className="space-y-4 p-6">
        {error ? <QueryErrorState message={error} /> : null}
        {!error && detail ? <PortfolioReviewDetailView detail={detail} /> : null}
      </div>
    </div>
  );
}
