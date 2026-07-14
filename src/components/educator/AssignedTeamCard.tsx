import Link from "next/link";
import { StatusBadge } from "@/components/status";
import { STUDENT_CATEGORY_LABELS } from "@/lib/constants/labels";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { EducatorAssignedTeam } from "@/types/educator-portfolio";

type AssignedTeamCardProps = {
  team: EducatorAssignedTeam;
};

export function AssignedTeamCard({ team }: AssignedTeamCardProps) {
  return (
    <article className="rounded-xl border border-zinc-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-zinc-900">
            {team.teamName}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            {team.currentStageNumber === null
              ? "Not enrolled"
              : `Stage ${team.currentStageNumber}`}
          </p>
        </div>
        <StatusBadge status={team.stageStatus} />
      </div>

      <div className="mt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
          Mapped students
        </p>
        <ul className="mt-2 space-y-1 text-sm text-zinc-800">
          {team.mappedStudents.map((student) => (
            <li key={student.studentId}>
              {student.fullName}{" "}
              <span className="text-zinc-500">
                ({STUDENT_CATEGORY_LABELS[student.category]})
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            Active portfolio
          </p>
          <p className="mt-1 text-sm text-zinc-900">
            {team.activePortfolioType
              ? STUDENT_CATEGORY_LABELS[team.activePortfolioType]
              : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            Workflow status
          </p>
          <div className="mt-1">
            {team.activeWorkflowStatus ? (
              <StatusBadge status={team.activeWorkflowStatus} />
            ) : (
              <span className="text-sm text-zinc-500">—</span>
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
