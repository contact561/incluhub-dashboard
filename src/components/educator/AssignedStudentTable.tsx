import Link from "next/link";
import { PortfolioWorkflowBadge } from "@/components/status";
import { STUDENT_CATEGORY_LABELS } from "@/lib/constants/labels";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { EducatorAssignedStudent } from "@/types/educator-portfolio";

type AssignedStudentTableProps = {
  students: EducatorAssignedStudent[];
};

function StudentRow({ student }: { student: EducatorAssignedStudent }) {
  return (
    <>
      <td className="px-4 py-3 font-medium text-text-primary">
        {student.fullName}
      </td>
      <td className="px-4 py-3 text-text-muted">
        {STUDENT_CATEGORY_LABELS[student.category]}
      </td>
      <td className="px-4 py-3 text-text-muted">{student.teamName}</td>
      <td className="px-4 py-3 text-text-muted">
        {student.currentStageNumber === null
          ? "—"
          : `Stage ${student.currentStageNumber}`}
      </td>
      <td className="px-4 py-3 text-text-muted">
        {student.portfolioType
          ? STUDENT_CATEGORY_LABELS[student.portfolioType]
          : "—"}
      </td>
      <td className="px-4 py-3">
        {student.workflowStatus ? (
          <PortfolioWorkflowBadge status={student.workflowStatus} />
        ) : (
          <span className="text-text-muted">—</span>
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
          <span className="text-text-subtle">—</span>
        )}
      </td>
    </>
  );
}

function StudentCard({ student }: { student: EducatorAssignedStudent }) {
  return (
    <article className="rounded-[var(--radius-card)] border border-border-default bg-surface-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-semibold text-text-primary">{student.fullName}</h2>
          <p className="mt-1 text-sm text-text-muted">
            {STUDENT_CATEGORY_LABELS[student.category]} · {student.teamName}
          </p>
        </div>
        {student.workflowStatus ? (
          <PortfolioWorkflowBadge status={student.workflowStatus} />
        ) : null}
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-xs uppercase tracking-wide text-text-subtle">
            Stage
          </dt>
          <dd className="mt-0.5 text-text-primary">
            {student.currentStageNumber === null
              ? "—"
              : `Stage ${student.currentStageNumber}`}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-text-subtle">
            Portfolio
          </dt>
          <dd className="mt-0.5 text-text-primary">
            {student.portfolioType
              ? STUDENT_CATEGORY_LABELS[student.portfolioType]
              : "—"}
          </dd>
        </div>
      </dl>
      {student.pendingReviewPortfolioId ? (
        <div className="mt-3">
          <Link
            href={`/educator/portfolio-reviews/${student.pendingReviewPortfolioId}`}
            className={cn(buttonVariants({ size: "sm" }))}
          >
            Review
          </Link>
        </div>
      ) : null}
    </article>
  );
}

export function AssignedStudentTable({ students }: AssignedStudentTableProps) {
  return (
    <>
      {/* Mobile: stacked cards */}
      <div className="space-y-3 md:hidden">
        {students.map((student) => (
          <StudentCard
            key={`${student.teamId}-${student.studentId}`}
            student={student}
          />
        ))}
      </div>

      {/* Desktop: table with scroll affordance */}
      <div className="hidden overflow-x-auto rounded-[var(--radius-card)] border border-border-default bg-surface-card md:block">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border-default bg-surface-muted text-xs font-medium uppercase tracking-wide text-text-muted">
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
                className="border-b border-border-default last:border-0"
              >
                <StudentRow student={student} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
