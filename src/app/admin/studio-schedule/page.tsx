import Link from "next/link";
import { DataTable } from "@/components/admin/DataTable";
import { getAdminStudioSchedule } from "@/lib/data/admin/studioSchedule";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, QueryErrorState } from "@/components/status";
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
    <div className="space-y-6">
      <PageHeader
        title="Studio Schedule"
        description="Read-only view of confirmed IncluHub studio bookings."
        metadata={
          error ? undefined : (
            <span>
              {rows.length} {rows.length === 1 ? "booking" : "bookings"}
            </span>
          )
        }
      />

      <DataTable
        filters={
          <form className="flex flex-wrap items-end gap-3 px-1" method="get">
            <div className="min-w-[200px] flex-1 space-y-1">
              <label
                htmlFor="date"
                className="text-xs font-medium uppercase tracking-wide text-text-subtle"
              >
                Filter by date
              </label>
              <input
                id="date"
                name="date"
                type="date"
                defaultValue={date ?? ""}
                className="w-full rounded-[var(--radius-card)] border border-border-default bg-surface-card px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
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
        }
      >
        {error ? (
          <div className="p-4">
            <QueryErrorState
              title="Could not load studio schedule"
              message={error}
            />
          </div>
        ) : null}

        {!error && rows.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="No studio bookings"
              description={
                date
                  ? "No confirmed bookings were found for the selected date."
                  : "Confirmed studio bookings will appear here after leaders book slots."
              }
            />
          </div>
        ) : null}

        {!error && rows.length > 0 ? <StudioScheduleTable rows={rows} /> : null}
      </DataTable>
    </div>
  );
}
