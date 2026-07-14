import Link from "next/link";
import { AdminApprovalCard } from "@/components/admin/portfolio-approvals/AdminApprovalCard";
import { EmptyState, QueryErrorState } from "@/components/status";
import { buttonVariants } from "@/components/ui/button";
import { getAdminPortfolioApprovalDashboard } from "@/lib/data/admin/portfolio-approvals";
import { cn } from "@/lib/utils";

export default async function AdminDashboardPage() {
  const { data, error } = await getAdminPortfolioApprovalDashboard();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-zinc-900">Admin Dashboard</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Overview of students, teams, stages, and pending approvals.
      </p>

      <div className="mt-6 space-y-6">
        {error ? <QueryErrorState message={error} /> : null}

        {!error && data ? (
          <>
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <article className="rounded-xl border border-zinc-200 bg-white p-5">
                <p className="text-sm font-medium text-zinc-500">
                  Pending Portfolio Approvals
                </p>
                <p className="mt-2 text-3xl font-semibold text-zinc-900">
                  {data.pendingCount}
                </p>
                <Link
                  href="/admin/portfolio-approvals"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "mt-4"
                  )}
                >
                  View queue
                </Link>
              </article>
            </section>

            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-zinc-900">
                  Latest Pending Approvals
                </h2>
                <Link
                  href="/admin/portfolio-approvals"
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                >
                  View all
                </Link>
              </div>

              {data.pendingPreviews.length === 0 ? (
                <EmptyState
                  title="No portfolios awaiting approval"
                  description="Educator-approved portfolios will appear here when they need Admin review."
                />
              ) : (
                <div className="space-y-3">
                  {data.pendingPreviews.map((item) => (
                    <AdminApprovalCard key={item.portfolioId} item={item} />
                  ))}
                </div>
              )}
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}
