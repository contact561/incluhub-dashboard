import { notFound } from "next/navigation";
import Link from "next/link";
import { AdminPortfolioReviewDetailView } from "@/components/admin/portfolio-approvals/AdminPortfolioReviewDetail";
import { PageHeader } from "@/components/layout/PageHeader";
import { QueryErrorState } from "@/components/status";
import { getAdminPortfolioApprovalDetail } from "@/lib/data/admin/portfolio-approvals";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AdminPortfolioApprovalDetailPageProps = {
  params: Promise<{ "portfolio-id": string }>;
};

export default async function AdminPortfolioApprovalDetailPage({
  params,
}: AdminPortfolioApprovalDetailPageProps) {
  const { "portfolio-id": portfolioId } = await params;

  if (!portfolioId) {
    notFound();
  }

  const { detail, notFound: isNotFound, error } =
    await getAdminPortfolioApprovalDetail(portfolioId);

  if (isNotFound) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Portfolio Approval"
        description="Review the latest submission, educator decision, and record the Admin outcome."
        secondaryActions={
          <Link
            href="/admin/portfolio-approvals"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Back to queue
          </Link>
        }
      />

      {error ? (
        <QueryErrorState title="Could not load approval" message={error} />
      ) : null}
      {!error && detail ? (
        <AdminPortfolioReviewDetailView detail={detail} />
      ) : null}
    </div>
  );
}
