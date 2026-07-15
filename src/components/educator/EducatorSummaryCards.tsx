import { DashboardMetricCard } from "@/components/layout/DashboardMetricCard";
import type { EducatorDashboardSummary } from "@/types/educator-portfolio";

type EducatorSummaryCardsProps = {
  summary: EducatorDashboardSummary;
};

export function EducatorSummaryCards({ summary }: EducatorSummaryCardsProps) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <DashboardMetricCard
        label="Assigned teams"
        value={summary.assignedTeamsCount}
        href="/educator/my-teams"
        compact
      />
      <DashboardMetricCard
        label="Assigned students"
        value={summary.assignedStudentsCount}
        href="/educator/my-students"
        compact
      />
      <DashboardMetricCard
        label="Awaiting review"
        value={summary.awaitingReviewCount}
        href="/educator/portfolio-reviews"
        statusIntent={
          summary.awaitingReviewCount > 0 ? "warning" : "neutral"
        }
        compact
      />
      <DashboardMetricCard
        label="Reviews completed"
        value={summary.reviewsCompletedCount}
        compact
      />
    </section>
  );
}
