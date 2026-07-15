import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/status";

export default function ExternalDashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="External Member Dashboard"
        description="View your assigned project and team details."
      />
      <EmptyState
        title="No project assigned yet"
        description="When you are assigned to a team project, details will appear here."
      />
    </div>
  );
}
