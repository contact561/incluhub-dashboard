import Link from "next/link";
import { getAdminStudioSchedule } from "@/lib/data/admin/studioSchedule";
import { EmptyState, QueryErrorState } from "@/components/status";
import { RecordPageHeader } from "@/components/tables/RecordPageHeader";
import { StudioScheduleTable } from "@/components/studio/StudioScheduleTable";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AdminStudioSchedulePageProps = {
  searchParams: Promise<{ date?: string }>;
};

export default async function AdminStudioSchedulePage({
  searchParams,
}: AdminStudioSchedulePageProps) {
  const { date } = await searchParams;
  const { rows, error } = await getAdminStudioSchedule(date ?? null);

  return (
    <div className="flex min-h-full flex-col">
      <RecordPageHeader
        title="Studio Schedule"
        description="Read-only view of confirmed IncluHub studio bookings."
        count={error ? undefined : rows.length}
      />
      <div className="space-y-4 p-6">
        <form className="flex flex-wrap items-end gap-3" method="get">
          <div className="space-y-1">
            <label
              htmlFor="date"
              className="text-xs font-medium uppercase tracking-wide text-zinc-400"
            >
              Filter by date
            </label>
            <input
              id="date"
              name="date"
              type="date"
              defaultValue={date ?? ""}
              className="rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
          <button
            type="submit"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Apply filter
          </button>
          {date ? (
            <Link
              href="/admin/studio-schedule"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            >
              Clear filter
            </Link>
          ) : null}
        </form>

        {error ? <QueryErrorState message={error} /> : null}

        {!error && rows.length === 0 ? (
          <EmptyState
            title="No studio bookings"
            description={
              date
                ? "No confirmed bookings were found for the selected date."
                : "Confirmed studio bookings will appear here after leaders book slots."
            }
          />
        ) : null}

        {!error && rows.length > 0 ? <StudioScheduleTable rows={rows} /> : null}
      </div>
    </div>
  );
}
