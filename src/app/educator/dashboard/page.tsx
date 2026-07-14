import Link from "next/link";
import { EmptyState, QueryErrorState } from "@/components/status";
import { EducatorSummaryCards } from "@/components/educator/EducatorSummaryCards";
import { RecordPageHeader } from "@/components/tables/RecordPageHeader";
import { STUDENT_CATEGORY_LABELS } from "@/lib/constants/labels";
import { getEducatorDashboardData } from "@/lib/data/educator/dashboard";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function formatSubmittedAt(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function EducatorDashboardPage() {
  const { data, error } = await getEducatorDashboardData();

  return (
    <div className="flex min-h-full flex-col">
      <RecordPageHeader
        title="Educator Dashboard"
        description="Review assigned teams, students, and portfolios waiting for your decision."
      />
      <div className="space-y-6 p-6">
        {error ? <QueryErrorState message={error} /> : null}

        {!error && data ? (
          <>
            <EducatorSummaryCards summary={data.summary} />

            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-zinc-900">
                  Awaiting Your Review
                </h2>
                <Link
                  href="/educator/portfolio-reviews"
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                >
                  View all
                </Link>
              </div>

              {data.pendingPreviews.length === 0 ? (
                <EmptyState
                  title="No portfolios awaiting review"
                  description="When a mapped student submits a portfolio, it will appear here for educator review."
                />
              ) : (
                <div className="space-y-3">
                  {data.pendingPreviews.map((item) => (
                    <article
                      key={item.portfolioId}
                      className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-zinc-900">
                          {item.title}
                        </p>
                        <p className="mt-1 text-sm text-zinc-500">
                          {STUDENT_CATEGORY_LABELS[item.portfolioType]} ·{" "}
                          {item.teamName} · {item.leaderName} · v
                          {item.versionNumber} ·{" "}
                          {formatSubmittedAt(item.submittedAt)}
                        </p>
                      </div>
                      <Link
                        href={`/educator/portfolio-reviews/${item.portfolioId}`}
                        className={cn(
                          buttonVariants({ size: "sm" }),
                          "shrink-0"
                        )}
                      >
                        Open Review
                      </Link>
                    </article>
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
