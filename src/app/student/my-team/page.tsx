import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionHeader } from "@/components/layout/SectionHeader";
import {
  EmptyState,
  QueryErrorState,
  StatusPanel,
} from "@/components/status";
import { StatusBadge } from "@/components/status/StatusBadge";
import {
  EDUCATOR_TYPE_LABELS,
  STUDENT_CATEGORY_LABELS,
} from "@/lib/constants/labels";
import { getStudentMyTeamPageData } from "@/lib/data/student/myTeam";
import { formatCurrentStageLabel } from "@/lib/data/student/myStage";
import { WhatHappensNow } from "@/components/student/WhatHappensNow";

export default async function StudentMyTeamPage() {
  const { data, error } = await getStudentMyTeamPageData();

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Team"
        description="Your assigned team, member disciplines, and educators."
      />

      {error ? <QueryErrorState message={error} /> : null}

      {!error && !data ? (
        <EmptyState
          title="No team assigned"
          description="You are not currently assigned to a team."
        />
      ) : null}

      {data ? (
        <>
          <WhatHappensNow title="Know who leads and who assists" description="Every team member leads one category portfolio and assists on the other two. Use the educator mapping below when your category work reaches review." actionLabel="View programme stage" actionHref="/student/my-stage" />
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
                Team status
              </p>
              <div className="mt-1">
                <StatusBadge status={data.teamStatus} />
              </div>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                Current stage
              </p>
              <p className="mt-1 text-sm text-text-primary">
                {formatCurrentStageLabel(data.currentStageNumber)}
              </p>
              <div className="mt-1">
                <StatusBadge status={data.stageStatus} />
              </div>
            </div>
          </section>

          {data.isIncompleteTeam ? (
            <StatusPanel
              variant="warning"
              title="Team incomplete"
              description="All three member roles must be assigned before the stage journey can proceed."
            />
          ) : null}

          <section>
            <SectionHeader
              title="Team members"
              description="Read-only view of active members and assigned educators."
              count={data.members.length}
            />

            {data.members.length === 0 ? (
              <EmptyState
                title="No active members"
                description="This team does not have any active members yet."
              />
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {data.members.map((member) => (
                  <li
                    key={member.studentId}
                    className="rounded-[var(--radius-card)] border border-border-default bg-surface-card p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-text-primary">
                        {member.fullName}
                      </p>
                      {member.isCurrentStudent ? (
                        <Badge variant="secondary">You</Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-text-muted">
                      {STUDENT_CATEGORY_LABELS[member.category]}
                    </p>
                    {member.educator ? (
                      <p className="mt-3 text-sm text-text-primary">
                        Educator: {member.educator.fullName} ·{" "}
                        {EDUCATOR_TYPE_LABELS[member.educator.educatorType]}
                      </p>
                    ) : (
                      <p className="mt-3 text-sm text-text-muted">
                        No educator assigned yet.
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
