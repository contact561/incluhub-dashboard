import Link from "next/link";
import {
  StudentDashboardOwnPortfolioSummary,
  TeamPortfolioProgressList,
} from "@/components/student/Stage3PortfolioPanels";
import { DashboardMetricCard } from "@/components/layout/DashboardMetricCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionHeader } from "@/components/layout/SectionHeader";
import {
  EmptyState,
  QueryErrorState,
  StatusPanel,
} from "@/components/status";
import { buttonVariants } from "@/components/ui/button";
import { getStudentDashboardData } from "@/lib/data/student/dashboard";
import { cn } from "@/lib/utils";

export default async function StudentDashboardPage() {
  const { data, error } = await getStudentDashboardData();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Your current stage, team context, and the next portfolio action."
      />

      {error ? <QueryErrorState message={error} /> : null}

      {!error && data ? (
        <>
          <section className="grid gap-3 sm:grid-cols-3">
            <DashboardMetricCard label="Team" value={data.teamName} compact />
            <DashboardMetricCard
              label="Program"
              value={data.programName ?? "—"}
              compact
            />
            <DashboardMetricCard
              label="Current stage"
              value={`Stage ${data.currentStageNumber}`}
              compact
              href="/student/my-stage"
            />
          </section>

          {data.currentStageNumber === 3 && data.ownPortfolioOutput ? (
            <StudentDashboardOwnPortfolioSummary
              portfolio={data.ownPortfolioOutput}
            />
          ) : null}

          {data.currentStageNumber === 3 ? (
            <section>
              <SectionHeader
                title="Team portfolio sequence"
                description="Shared Stage 3 order across your team."
                action={
                  <Link
                    href="/student/portfolio"
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" })
                    )}
                  >
                    Portfolio workspace
                  </Link>
                }
              />
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
          ) : data.currentStageNumber > 3 ? (
            <StatusPanel
              variant="success"
              title="Stage 3 portfolio period complete"
              description="Your team has progressed past Stage 3. Open My Stage for the current journey, or Portfolio for retained Stage 3 history when available."
              action={
                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/student/my-stage"
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" })
                    )}
                  >
                    View stage journey
                  </Link>
                  <Link
                    href="/student/portfolio"
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" })
                    )}
                  >
                    View portfolio
                  </Link>
                </div>
              }
            />
          ) : (
            <StatusPanel
              variant="information"
              title="Portfolio production not started"
              description="Portfolio studio booking and submission begin when your team reaches Stage 3."
              action={
                <Link
                  href="/student/my-stage"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" })
                  )}
                >
                  View stage journey
                </Link>
              }
            />
          )}

          <section className="flex flex-wrap gap-2">
            <Link
              href="/student/my-team"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              My Team
            </Link>
            <Link
              href="/student/my-stage"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              My Stage
            </Link>
          </section>
        </>
      ) : null}
    </div>
  );
}
