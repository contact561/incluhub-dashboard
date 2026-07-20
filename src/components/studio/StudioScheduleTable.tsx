import {
  formatStudioBookedAt,
  formatStudioBookingDate,
  STUDIO_SLOT_LABELS,
} from "@/lib/constants/studioSlots";
import { STUDENT_CATEGORY_LABELS } from "@/lib/constants/labels";
import type { AdminStudioScheduleRow } from "@/types/studio-booking";
import { StudioVerificationControls } from "@/components/studio/StudioVerificationControls";

type StudioScheduleTableProps = {
  rows: AdminStudioScheduleRow[];
};

function ScheduleCard({ row }: { row: AdminStudioScheduleRow }) {
  return (
    <article className="rounded-[var(--radius-card)] border border-border-default bg-surface-card p-4">
      <p className="font-semibold text-text-primary">
        {formatStudioBookingDate(row.bookingDate)}
      </p>
      <p className="mt-1 text-sm text-text-muted">
        {STUDIO_SLOT_LABELS[row.slotCode]}
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-xs uppercase tracking-wide text-text-subtle">
            Team
          </dt>
          <dd className="mt-0.5 text-text-primary">{row.teamName}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-text-subtle">
            Portfolio
          </dt>
          <dd className="mt-0.5 text-text-primary">
            {STUDENT_CATEGORY_LABELS[row.portfolioType]}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-text-subtle">
            Leader
          </dt>
          <dd className="mt-0.5 text-text-primary">{row.leaderName}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-text-subtle">
            Booked
          </dt>
          <dd className="mt-0.5 text-text-primary">
            {formatStudioBookedAt(row.bookedAt)}
          </dd>
        </div>
      </dl>
      <div className="mt-4 border-t border-border-default pt-4">
        <StudioVerificationControls bookingId={row.id} status={row.verificationStatus} />
      </div>
    </article>
  );
}

export function StudioScheduleTable({ rows }: StudioScheduleTableProps) {
  return (
    <>
      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <ScheduleCard key={row.id} row={row} />
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full divide-y divide-border-default text-sm">
          <thead className="bg-surface-muted">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-text-muted">
                Date
              </th>
              <th className="px-4 py-3 text-left font-medium text-text-muted">
                Slot
              </th>
              <th className="px-4 py-3 text-left font-medium text-text-muted">
                Team
              </th>
              <th className="px-4 py-3 text-left font-medium text-text-muted">
                Program
              </th>
              <th className="px-4 py-3 text-left font-medium text-text-muted">
                Portfolio
              </th>
              <th className="px-4 py-3 text-left font-medium text-text-muted">
                Leader
              </th>
              <th className="px-4 py-3 text-left font-medium text-text-muted">
                Booked at
              </th>
              <th className="px-4 py-3 text-left font-medium text-text-muted">Check-in</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default bg-surface-card">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3 text-text-primary">
                  {formatStudioBookingDate(row.bookingDate)}
                </td>
                <td className="px-4 py-3 text-text-primary">
                  {STUDIO_SLOT_LABELS[row.slotCode]}
                </td>
                <td className="px-4 py-3 text-text-primary">{row.teamName}</td>
                <td className="px-4 py-3 text-text-primary">
                  {row.programName ?? "—"}
                </td>
                <td className="px-4 py-3 text-text-primary">
                  {STUDENT_CATEGORY_LABELS[row.portfolioType]}
                </td>
                <td className="px-4 py-3 text-text-primary">{row.leaderName}</td>
                <td className="px-4 py-3 text-text-primary">
                  {formatStudioBookedAt(row.bookedAt)}
                </td>
                <td className="min-w-72 px-4 py-3 align-top text-text-primary">
                  <StudioVerificationControls bookingId={row.id} status={row.verificationStatus} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
