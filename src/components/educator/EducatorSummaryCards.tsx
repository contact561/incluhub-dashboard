import type { EducatorDashboardSummary } from "@/types/educator-portfolio";

type EducatorSummaryCardsProps = {
  summary: EducatorDashboardSummary;
};

const CARDS: Array<{
  key: keyof EducatorDashboardSummary;
  label: string;
}> = [
  { key: "assignedTeamsCount", label: "Assigned Teams" },
  { key: "assignedStudentsCount", label: "Assigned Students" },
  { key: "awaitingReviewCount", label: "Portfolios Awaiting Review" },
  { key: "reviewsCompletedCount", label: "Reviews Completed" },
];

export function EducatorSummaryCards({ summary }: EducatorSummaryCardsProps) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {CARDS.map((card) => (
        <div
          key={card.key}
          className="rounded-xl border border-zinc-200 bg-white px-4 py-4"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            {card.label}
          </p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">
            {summary[card.key]}
          </p>
        </div>
      ))}
    </section>
  );
}
