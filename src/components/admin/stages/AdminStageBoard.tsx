import Link from "next/link";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { EmptyState, StatusBadge } from "@/components/status";
import { STUDENT_CATEGORY_LABELS } from "@/lib/constants/labels";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  AwaitingAssignmentStudent,
  StageBoardTeamCard,
} from "@/types/stage-management";

type StageBoardColumnProps = {
  title: string;
  description: string;
  count: number;
  children: React.ReactNode;
};

function StageBoardColumn({
  title,
  description,
  count,
  children,
}: StageBoardColumnProps) {
  return (
    <section className="flex min-h-[280px] min-w-[260px] flex-col rounded-[var(--radius-card)] border border-border-default bg-surface-muted/40">
      <header className="border-b border-border-default px-4 py-3">
        <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
        <p className="mt-0.5 text-xs text-text-muted">{description}</p>
        <p className="mt-1 text-xs font-medium text-text-subtle">
          {count} {count === 1 ? "team" : "teams"}
        </p>
      </header>
      <div className="flex flex-1 flex-col gap-3 p-3">{children}</div>
    </section>
  );
}

function formatUpdatedAt(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(
    new Date(`${value}T00:00:00+05:30`)
  );
}

function TeamStageCard({ team }: { team: StageBoardTeamCard }) {
  return (
    <article className="rounded-[var(--radius-card)] border border-border-default bg-surface-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-text-primary">
            {team.teamName}
          </h3>
          <p className="text-xs text-text-muted">{team.program ?? "—"}</p>
        </div>
        <StatusBadge status={team.stageStatus} />
      </div>
      <ul className="mt-3 space-y-1">
        {team.students.map((student) => (
          <li
            key={`${team.id}-${student.category}`}
            className="text-xs text-text-muted"
          >
            {student.fullName} · {STUDENT_CATEGORY_LABELS[student.category]}
          </li>
        ))}
      </ul>
      {team.brandWorksDate ? (
        <div className="mt-3 rounded-md border border-border-default bg-surface-muted p-2 text-xs">
          <p className="font-medium text-text-primary">Brand Works</p>
          <p className="mt-0.5 text-text-muted">
            {team.brandWorksCompletedAt ? "Completed" : "Scheduled"}: {" "}
            {formatDate(team.brandWorksDate)}
          </p>
        </div>
      ) : null}
      <div className="mt-3 flex items-center justify-between gap-2 text-xs text-text-subtle">
        <span>
          {team.currentStageNumber === null
            ? "Not enrolled"
            : `Stage ${team.currentStageNumber}`}
        </span>
        <span>{formatUpdatedAt(team.updatedAt)}</span>
      </div>
      <Link
        href={`/admin/teams/${team.id}`}
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "mt-3 w-full"
        )}
      >
        View team
      </Link>
    </article>
  );
}

function AwaitingAssignmentCard({
  student,
}: {
  student: AwaitingAssignmentStudent;
}) {
  return (
    <article className="rounded-[var(--radius-card)] border border-border-default bg-surface-card p-3">
      <h3 className="text-sm font-semibold text-text-primary">
        {student.fullName}
      </h3>
      <p className="mt-1 text-xs text-text-muted">{student.email}</p>
      <p className="mt-2 text-xs text-text-muted">
        {STUDENT_CATEGORY_LABELS[student.category]} · {student.institute ?? "—"}
      </p>
      <p className="mt-1 text-xs text-text-subtle">{student.programName}</p>
    </article>
  );
}

type AdminStageBoardProps = {
  awaitingAssignment: AwaitingAssignmentStudent[];
  notEnrolledTeams: StageBoardTeamCard[];
  stage2Teams: StageBoardTeamCard[];
  stage3Teams: StageBoardTeamCard[];
  stage4Teams: StageBoardTeamCard[];
  stage5Teams: StageBoardTeamCard[];
};

/**
 * Admin Stage Board — presentation only; data placement unchanged from loader.
 */
export function AdminStageBoard({
  awaitingAssignment,
  notEnrolledTeams,
  stage2Teams,
  stage3Teams,
  stage4Teams,
  stage5Teams,
}: AdminStageBoardProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-[var(--radius-card)] border border-border-default bg-surface-card p-4">
        <SectionHeader
          title="Awaiting team assignment"
          description="Enrolled active students not currently on an active team."
          count={awaitingAssignment.length}
          action={
            <Link
              href="/admin/teams/create"
              className={cn(buttonVariants({ size: "sm" }))}
            >
              Create team
            </Link>
          }
          compact
        />
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {awaitingAssignment.length === 0 ? (
            <div className="col-span-full">
              <EmptyState
                title="No students waiting"
                description="No students are waiting for team assignment."
              />
            </div>
          ) : (
            awaitingAssignment.map((student) => (
              <AwaitingAssignmentCard key={student.id} student={student} />
            ))
          )}
        </div>
      </section>

      <section className="rounded-[var(--radius-card)] border border-border-default bg-surface-card p-4">
        <SectionHeader
          title="Not enrolled"
          description="Active teams created but not yet enrolled in the stage journey."
          count={notEnrolledTeams.length}
          compact
        />
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {notEnrolledTeams.length === 0 ? (
            <div className="col-span-full">
              <EmptyState
                title="All teams enrolled"
                description="Every active team has started the stage journey."
              />
            </div>
          ) : (
            notEnrolledTeams.map((team) => (
              <TeamStageCard key={team.id} team={team} />
            ))
          )}
        </div>
      </section>

      <div className="-mx-1 overflow-x-auto pb-2">
        <div className="flex min-w-max gap-4 px-1 lg:grid lg:min-w-0 lg:grid-cols-2 2xl:grid-cols-4">
          <StageBoardColumn
            title="Stage 2 — BMS Session"
            description="Teams attending or completing the BMS session."
            count={stage2Teams.length}
          >
            {stage2Teams.length === 0 ? (
              <EmptyState
                title="No teams"
                description="No teams are currently in Stage 2."
              />
            ) : (
              stage2Teams.map((team) => (
                <TeamStageCard key={team.id} team={team} />
              ))
            )}
          </StageBoardColumn>

          <StageBoardColumn
            title="Stage 3 — Sequential Portfolio Production"
            description="Photography → Makeup → Hairstyling order."
            count={stage3Teams.length}
          >
            {stage3Teams.length === 0 ? (
              <EmptyState
                title="No teams"
                description="No teams are currently in Stage 3."
              />
            ) : (
              stage3Teams.map((team) => (
                <TeamStageCard key={team.id} team={team} />
              ))
            )}
          </StageBoardColumn>

          <StageBoardColumn
            title="Stage 4 — Brand Works"
            description="Teams scheduled for or completing Brand Works."
            count={stage4Teams.length}
          >
            {stage4Teams.length === 0 ? (
              <EmptyState
                title="No teams"
                description="No teams are currently in Stage 4."
              />
            ) : (
              stage4Teams.map((team) => (
                <TeamStageCard key={team.id} team={team} />
              ))
            )}
          </StageBoardColumn>

          <StageBoardColumn
            title="Stage 5 — IncluHub Ecosystem Welcome"
            description="Teams whose final ecosystem stage is completed."
            count={stage5Teams.length}
          >
            {stage5Teams.length === 0 ? (
              <EmptyState
                title="No teams"
                description="No teams are currently in Stage 5."
              />
            ) : (
              stage5Teams.map((team) => (
                <TeamStageCard key={team.id} team={team} />
              ))
            )}
          </StageBoardColumn>
        </div>
      </div>
    </div>
  );
}
