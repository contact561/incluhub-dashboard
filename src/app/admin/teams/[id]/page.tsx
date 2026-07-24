import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminTeamById, getTeamCreateOptions } from "@/lib/data/admin/teams";
import { getTeamStageDetail } from "@/lib/data/admin/team-stage";
import { assessTeamJourneyReadiness } from "@/lib/stages/teamJourneyReadiness";
import { BmsCompletionForm } from "@/components/stages/BmsCompletionForm";
import { BrandOpportunityAdminPanel } from "@/components/stages/BrandOpportunityAdminPanel";
import { EcosystemApprovalPanel } from "@/components/stages/EcosystemApprovalPanel";
import { StageJourneySection } from "@/components/stages/StageJourneySection";
import { AdaptiveStageTimeline } from "@/components/stages/AdaptiveStageTimeline";
import { TeamStageTimeline } from "@/components/stages/TeamStageTimeline";
import { TeamMembershipPanel } from "@/components/admin/TeamMembershipPanel";
import {
  EDUCATOR_TYPE_LABELS,
  STUDENT_CATEGORY_LABELS,
  formatEnumLabel,
} from "@/lib/constants/labels";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { QueryErrorState, StatusBadge } from "@/components/status";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getBrandOpportunityForTeam } from "@/lib/data/brand-opportunity";
import { getTeamRegistryTimeline } from "@/lib/data/stages/teamRegistryTimeline";
import { TEAM_STUDENT_CATEGORIES } from "@/lib/validations/user";

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
  const [
    { team, error },
    { detail: stageDetail, error: stageError },
    { opportunity, error: brandError },
    { options: teamOptions },
  ] = await Promise.all([
    getAdminTeamById(id),
    getTeamStageDetail(id),
    getBrandOpportunityForTeam(id),
    getTeamCreateOptions(),
  ]);

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Team Detail"
          description="View team members, educators, and stage status."
          secondaryActions={
            <Link
              href="/admin/teams"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Back to Teams
            </Link>
          }
        />
        <QueryErrorState title="Could not load team" message={error} />
      </div>
    );
  }

  if (!team) {
    notFound();
  }

  const registryTimeline = await getTeamRegistryTimeline(
    id,
    team.currentStageNumber
  );

  const journeyEnrolled = stageDetail?.journeyEnrolled === true;
  const journeyAssessment = assessTeamJourneyReadiness(team, journeyEnrolled);

  const showBmsForm =
    journeyEnrolled &&
    team.currentStageNumber === 2 &&
    stageDetail?.stage2InProgress === true &&
    stageDetail?.bmsAlreadyCompleted !== true;

  return (
    <div className="space-y-6">
      <PageHeader
        title={team.teamName}
        description="Program-scoped team with per-student educators and a shared stage."
        secondaryActions={
          <Link
            href="/admin/teams"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Back to Teams
          </Link>
        }
      />

      <section className="grid gap-4 rounded-[var(--radius-card)] border border-border-default bg-surface-card p-4 sm:grid-cols-2 lg:grid-cols-4 sm:p-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-text-subtle">
            Program / Batch
          </p>
          <p className="mt-1 text-sm text-text-primary">{team.program ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-text-subtle">
            Created
          </p>
          <p className="mt-1 text-sm text-text-primary">
            {formatCreatedAt(team.createdAt)}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-text-subtle">
            Current Stage
          </p>
          <p className="mt-1 text-sm text-text-primary">
            {formatCurrentStage(team.currentStageNumber)}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-text-subtle">
            Stage Status
          </p>
          <div className="mt-1">
            <StatusBadge status={team.stageStatus} />
          </div>
        </div>
      </section>

      <section className="rounded-[var(--radius-card)] border border-border-default bg-surface-card p-4 sm:p-5">
        <SectionHeader title="Students and educators" as="h2" compact />
        <ul className="mt-3 space-y-4">
          {team.students.map((student) => (
            <li
              key={`${student.category}-${student.id}`}
              className="border-b border-border-default pb-3 last:border-0 last:pb-0"
            >
              <p className="text-sm font-medium text-text-primary">
                {student.fullName}
              </p>
              <p className="text-sm text-text-muted">
                {STUDENT_CATEGORY_LABELS[student.category]} ·{" "}
                {student.institute ?? "—"} · {student.email}
              </p>
              {student.educator ? (
                <p className="mt-1 text-sm text-text-primary">
                  Educator: {student.educator.fullName} ·{" "}
                  {EDUCATOR_TYPE_LABELS[student.educator.educatorType]} ·{" "}
                  {student.educator.institute ?? "—"}
                </p>
              ) : (
                <p className="mt-1 text-sm text-status-danger">
                  No educator mapped
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>

      {team.programId ? (
        <TeamMembershipPanel
          teamId={team.id}
          programId={team.programId}
          occupied={team.students
            .filter((student) =>
              TEAM_STUDENT_CATEGORIES.includes(student.category)
            )
            .map((student) => ({
              studentId: student.id,
              fullName: student.fullName,
              category: student.category,
            }))}
          availableStudents={teamOptions.students}
          educators={teamOptions.educators}
        />
      ) : null}

      {stageError ? (
        <QueryErrorState title="Could not load stage detail" message={stageError} />
      ) : (
        <>
          <StageJourneySection
            teamId={team.id}
            assessment={journeyAssessment}
          />

          <section className="space-y-3">
            <SectionHeader
              title="Program modules"
              description="Registry view (team building → BMS → mood board → studio). Status mirrors live journey RPCs."
            />
            {registryTimeline.error ? (
              <QueryErrorState message={registryTimeline.error} />
            ) : (
              <AdaptiveStageTimeline stages={registryTimeline.stages} />
            )}
          </section>

          {journeyEnrolled && stageDetail ? (
            <>
              <TeamStageTimeline
                timeline={stageDetail.timeline}
                portfolios={stageDetail.portfolios}
              />
              {showBmsForm ? <BmsCompletionForm teamId={team.id} /> : null}
              {brandError ? (
                <QueryErrorState
                  title="Could not load Brand Opportunity"
                  message={brandError}
                />
              ) : null}
              {!brandError && (team.currentStageNumber ?? 0) >= 4 ? (
                <BrandOpportunityAdminPanel
                  teamId={team.id}
                  currentStageNumber={team.currentStageNumber}
                  opportunity={opportunity}
                />
              ) : null}
              {(team.currentStageNumber ?? 0) >= 5 ? (
                <EcosystemApprovalPanel
                  teamId={team.id}
                  students={team.students.map((student) => ({
                    id: student.id,
                    fullName: student.fullName,
                    category: student.category,
                    ecosystemAccessStatus: student.ecosystemAccessStatus,
                  }))}
                />
              ) : null}
            </>
          ) : null}
        </>
      )}

      <p className="text-xs text-text-subtle">
        Shared stage status: {formatEnumLabel(team.stageStatus)}. Educators do
        not approve Team Assignment.
      </p>
    </div>
  );
}
