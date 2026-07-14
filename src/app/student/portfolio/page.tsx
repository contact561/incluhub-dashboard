import {
  StudentOwnPortfolioPanel,
  TeamPortfolioProgressList,
} from "@/components/student/Stage3PortfolioPanels";
import { PortfolioCard } from "@/components/studio/PortfolioCard";
import { EmptyState, QueryErrorState } from "@/components/status";
import { RecordPageHeader } from "@/components/tables/RecordPageHeader";
import { getStudentPortfolioPageData } from "@/lib/data/student/portfolio";

export default async function StudentPortfolioPage() {
  const { data, error } = await getStudentPortfolioPageData();

  return (
    <div className="flex min-h-full flex-col">
      <RecordPageHeader
        title="Portfolio"
        description="View your team's Stage 3 portfolio sequence and studio booking status."
      />
      <div className="space-y-6 p-6">
        {error ? <QueryErrorState message={error} /> : null}

        {!error && !data ? (
          <EmptyState
            title="No portfolio data"
            description="You need an active team in Stage 3 to view portfolio outputs."
          />
        ) : null}

        {data ? (
          <>
            <section className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                  Team
                </p>
                <p className="mt-1 text-sm text-zinc-900">{data.teamName}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                  Program
                </p>
                <p className="mt-1 text-sm text-zinc-900">
                  {data.programName ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                  Current stage
                </p>
                <p className="mt-1 text-sm text-zinc-900">
                  {data.currentStageNumber === 3
                    ? "Stage 3"
                    : `Stage ${data.currentStageNumber}`}
                </p>
              </div>
            </section>

            {data.currentStageNumber !== 3 ? (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Studio booking is available when your team reaches Stage 3.
              </p>
            ) : (
              <>
                {data.ownPortfolioOutput ? (
                  <section className="space-y-3">
                    <h2 className="text-base font-semibold text-zinc-900">
                      Your portfolio
                    </h2>
                    <StudentOwnPortfolioPanel
                      portfolio={data.ownPortfolioOutput}
                      currentStudentId={data.currentStudentId}
                    />
                  </section>
                ) : null}

                <section className="space-y-3">
                  <h2 className="text-base font-semibold text-zinc-900">
                    Team portfolio sequence
                  </h2>
                  <TeamPortfolioProgressList
                    portfolios={data.teamPortfolioProgress}
                    currentStudentId={data.currentStudentId}
                    activeTeamPortfolioId={data.activeTeamPortfolio?.id ?? null}
                  />
                </section>

                <section className="space-y-4">
                  <h2 className="text-base font-semibold text-zinc-900">
                    Full portfolio details
                  </h2>
                  {data.portfolios.map((portfolio) => (
                    <PortfolioCard
                      key={portfolio.id}
                      portfolio={portfolio}
                      currentStudentId={data.currentStudentId}
                      emphasizeOwnPortfolio={
                        portfolio.leaderStudentId === data.currentStudentId
                      }
                    />
                  ))}
                </section>
              </>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
