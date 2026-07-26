import Link from "next/link";
import { ProgramStageGuide } from "@/components/shared/ProgramStageGuide";
import { EducatorSummaryCards } from "@/components/educator/EducatorSummaryCards";
import { InstituteStudentRoster } from "@/components/educator/InstituteStudentRoster";
import { ReviewCard } from "@/components/educator/ReviewCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { EmptyState, QueryErrorState, StatusPanel } from "@/components/status";
import { getEducatorDashboardData } from "@/lib/data/educator/dashboard";
import { getEducatorInstituteStudents } from "@/lib/data/educator/instituteRoster";
import { getInstituteMoodBoardQueue } from "@/lib/data/moodboard";
import { MoodBoardReviewForm } from "@/components/moodboard/MoodBoardReviewForm";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function EducatorDashboardPage() {
  const [{ data, error }, instituteRoster, moodQueue] = await Promise.all([
    getEducatorDashboardData(),
    getEducatorInstituteStudents(),
    getInstituteMoodBoardQueue(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Your institute students appear automatically. Team-mapped reviews remain available below."
      />

      <section className="space-y-3">
        <SectionHeader
          title="Your institute students"
          description="Students who selected your institute during Google onboarding."
          count={instituteRoster.rows.length}
        />
        {instituteRoster.error ? (
          <QueryErrorState message={instituteRoster.error} />
        ) : (
          <InstituteStudentRoster rows={instituteRoster.rows} />
        )}
      </section>

      <section className="space-y-3">
        <SectionHeader
          title="Mood board reviews"
          description="Institute students’ mood boards awaiting your decision (Admin must also approve)."
          count={moodQueue.rows.length}
        />
        {moodQueue.error ? (
          <QueryErrorState message={moodQueue.error} />
        ) : moodQueue.rows.length === 0 ? (
          <EmptyState
            title="No mood boards yet"
            description="When your institute’s students submit mood boards after BMS, they appear here."
          />
        ) : (
          <ul className="space-y-3">
            {moodQueue.rows.map((row) => (
              <li
                key={row.id}
                className="rounded-[var(--radius-card)] border border-border-default bg-surface-card p-4"
              >
                <p className="font-medium text-text-primary">
                  {row.studentName} · v{row.versionNumber} · {row.title}
                </p>
                <p className="mt-1 text-sm text-text-muted">
                  Status: {row.status}
                  {row.educatorDecision
                    ? ` · Your decision: ${row.educatorDecision}`
                    : ""}
                  {row.adminDecision
                    ? ` · Admin: ${row.adminDecision}`
                    : ""}
                </p>
                <a
                  href={row.moodBoardUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-sm underline"
                >
                  Open mood board
                </a>
                {row.status !== "approved" ? (
                  <MoodBoardReviewForm submissionId={row.id} />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {error ? <QueryErrorState message={error} /> : null}

      {!error && data ? (
        <>
          <EducatorSummaryCards summary={data.summary} />

          {data.summary.awaitingReviewCount > 0 ? (
            <StatusPanel
              variant="warning"
              title={`${data.summary.awaitingReviewCount} portfolio${data.summary.awaitingReviewCount === 1 ? "" : "s"} awaiting your review`}
              description="Open the review queue to approve or request revision on pending submissions."
              action={
                <Link
                  href="/educator/portfolio-reviews"
                  className={cn(buttonVariants({ size: "sm" }))}
                >
                  Open portfolio reviews
                </Link>
              }
            />
          ) : (
            <StatusPanel
              variant="information"
              title="No portfolios awaiting review"
              description="When a mapped student submits a portfolio, it will appear in your review queue."
              action={
                <Link
                  href="/educator/portfolio-reviews"
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                >
                  View review queue
                </Link>
              }
            />
          )}

          <section>
            <SectionHeader
              title="Awaiting your review"
              description="Recent submissions ready for educator decision."
              count={data.pendingPreviews.length}
              action={
                <Link
                  href="/educator/portfolio-reviews"
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
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
