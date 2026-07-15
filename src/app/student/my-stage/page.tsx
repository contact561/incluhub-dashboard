import { StudentStageJourney } from "@/components/student/StudentStageJourney";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, QueryErrorState } from "@/components/status";
import { StatusBadge } from "@/components/status/StatusBadge";
import { STUDENT_PORTAL_ERRORS } from "@/lib/data/student/activeTeamContext";
import {
  formatCurrentStageLabel,
  getStudentMyStagePageData,
} from "@/lib/data/student/myStage";

export default async function StudentMyStagePage() {
  const { data, error } = await getStudentMyStagePageData();

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Stage"
        description="Track your team's shared stage journey from onboarding through ecosystem unlock."
      />

      {error ? <QueryErrorState message={error} /> : null}

      {!error && !data ? (
        <EmptyState
          title="No stage data"
          description="Stage information is not available for your account."
        />
      ) : null}

      {data ? (
        <>
          <section className="grid gap-4 rounded-[var(--radius-card)] border border-border-default bg-surface-card p-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                Team
              </p>
              <p className="mt-1 text-sm font-medium text-text-primary">
                {data.teamName}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                Program
              </p>
              <p className="mt-1 text-sm text-text-primary">
                {data.programName ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                Current stage
              </p>
              <p className="mt-1 text-sm text-text-primary">
                {data.currentStageName
                  ? `${formatCurrentStageLabel(data.currentStageNumber)} — ${data.currentStageName}`
                  : formatCurrentStageLabel(data.currentStageNumber)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
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
            <StudentStageJourney
              timeline={data.timeline}
              portfolios={
                data.currentStageNumber === 3 ? data.portfolios : []
              }
              currentStageNumber={data.currentStageNumber}
            />
          )}
        </>
      ) : null}
    </div>
  );
}
