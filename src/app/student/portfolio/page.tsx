import {
  StudentOwnPortfolioPanel,
  TeamPortfolioProgressList,
} from "@/components/student/Stage3PortfolioPanels";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionHeader } from "@/components/layout/SectionHeader";
import {
  EmptyState,
  QueryErrorState,
  StatusPanel,
} from "@/components/status";
import { PortfolioCard } from "@/components/studio/PortfolioCard";
import { getStudentPortfolioPageData } from "@/lib/data/student/portfolio";

export default async function StudentPortfolioPage() {
  const { data, error } = await getStudentPortfolioPageData();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Portfolio"
        description="Studio booking, submission, revision, and version history for Stage 3."
      />

      {error ? <QueryErrorState message={error} /> : null}

      {!error && !data ? (
        <EmptyState
          title="No portfolio data"
          description="You need an active team in Stage 3 to view portfolio outputs."
        />
      ) : null}

      {data ? (
        <>
          <section className="grid gap-4 rounded-[var(--radius-card)] border border-border-default bg-surface-card p-4 sm:grid-cols-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                Team
              </p>
              <p className="mt-1 text-sm font-medium text-text-primary">
                {data.teamName}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                Program
              </p>
              <p className="mt-1 text-sm text-text-primary">
                {data.programName ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                Current stage
              </p>
              <p className="mt-1 text-sm text-text-primary">
                {data.currentStageNumber === 3
                  ? "Stage 3"
                  : `Stage ${data.currentStageNumber}`}
              </p>
            </div>
          </section>

          {data.currentStageNumber !== 3 ? (
            <StatusPanel
              variant={data.currentStageNumber > 3 ? "success" : "information"}
              title={
                data.currentStageNumber > 3
                  ? "Stage 3 portfolio period complete"
                  : "Studio booking unavailable"
              }
              description={
                data.currentStageNumber > 3
                  ? "Your team has progressed past Stage 3. Active studio booking is no longer required on this page."
                  : "Studio booking and portfolio submission open when your team reaches Stage 3."
              }
            />
          ) : (
            <>
              {data.ownPortfolioOutput ? (
                <section className="space-y-3">
                  <SectionHeader
                    title="Your portfolio workspace"
                    description="Primary actions for your assigned portfolio output."
                  />
                  <StudentOwnPortfolioPanel
                    portfolio={data.ownPortfolioOutput}
                    currentStudentId={data.currentStudentId}
                    revisionFeedback={data.ownPortfolioRevisionFeedback}
                    submissionHistory={data.ownPortfolioSubmissionHistory}
                  />
                </section>
              ) : null}

              <section>
                <SectionHeader
                  title="Team portfolio sequence"
                  description="Shared order and status across the team."
                />
                <TeamPortfolioProgressList
                  portfolios={data.teamPortfolioProgress}
                  currentStudentId={data.currentStudentId}
                  activeTeamPortfolioId={data.activeTeamPortfolio?.id ?? null}
                />
              </section>

              {data.portfolios.some(
                (portfolio) => portfolio.id !== data.ownPortfolioOutput?.id
              ) ? (
                <section className="space-y-3">
                  <SectionHeader
                    title="Other team portfolios"
                    description="Read-only status for teammates' portfolio outputs."
                  />
                  {data.portfolios
                    .filter(
                      (portfolio) => portfolio.id !== data.ownPortfolioOutput?.id
                    )
                    .map((portfolio) => (
                      <PortfolioCard
                        key={portfolio.id}
                        portfolio={portfolio}
                        currentStudentId={data.currentStudentId}
                      />
                    ))}
                </section>
              ) : null}
            </>
          )}
        </>
      ) : null}
    </div>
  );
}
