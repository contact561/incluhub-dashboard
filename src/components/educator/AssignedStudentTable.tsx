import Link from "next/link";
import { StatusBadge } from "@/components/status";
import { STUDENT_CATEGORY_LABELS } from "@/lib/constants/labels";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { EducatorAssignedStudent } from "@/types/educator-portfolio";

type AssignedStudentTableProps = {
  students: EducatorAssignedStudent[];
};

export function AssignedStudentTable({ students }: AssignedStudentTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-500">
          <tr>
            <th className="px-4 py-3">Student</th>
            <th className="px-4 py-3">Category</th>
            <th className="px-4 py-3">Team</th>
            <th className="px-4 py-3">Stage</th>
            <th className="px-4 py-3">Portfolio</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Action</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student) => (
            <tr
              key={`${student.teamId}-${student.studentId}`}
              className="border-b border-zinc-100 last:border-0"
            >
              <td className="px-4 py-3 font-medium text-zinc-900">
                {student.fullName}
              </td>
              <td className="px-4 py-3 text-zinc-700">
                {STUDENT_CATEGORY_LABELS[student.category]}
              </td>
              <td className="px-4 py-3 text-zinc-700">{student.teamName}</td>
              <td className="px-4 py-3 text-zinc-700">
                {student.currentStageNumber === null
                  ? "—"
                  : `Stage ${student.currentStageNumber}`}
              </td>
              <td className="px-4 py-3 text-zinc-700">
                {student.portfolioType
                  ? STUDENT_CATEGORY_LABELS[student.portfolioType]
                  : "—"}
              </td>
              <td className="px-4 py-3">
                {student.workflowStatus ? (
                  <StatusBadge status={student.workflowStatus} />
                ) : (
                  <span className="text-zinc-500">—</span>
                )}
              </td>
              <td className="px-4 py-3">
                {student.pendingReviewPortfolioId ? (
                  <Link
                    href={`/educator/portfolio-reviews/${student.pendingReviewPortfolioId}`}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                  >
                    Review
                  </Link>
                ) : (
                  <span className="text-zinc-400">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
