import {
  formatStudioBookedAt,
  formatStudioBookingDate,
  STUDIO_SLOT_LABELS,
} from "@/lib/constants/studioSlots";
import { STUDENT_CATEGORY_LABELS } from "@/lib/constants/labels";
import type { AdminStudioScheduleRow } from "@/types/studio-booking";

type StudioScheduleTableProps = {
  rows: AdminStudioScheduleRow[];
};

export function StudioScheduleTable({ rows }: StudioScheduleTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200">
      <table className="min-w-full divide-y divide-zinc-200 text-sm">
        <thead className="bg-zinc-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-zinc-600">
              Date
            </th>
            <th className="px-4 py-3 text-left font-medium text-zinc-600">
              Slot
            </th>
            <th className="px-4 py-3 text-left font-medium text-zinc-600">
              Team
            </th>
            <th className="px-4 py-3 text-left font-medium text-zinc-600">
              Program
            </th>
            <th className="px-4 py-3 text-left font-medium text-zinc-600">
              Portfolio
            </th>
            <th className="px-4 py-3 text-left font-medium text-zinc-600">
              Leader
            </th>
            <th className="px-4 py-3 text-left font-medium text-zinc-600">
              Booked at
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 bg-white">
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="px-4 py-3 text-zinc-900">
                {formatStudioBookingDate(row.bookingDate)}
              </td>
              <td className="px-4 py-3 text-zinc-900">
                {STUDIO_SLOT_LABELS[row.slotCode]}
              </td>
              <td className="px-4 py-3 text-zinc-900">{row.teamName}</td>
              <td className="px-4 py-3 text-zinc-900">
                {row.programName ?? "—"}
              </td>
              <td className="px-4 py-3 text-zinc-900">
                {STUDENT_CATEGORY_LABELS[row.portfolioType]}
              </td>
              <td className="px-4 py-3 text-zinc-900">{row.leaderName}</td>
              <td className="px-4 py-3 text-zinc-900">
                {formatStudioBookedAt(row.bookedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
