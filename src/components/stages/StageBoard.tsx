import Link from "next/link";
import { STUDENT_CATEGORY_LABELS } from "@/lib/constants/labels";
import { EmptyState } from "@/components/status/EmptyState";
import { StatusBadge } from "@/components/status/StatusBadge";
import { buttonVariants } from "@/components/ui/button";
import type {
  AwaitingAssignmentStudent,
  StageBoardTeamCard,
} from "@/types/stage-management";
import { cn } from "@/lib/utils";

type StageBoardColumnProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

function StageBoardColumn({
  title,
  description,
  children,
}: StageBoardColumnProps) {
  return (
    <section className="flex min-h-[320px] flex-col rounded-lg border border-zinc-200 bg-zinc-50/50">
      <header className="border-b border-zinc-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
        <p className="mt-0.5 text-xs text-zinc-500">{description}</p>
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

function TeamStageCard({ team }: { team: StageBoardTeamCard }) {
  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">{team.teamName}</h3>
          <p className="text-xs text-zinc-500">{team.program ?? "—"}</p>
        </div>
        <StatusBadge status={team.stageStatus} />
      </div>
      <ul className="mt-3 space-y-1">
        {team.students.map((student) => (
          <li key={`${team.id}-${student.category}`} className="text-xs text-zinc-600">
            {student.fullName} · {STUDENT_CATEGORY_LABELS[student.category]}
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center justify-between gap-2 text-xs text-zinc-400">
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
    <article className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
      <h3 className="text-sm font-semibold text-zinc-900">{student.fullName}</h3>
      <p className="mt-1 text-xs text-zinc-500">{student.email}</p>
      <p className="mt-2 text-xs text-zinc-600">
        {STUDENT_CATEGORY_LABELS[student.category]} · {student.institute ?? "—"}
      </p>
      <p className="mt-1 text-xs text-zinc-500">{student.programName}</p>
    </article>
  );
}

type StageBoardProps = {
  awaitingAssignment: AwaitingAssignmentStudent[];
  notEnrolledTeams: StageBoardTeamCard[];
  stage2Teams: StageBoardTeamCard[];
  stage3Teams: StageBoardTeamCard[];
  stage4Teams: StageBoardTeamCard[];
  stage5Teams: StageBoardTeamCard[];
};

export function StageBoard({
  awaitingAssignment,
  notEnrolledTeams,
  stage2Teams,
  stage3Teams,
  stage4Teams,
  stage5Teams,
}: StageBoardProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">
              Awaiting Team Assignment
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Enrolled active students not currently on an active team.
            </p>
          </div>
          <Link
            href="/admin/teams/create"
            className={cn(buttonVariants({ variant: "default", size: "sm" }))}
          >
            Create team
          </Link>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-900">Not Enrolled</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Active teams created but not yet enrolled in the stage journey.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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

      <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-4">
        <StageBoardColumn
          title="Stage 2 — BMS Session"
          description="Teams attending or completing the BMS session."
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
          description="Teams producing portfolios in Photography → Makeup → Hairstyling order."
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
  );
}
