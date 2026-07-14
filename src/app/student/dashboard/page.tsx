import Link from "next/link";
import {
  StudentDashboardOwnPortfolioSummary,
  TeamPortfolioProgressList,
} from "@/components/student/Stage3PortfolioPanels";
import { EmptyState, QueryErrorState } from "@/components/status";
import { getStudentDashboardData } from "@/lib/data/student/dashboard";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function StudentDashboardPage() {
  const { data, error } = await getStudentDashboardData();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-zinc-900">Student Dashboard</h1>
      <p className="mt-1 text-sm text-zinc-500">
        View your current stage, assigned team, and portfolio submission status.
      </p>

      <div className="mt-6 space-y-6">
        {error ? <QueryErrorState message={error} /> : null}

        {!error && data ? (
          <>
            <section className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-zinc-200 bg-white p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                  Team
                </p>
                <p className="mt-1 text-sm text-zinc-900">{data.teamName}</p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                  Program
                </p>
                <p className="mt-1 text-sm text-zinc-900">
                  {data.programName ?? "—"}
                </p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                  Current stage
                </p>
                <p className="mt-1 text-sm text-zinc-900">
                  Stage {data.currentStageNumber}
                </p>
              </div>
            </section>

            {data.currentStageNumber === 3 && data.ownPortfolioOutput ? (
              <StudentDashboardOwnPortfolioSummary
                portfolio={data.ownPortfolioOutput}
              />
            ) : null}

            {data.currentStageNumber === 3 ? (
              <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-base font-semibold text-zinc-900">
                    Team portfolio sequence
                  </h2>
                  <Link
                    href="/student/portfolio"
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                  >
                    View portfolio page
                  </Link>
                </div>
                {data.teamPortfolioProgress.length === 0 ? (
                  <EmptyState
                    title="No portfolio outputs"
                    description="Stage 3 portfolio outputs are not available yet."
                  />
                ) : (
                  <TeamPortfolioProgressList
                    portfolios={data.teamPortfolioProgress}
                    currentStudentId={data.currentStudentId}
                    activeTeamPortfolioId={data.activeTeamPortfolio?.id ?? null}
                  />
                )}
              </section>
            ) : (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Portfolio production begins when your team reaches Stage 3.
              </p>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
