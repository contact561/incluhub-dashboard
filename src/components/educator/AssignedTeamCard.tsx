import Link from "next/link";
import { PortfolioWorkflowBadge, StatusBadge } from "@/components/status";
import { STUDENT_CATEGORY_LABELS } from "@/lib/constants/labels";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { EducatorAssignedTeam } from "@/types/educator-portfolio";

type AssignedTeamCardProps = {
  team: EducatorAssignedTeam;
};

export function AssignedTeamCard({ team }: AssignedTeamCardProps) {
  return (
    <article className="rounded-[var(--radius-card)] border border-border-default bg-surface-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-text-primary">
            {team.teamName}
          </h2>
          <p className="mt-1 text-sm text-text-muted">
            {team.currentStageNumber === null
              ? "Not enrolled"
              : `Stage ${team.currentStageNumber}`}
          </p>
        </div>
        <StatusBadge status={team.stageStatus} />
      </div>

      <div className="mt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-text-subtle">
          Mapped students
        </p>
        <ul className="mt-2 space-y-1 text-sm text-text-primary">
          {team.mappedStudents.map((student) => (
            <li key={student.studentId}>
              {student.fullName}{" "}
              <span className="text-text-muted">
                ({STUDENT_CATEGORY_LABELS[student.category]})
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-text-subtle">
            Active portfolio
          </p>
          <p className="mt-1 text-sm text-text-primary">
            {team.activePortfolioType
              ? STUDENT_CATEGORY_LABELS[team.activePortfolioType]
              : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-text-subtle">
            Workflow status
          </p>
          <div className="mt-1">
            {team.activeWorkflowStatus ? (
              <PortfolioWorkflowBadge status={team.activeWorkflowStatus} />
            ) : (
              <span className="text-sm text-text-muted">—</span>
            )}
          </div>
        </div>
      </div>

      {team.pendingReviewPortfolioId ? (
        <div className="mt-4">
          <Link
            href={`/educator/portfolio-reviews/${team.pendingReviewPortfolioId}`}
            className={cn(buttonVariants({ size: "sm" }))}
          >
            Open review
          </Link>
        </div>
      ) : null}
    </article>
  );
}
