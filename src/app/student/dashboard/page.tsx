import Link from "next/link";
import {
  StudentDashboardOwnPortfolioSummary,
  TeamPortfolioProgressList,
} from "@/components/student/Stage3PortfolioPanels";
import { ProgramStageGuide } from "@/components/shared/ProgramStageGuide";
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
import { formatCurrentStageLabel } from "@/lib/data/student/myStage";
import { getStudentEcosystemAccess } from "@/lib/data/student/ecosystem";
import { cn } from "@/lib/utils";
import { ProgramOverview } from "@/components/student/ProgramOverview";
import { WhatHappensNow } from "@/components/student/WhatHappensNow";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(
    new Date(`${value}T00:00:00+05:30`)
  );
}

export default async function StudentDashboardPage() {
  const [{ data, error }, ecosystemAccess] = await Promise.all([
    getStudentDashboardData(),
    getStudentEcosystemAccess(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Your current stage, team context, and the next portfolio action."
      />

      {error ? <QueryErrorState message={error} /> : null}

      {!error && data ? (
        <>
          <ProgramOverview currentStage={data.currentStageNumber} />
          <section className="grid gap-3 sm:grid-cols-3">
            <DashboardMetricCard label="Team" value={data.teamName} compact />
            <DashboardMetricCard
              label="Program"
              value={data.programName ?? "—"}
              compact
            />
            <DashboardMetricCard
              label="Current stage"
              value={formatCurrentStageLabel(data.currentStageNumber)}
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
          ) : data.currentStageNumber === 4 ? (
            <StatusPanel
              variant={data.brandWorks?.date ? "information" : "warning"}
              title={
                data.brandWorks?.date
                  ? "Brand Opportunity assigned"
                  : "Brand Opportunity assignment pending"
              }
              description={
                data.brandWorks?.date
                  ? `Your team's Brand Opportunity is scheduled for ${formatDate(data.brandWorks.date)}. Open it to review the private brief and proof requirements.`
                  : "A Brand Opportunity is being assigned to your team. No action is required yet."
              }
              action={
                <Link
                  href="/student/brand-opportunity"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" })
                  )}
                >
                  Open Brand Opportunity
                </Link>
              }
            />
          ) : (data.currentStageNumber ?? 0) >= 5 ? (
            ecosystemAccess.status === "granted" ? (
              <StatusPanel
                variant="success"
                title="Ecosystem access approved"
                description="IncluHub has approved your onboarding. You can now enter the ecosystem."
                action={
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href="/student/ecosystem"
                      className={cn(buttonVariants({ size: "sm" }))}
                    >
                      Enter the Ecosystem
                    </Link>
                    <Link
                      href="/student/my-stage"
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" })
                      )}
                    >
                      View stage journey
                    </Link>
                  </div>
                }
              />
            ) : (
              <StatusPanel
                variant="information"
                title="Stage 5 — under review"
                description="Your portfolio and sessions are under review. IncluHub Admin will notify you if and when you are selected into the ecosystem. Celebration and Enter Ecosystem appear only after Admin grants access."
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
            )
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

          <ProgramStageGuide currentStage={data.currentStageNumber} />

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
          <WhatHappensNow
            title={
              data.currentStageNumber === 3
                ? "Continue your active portfolio"
                : data.currentStageNumber === 4
                  ? "Review your Brand Opportunity status"
                  : data.currentStageNumber === 5
                    ? "Follow the final review"
                    : "Follow your stage journey"
            }
            description={
              data.currentStageNumber === 3
                ? "Open the portfolio workspace to share availability, book, check in, submit, or respond to review feedback."
                : "Your stage page explains who must act next and what will unlock the following stage."
            }
            actionLabel={
              data.currentStageNumber === 3
                ? "Open portfolio workspace"
                : "View my stage"
            }
            actionHref={
              data.currentStageNumber === 3
                ? "/student/portfolio"
                : "/student/my-stage"
            }
          />
        </>
      ) : null}
    </div>
  );
}
