import Link from "next/link";
import { AdminApprovalQueue } from "@/components/admin/portfolio-approvals/AdminApprovalQueue";
import { EmptyState, QueryErrorState } from "@/components/status";
import { RecordPageHeader } from "@/components/tables/RecordPageHeader";
import { getAdminPortfolioApprovalQueue } from "@/lib/data/admin/portfolio-approvals";

export default async function AdminPortfolioApprovalsPage() {
  const { items, error } = await getAdminPortfolioApprovalQueue();

  return (
    <div className="flex min-h-full flex-col">
      <RecordPageHeader
        title="Portfolio Approvals"
        description="Review educator-approved portfolios awaiting Admin decision."
        count={error ? undefined : items.length}
      />
      <div className="space-y-4 p-6">
        {error ? <QueryErrorState message={error} /> : null}

        {!error && items.length === 0 ? (
          <EmptyState
            title="No pending portfolio approvals"
            description="When an educator approves a portfolio, it will appear here for Admin review."
          />
        ) : null}

        {!error && items.length > 0 ? <AdminApprovalQueue items={items} /> : null}
      </div>
    </div>
  );
}
