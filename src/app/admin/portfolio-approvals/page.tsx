import { AdminApprovalQueue } from "@/components/admin/portfolio-approvals/AdminApprovalQueue";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, QueryErrorState } from "@/components/status";
import { getAdminPortfolioApprovalQueue } from "@/lib/data/admin/portfolio-approvals";

export default async function AdminPortfolioApprovalsPage() {
  const { items, error } = await getAdminPortfolioApprovalQueue();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Portfolio Approvals"
        description="Review educator-approved portfolios awaiting Admin decision."
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
          title="Could not load approval queue"
          message={error}
        />
      ) : null}

      {!error && items.length === 0 ? (
        <EmptyState
          title="No pending portfolio approvals"
          description="When an educator approves a portfolio, it will appear here for Admin review."
        />
      ) : null}

      {!error && items.length > 0 ? (
        <AdminApprovalQueue items={items} />
      ) : null}
    </div>
  );
}
