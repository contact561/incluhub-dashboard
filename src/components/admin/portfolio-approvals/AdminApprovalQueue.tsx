import { AdminApprovalCard } from "@/components/admin/portfolio-approvals/AdminApprovalCard";
import type { AdminPortfolioApprovalQueueItem } from "@/types/admin-portfolio-approval";

type AdminApprovalQueueProps = {
  items: AdminPortfolioApprovalQueueItem[];
};

export function AdminApprovalQueue({ items }: AdminApprovalQueueProps) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <AdminApprovalCard key={item.portfolioId} item={item} />
      ))}
    </div>
  );
}
