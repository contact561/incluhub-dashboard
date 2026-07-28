import Link from "next/link";
import { ProgramStageGuide } from "@/components/shared/ProgramStageGuide";
import { EducatorSummaryCards } from "@/components/educator/EducatorSummaryCards";
import { ReviewCard } from "@/components/educator/ReviewCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { EmptyState, QueryErrorState, StatusPanel } from "@/components/status";
import { getEducatorDashboardData } from "@/lib/data/educator/dashboard";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function EducatorDashboardPage() {
  const { data, error } = await getEducatorDashboardData();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Monitor assigned team moodboards and portfolios, then add advisory comments visible to students and Admin."
      />

      {error ? <QueryErrorState message={error} /> : null}

      {!error && data ? (
        <>
          <EducatorSummaryCards summary={data.summary} />

          {data.summary.awaitingReviewCount > 0 ? (
            <StatusPanel
              variant="warning"
              title={`${data.summary.awaitingReviewCount} workflow item${data.summary.awaitingReviewCount === 1 ? "" : "s"} available to monitor`}
              description="Open monitoring to view moodboards and portfolios or leave a comment."
              action={
                <Link
                  href="/educator/portfolio-reviews"
                  className={cn(buttonVariants({ size: "sm" }))}
                >
                  Open portfolio monitoring
                </Link>
              }
            />
          ) : (
            <StatusPanel
              variant="information"
              title="No submissions to monitor"
              description="Assigned team moodboards and portfolios will appear here."
              action={
                <Link
                  href="/educator/portfolio-reviews"
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                >
                  View monitoring
                </Link>
              }
            />
          )}

          <section>
            <SectionHeader
              title="Recent workflow activity"
              description="Recent moodboards and portfolios from assigned teams."
              count={data.pendingPreviews.length}
              action={
                <Link
                  href="/educator/portfolio-reviews"
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
                  <ReviewCard
                    key={item.portfolioId}
                    portfolioId={item.portfolioId}
                    title={item.title}
                    portfolioType={item.portfolioType}
                    teamName={item.teamName}
                    leaderName={item.leaderName}
                    versionNumber={item.versionNumber}
                    submittedAt={item.submittedAt}
                    itemType={item.itemType}
                  />
                ))}
              </div>
            )}
          </section>

          <ProgramStageGuide />

          <section className="flex flex-wrap gap-2">
            <Link
              href="/educator/my-teams"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              My Teams
            </Link>
            <Link
              href="/educator/my-students"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              My Students
            </Link>
          </section>
        </>
      ) : null}
    </div>
  );
}
