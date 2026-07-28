import Link from "next/link";
import { AdminApprovalCard } from "@/components/admin/portfolio-approvals/AdminApprovalCard";
import { DashboardMetricCard } from "@/components/layout/DashboardMetricCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { EmptyState, QueryErrorState, StatusPanel } from "@/components/status";
import { getAdminPortfolioApprovalDashboard } from "@/lib/data/admin/portfolio-approvals";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function AdminDashboardPage() {
  const { data, error } = await getAdminPortfolioApprovalDashboard();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Operational overview — pending portfolio work, stage progress, and studio bookings."
      />

      {error ? (
        <QueryErrorState title="Could not load dashboard" message={error} />
      ) : null}

      {!error && data ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <DashboardMetricCard
              label="Pending approvals"
              value={data.pendingCount}
              href="/admin/portfolio-approvals"
              statusIntent={data.pendingCount > 0 ? "warning" : "neutral"}
              compact
            />
            <DashboardMetricCard
              label="Stage board"
              value="Teams"
              description="Track team placement across stages."
              href="/admin/stages"
              compact
            />
            <DashboardMetricCard
              label="Studio schedule"
              value="Bookings"
              description="Confirmed studio slots."
              href="/admin/studio-schedule"
              compact
            />
            <DashboardMetricCard
              label="Teams"
              value="Directory"
              description="Balanced team records."
              href="/admin/teams"
              compact
            />
          </section>

          {data.pendingCount > 0 ? (
            <StatusPanel
              variant="warning"
              title={`${data.pendingCount} portfolio${data.pendingCount === 1 ? "" : "s"} awaiting Admin approval`}
              description="Student submissions need your Admin decision."
              action={
                <Link
                  href="/admin/portfolio-approvals"
                  className={cn(buttonVariants({ size: "sm" }))}
                >
                  Open portfolio approvals
                </Link>
              }
            />
          ) : (
            <StatusPanel
              variant="information"
              title="No portfolios awaiting approval"
              description="Student submissions will appear here after upload."
              action={
                <Link
                  href="/admin/portfolio-approvals"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" })
                  )}
                >
                  View approval queue
                </Link>
              }
            />
          )}

          <section>
            <SectionHeader
              title="Latest pending approvals"
              description="Most recent portfolios awaiting your decision."
              count={data.pendingPreviews.length}
              action={
                <Link
                  href="/admin/portfolio-approvals"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" })
                  )}
                >
                  View all
                </Link>
              }
            />
            {data.pendingPreviews.length === 0 ? (
              <EmptyState
                title="Queue is clear"
                description="There are no portfolio previews to show right now."
              />
            ) : (
              <div className="space-y-3">
                {data.pendingPreviews.map((item) => (
                  <AdminApprovalCard key={item.portfolioId} item={item} />
                ))}
              </div>
            )}
          </section>

          <section className="flex flex-wrap gap-2">
            <Link
              href="/admin/stages"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Stage board
            </Link>
            <Link
              href="/admin/studio-schedule"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Studio schedule
            </Link>
            <Link
              href="/admin/teams"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Teams
            </Link>
          </section>
        </>
      ) : null}
    </div>
  );
}
