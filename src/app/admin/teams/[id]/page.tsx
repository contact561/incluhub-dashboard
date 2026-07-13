import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminTeamById } from "@/lib/data/admin/teams";
import { getTeamStageDetail } from "@/lib/data/admin/team-stage";
import { assessTeamJourneyReadiness } from "@/lib/stages/teamJourneyReadiness";
import { BmsCompletionForm } from "@/components/stages/BmsCompletionForm";
import { StageJourneySection } from "@/components/stages/StageJourneySection";
import { TeamStageTimeline } from "@/components/stages/TeamStageTimeline";
import {
  EDUCATOR_TYPE_LABELS,
  STUDENT_CATEGORY_LABELS,
  formatEnumLabel,
} from "@/lib/constants/labels";
import { QueryErrorState } from "@/components/status/QueryErrorState";
import { StatusBadge } from "@/components/status/StatusBadge";
import { RecordPageHeader } from "@/components/tables/RecordPageHeader";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AdminTeamDetailPageProps = {
  params: Promise<{ id: string }>;
};

function formatCreatedAt(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatCurrentStage(stageNumber: number | null): string {
  if (stageNumber === null) {
    return "Not enrolled";
  }
  return `Stage ${stageNumber}`;
}

export default async function AdminTeamDetailPage({
  params,
}: AdminTeamDetailPageProps) {
  const { id } = await params;
  const [{ team, error }, { detail: stageDetail, error: stageError }] =
    await Promise.all([getAdminTeamById(id), getTeamStageDetail(id)]);

  if (error) {
    return (
      <div className="flex min-h-full flex-col">
        <RecordPageHeader
          title="Team Detail"
          description="View team members, educators, and stage status."
          actions={
            <Link
              href="/admin/teams"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Back to Teams
            </Link>
          }
        />
        <div className="p-6">
          <QueryErrorState message={error} />
        </div>
      </div>
    );
  }

  if (!team) {
    notFound();
  }

  const journeyEnrolled = stageDetail?.journeyEnrolled === true;
  const journeyAssessment = assessTeamJourneyReadiness(team, journeyEnrolled);

  const showBmsForm =
    journeyEnrolled &&
    team.currentStageNumber === 2 &&
    stageDetail?.stage2InProgress === true &&
    stageDetail?.bmsAlreadyCompleted !== true;

  return (
    <div className="flex min-h-full flex-col">
      <RecordPageHeader
        title={team.teamName}
        description="Program-scoped team with per-student educators and a shared stage."
        actions={
          <Link
            href="/admin/teams"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Back to Teams
          </Link>
        }
      />
      <div className="space-y-6 p-6">
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Program / Batch
            </p>
            <p className="mt-1 text-sm text-zinc-900">{team.program ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Created
            </p>
            <p className="mt-1 text-sm text-zinc-900">
              {formatCreatedAt(team.createdAt)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Current Stage
            </p>
            <p className="mt-1 text-sm text-zinc-900">
              {formatCurrentStage(team.currentStageNumber)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Stage Status
            </p>
            <div className="mt-1">
              <StatusBadge status={team.stageStatus} />
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-zinc-200 p-4">
          <h2 className="text-sm font-semibold text-zinc-900">
            Students and educators
          </h2>
          <ul className="mt-3 space-y-4">
            {team.students.map((student) => (
              <li
                key={`${student.category}-${student.id}`}
                className="border-b border-zinc-100 pb-3 last:border-0 last:pb-0"
              >
                <p className="text-sm font-medium text-zinc-900">
                  {student.fullName}
                </p>
                <p className="text-sm text-zinc-500">
                  {STUDENT_CATEGORY_LABELS[student.category]} ·{" "}
                  {student.institute ?? "—"} · {student.email}
                </p>
                {student.educator ? (
                  <p className="mt-1 text-sm text-zinc-700">
                    Educator: {student.educator.fullName} ·{" "}
                    {EDUCATOR_TYPE_LABELS[student.educator.educatorType]} ·{" "}
                    {student.educator.institute ?? "—"}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-destructive">
                    No educator mapped
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>

        {stageError ? (
          <QueryErrorState message={stageError} />
        ) : (
          <>
            <StageJourneySection
              teamId={team.id}
              assessment={journeyAssessment}
            />

            {journeyEnrolled && stageDetail ? (
              <>
                <TeamStageTimeline
                  timeline={stageDetail.timeline}
                  portfolios={stageDetail.portfolios}
                />
                {showBmsForm ? <BmsCompletionForm teamId={team.id} /> : null}
              </>
            ) : null}
          </>
        )}

        <p className="text-xs text-zinc-400">
          Shared stage status: {formatEnumLabel(team.stageStatus)}. Educators do
          not approve Team Assignment.
        </p>
      </div>
    </div>
  );
}
