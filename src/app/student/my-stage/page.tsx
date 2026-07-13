import { TeamStageTimeline } from "@/components/stages/TeamStageTimeline";
import { EmptyState, QueryErrorState } from "@/components/status";
import { StatusBadge } from "@/components/status/StatusBadge";
import { RecordPageHeader } from "@/components/tables/RecordPageHeader";
import { formatEnumLabel } from "@/lib/constants/labels";
import {
  formatCurrentStageLabel,
  getStudentMyStagePageData,
} from "@/lib/data/student/myStage";
import { STUDENT_PORTAL_ERRORS } from "@/lib/data/student/activeTeamContext";

export default async function StudentMyStagePage() {
  const { data, error } = await getStudentMyStagePageData();

  return (
    <div className="flex min-h-full flex-col">
      <RecordPageHeader
        title="My Stage"
        description="Track your team's shared stage journey from onboarding through ecosystem unlock."
      />
      <div className="space-y-6 p-6">
        {error ? <QueryErrorState message={error} /> : null}

        {!error && !data ? (
          <EmptyState
            title="No stage data"
            description="Stage information is not available for your account."
          />
        ) : null}

        {data ? (
          <>
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                  Team
                </p>
                <p className="mt-1 text-sm text-zinc-900">{data.teamName}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                  Program
                </p>
                <p className="mt-1 text-sm text-zinc-900">
                  {data.programName ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                  Current stage
                </p>
                <p className="mt-1 text-sm text-zinc-900">
                  {data.currentStageName
                    ? `${formatCurrentStageLabel(data.currentStageNumber)} — ${data.currentStageName}`
                    : formatCurrentStageLabel(data.currentStageNumber)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                  Stage status
                </p>
                <div className="mt-1">
                  <StatusBadge status={data.currentStageStatus} />
                </div>
              </div>
            </section>

            {!data.journeyEnrolled ? (
              <EmptyState
                title="Stage journey not started"
                description={STUDENT_PORTAL_ERRORS.journeyNotStarted}
              />
            ) : (
              <TeamStageTimeline
                timeline={data.timeline}
                portfolios={
                  data.currentStageNumber === 3 ? data.portfolios : []
                }
              />
            )}

            <p className="text-xs text-zinc-400">
              Stage status: {formatEnumLabel(data.currentStageStatus)}. This
              page is read-only.
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}
