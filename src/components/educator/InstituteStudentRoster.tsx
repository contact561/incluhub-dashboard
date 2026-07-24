import { STUDENT_CATEGORY_LABELS } from "@/lib/constants/labels";
import type { InstituteStudentRow } from "@/lib/data/educator/instituteRoster";
import { summarizeInstituteStudents } from "@/lib/data/educator/instituteRoster";
import type { StudentCategory } from "@/types/database";
import { EmptyState } from "@/components/status";

export function InstituteStudentRoster({
  rows,
}: {
  rows: InstituteStudentRow[];
}) {
  const summary = summarizeInstituteStudents(rows);

  if (rows.length === 0) {
    return (
      <EmptyState
        title="No institute students yet"
        description="When students from your institute complete Google onboarding, they appear here automatically."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(Object.keys(summary.byCategory) as StudentCategory[]).map((key) => (
          <div
            key={key}
            className="rounded-[var(--radius-card)] border border-border-default bg-surface-card p-3"
          >
            <p className="text-xs uppercase tracking-wide text-text-subtle">
              {STUDENT_CATEGORY_LABELS[key]}
            </p>
            <p className="mt-1 text-2xl font-semibold text-text-primary">
              {summary.byCategory[key]}
            </p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-[var(--radius-card)] border border-border-default">
        <table className="min-w-full divide-y divide-border-default text-sm">
          <thead className="bg-surface-muted">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-text-muted">
                Name
              </th>
              <th className="px-3 py-2 text-left font-medium text-text-muted">
                Email
              </th>
              <th className="px-3 py-2 text-left font-medium text-text-muted">
                Category
              </th>
              <th className="px-3 py-2 text-left font-medium text-text-muted">
                Stage #
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default bg-surface-card">
            {rows.map((row) => (
              <tr key={row.studentId}>
                <td className="px-3 py-2 text-text-primary">{row.fullName}</td>
                <td className="px-3 py-2 text-text-muted">{row.email}</td>
                <td className="px-3 py-2 text-text-primary">
                  {STUDENT_CATEGORY_LABELS[row.category]}
                </td>
                <td className="px-3 py-2 text-text-primary">
                  {row.currentStageNumber ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
