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
        description="Approve student portfolios or request a revision. Educator approval is not required."
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
          description="Student portfolio submissions will appear here for Admin review."
        />
      ) : null}

      {!error && items.length > 0 ? (
        <AdminApprovalQueue items={items} />
      ) : null}
    </div>
  );
}
