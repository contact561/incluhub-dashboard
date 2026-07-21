import Link from "next/link";
import { StudentStageJourney } from "@/components/student/StudentStageJourney";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, QueryErrorState, StatusPanel } from "@/components/status";
import { StatusBadge } from "@/components/status/StatusBadge";
import { buttonVariants } from "@/components/ui/button";
import { STUDENT_PORTAL_ERRORS } from "@/lib/data/student/activeTeamContext";
import { getStudentEcosystemAccess } from "@/lib/data/student/ecosystem";
import {
  formatCurrentStageLabel,
  getStudentMyStagePageData,
} from "@/lib/data/student/myStage";
import { cn } from "@/lib/utils";
import { WhatHappensNow } from "@/components/student/WhatHappensNow";

type StudentMyStagePageProps = {
  searchParams: Promise<{ ecosystem?: string }>;
};

export default async function StudentMyStagePage({
  searchParams,
}: StudentMyStagePageProps) {
  const { ecosystem } = await searchParams;
  const [{ data, error }, ecosystemAccess] = await Promise.all([
    getStudentMyStagePageData(),
    getStudentEcosystemAccess(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Stage"
        description="Track your team's shared stage journey from onboarding through ecosystem unlock."
      />

      {error ? <QueryErrorState message={error} /> : null}

      {ecosystem === "locked" ? (
        <StatusPanel
          variant="warning"
          title="Ecosystem access is still locked"
          description="Complete Stage 4 and reach Stage 5. Ecosystem access is granted only if IncluHub Admin selects you."
        />
      ) : null}

      {!error && !data ? (
        <EmptyState
          title="No stage data"
          description="Stage information is not available for your account."
        />
      ) : null}

      {data ? (
        <>
          <WhatHappensNow
            title="Complete only the current unlocked stage"
            description="The timeline below explains completed, active, and locked work. Follow the active stage instructions; IncluHub unlocks the next stage after its required approval."
            actionLabel={
              data.currentStageNumber === 3
                ? "Open portfolio workspace"
                : undefined
            }
            actionHref={
              data.currentStageNumber === 3 ? "/student/portfolio" : undefined
            }
          />
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

          {data.currentStageNumber !== null && data.currentStageNumber >= 5 ? (
            ecosystemAccess.status === "granted" ? (
              <StatusPanel
                variant="success"
                title="Ecosystem access approved"
                description="IncluHub has approved your onboarding. Continue into the ecosystem when you are ready."
                action={
                  <Link
                    href="/student/ecosystem"
                    className={cn(buttonVariants({ size: "sm" }))}
                  >
                    Enter the Ecosystem
                  </Link>
                }
              />
            ) : (
              <StatusPanel
                variant="information"
                title="Stage 5 — under review"
                description="Your portfolio and sessions are under review. IncluHub Admin will notify you if and when you are selected into the ecosystem. No action is required from you right now."
              />
            )
          ) : null}
        </>
      ) : null}
    </div>
  );
}
